import { getContentType } from '@whiskeysockets/baileys';
import { decodeJid, getMessageType, getMimeType, downloadMedia } from './utils.js';

export default class Serialize {
  constructor(message, conn, config) {
    this.conn = conn;
    this.config = config;
    this.key = message?.key || null;
    this.messageTimestamp = message?.messageTimestamp || null;
    this.message = message?.message || null;
    this.pushname = message?.pushName || null;

    if (this.key) {
      this.id = this.key.id || null;
      this.isBaileys = this.id?.length === 16 || this.key.id?.startsWith('3EB0') || this.key.id?.startsWith('BAE5');
      this.fromMe = !!this.key.fromMe;
      this.isGroup = this.key?.remoteJid?.endsWith('@g.us');
      this.chat = this.key?.remoteJid ? decodeJid(this.key.remoteJid) : null;
      this.from = this.chat;

      if (this.isGroup) {
        this.sender = decodeJid(this.key?.participant || "unknown@s.whatsapp.net");
        this.groupInfo = this.getGroupInfo();
      } else {
        this.sender = decodeJid((this.key?.fromMe && conn?.user?.id) || this.chat || "unknown@s.whatsapp.net");
      }

      this.isOwner = Array.isArray(this.config.owner)
        ? this.config.owner.some(owner => owner === this.sender) ||
          this.config.owner.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(this.sender)
        : false;

      if (this.message) {
        this.type = getMessageType(this.message);
        this.mentions = this.message?.[this.type]?.contextInfo?.mentionedJid || [];
        this.body = this.getMessageBody();
        // Hapus this.prefix dan getPrefix
        // this.prefix = this.getPrefix();
        this.args = this.body?.trim().split(/ +/).slice(1) || [];
        this.text = this.args.join(' ');
        // Deteksi prefix dari listPrefix di config
        const listPrefix = this.config.prefix.listPrefix || ['!', '.', '/', '#'];
        let detectedPrefix = '';
        if (!this.config.prefix.noPrefix) {
          const match = this.body?.match(new RegExp(`^([${listPrefix.map(p => '\\' + p).join('')}])`, 'i'));
          detectedPrefix = match ? match[0] : '';
        }
        this.prefix = detectedPrefix;
        this.isCmd = !!detectedPrefix && this.body?.startsWith(detectedPrefix);
        this.command = this.isCmd ? this.body.slice(detectedPrefix.length).trim().split(/ +/).shift()?.toLowerCase() : undefined;
        this.reply = (text, options = {}) => conn.sendMessage(this.chat, { text, ...options }, { quoted: message });
        this.mtype = getContentType(this.message);
        this.mimetype = getMimeType(this.message);

        this.reactions = this.getReactions();
        this.quoted = this.extractQuotedMessage();
        this.isBot = this.detectBotReply();
        this.isMedia = this.detectMediaType();
        this.isMentioned = this.mentions.includes(this.conn.user?.id);
        this.isReply = !!this.quoted;
        this.chatType = this.isGroup ? 'group' : 'private';
        this.isForwarded = this.message?.[this.type]?.contextInfo?.isForwarded || false;
        this.messageLength = this.body.length || 0;
        this.hasQuotedMedia = this.quoted && this.detectMediaType(this.quoted.message);
      }
    }
  }

  getGroupInfo() {
    return this.conn.groupMetadata(this.chat)
      .then(metadata => ({
        id: metadata.id,
        subject: metadata.subject,
        description: metadata.desc || "Tidak ada deskripsi",
        participants: metadata.participants.map(p => decodeJid(p.id)),
        admins: metadata.participants.filter(p => p.admin).map(p => decodeJid(p.id)),
        isAdmin: metadata.participants.some(p => p.id === this.sender && p.admin),
        size: metadata.participants.length
      }))
      .catch(() => null);
  }

  getReactions() {
    return this.message?.reactionMessage ? {
      emoji: this.message.reactionMessage?.text,
      sender: decodeJid(this.message.reactionMessage?.senderJid)
    } : null;
  }

  getMessageBody() {
    switch (this.type) {
      case 'conversation': return this.message.conversation || '';
      case 'imageMessage': return this.message.imageMessage?.caption || '';
      case 'videoMessage': return this.message.videoMessage?.caption || '';
      case 'extendedTextMessage': return this.message.extendedTextMessage?.text || '';
      case 'buttonsResponseMessage': return this.message.buttonsResponseMessage?.selectedButtonId || '';
      case 'listResponseMessage': return this.message.listResponseMessage?.singleSelectReply?.selectedRowId || '';
      case 'templateButtonReplyMessage': return this.message.templateButtonReplyMessage?.selectedId || '';
      case 'pollCreationMessage': return this.message.pollCreationMessage?.name || '';
      case 'interactiveResponseMessage': return JSON.parse(this.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id || '';
      case 'documentMessage': return this.message.documentMessage?.fileName || '';
      case 'stickerMessage': return '[Sticker]';
      case 'audioMessage': return '[Audio]';
      case 'locationMessage': return `[Location] Lat: ${this.message.locationMessage?.degreesLatitude}, Lon: ${this.message.locationMessage?.degreesLongitude}`;
      default: return '';
    }
  }

  extractQuotedMessage() {
    try {
      const quotedContextInfo = this.message?.[this.type]?.contextInfo;
      if (!quotedContextInfo) return null;

      const quotedMessage = quotedContextInfo?.quotedMessage;
      if (!quotedMessage) return null;

      let quoted = {
        stanzaId: quotedContextInfo.stanzaId,
        participant: decodeJid(quotedContextInfo.participant),
        message: quotedMessage,
        isGroup: this.isGroup,
        groupName: this.isGroup ? this.groupInfo?.subject : null,
      };

      quoted.fromMe = quoted.participant === decodeJid(this.conn.user.id);
      quoted.type = Object.keys(quoted.message || {}).find(v => v.includes('Message') || v.includes('conversation')) || '';
      quoted.text =
        quoted.message?.[quoted.type]?.text ||
        quoted.message?.[quoted.type]?.description ||
        quoted.message?.[quoted.type]?.caption ||
        quoted.message?.[quoted.type]?.hydratedTemplate?.hydratedContentText ||
        quoted.message?.[quoted.type]?.editedMessage?.extendedTextMessage?.text ||
        quoted.message?.[quoted.type] ||
        '';

      quoted.key = {
        id: quoted.stanzaId,
        fromMe: quoted.fromMe,
        remoteJid: this.chat,
      };

      quoted.isBot = quoted.key?.id?.startsWith('BAE5') || quoted.key?.id?.startsWith('30EB');
      quoted.delete = () => this.conn.sendMessage(this.chat, { delete: quoted.key });
      quoted.download = (pathFile) => downloadMedia(quoted.message, pathFile);
      quoted.react = (text) => this.conn.sendMessage(this.chat, { react: { text, key: quoted.key } });
      quoted.command = this.isCmd ? this.body.slice(this.prefix.length).trim().split(/ +/).shift()?.toLowerCase() : undefined;
      quoted.mimetype = getMimeType(quoted.message);

      return quoted;
    } catch (e) {
      return null;
    }
  }

  detectBotReply() {
    return this.isBaileys || (this.message?.ephemeralMessage && this.message?.ephemeralMessage?.message?.protocolMessage);
  }

  detectMediaType() {
    return ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage', 'locationMessage'].includes(this.type);
  }
}