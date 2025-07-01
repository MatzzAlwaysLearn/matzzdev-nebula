import { jidDecode, downloadContentFromMessage, getContentType } from '@whiskeysockets/baileys';
import { promises as fsPromises } from 'fs';

export function decodeJid(jid) {
  try {
    const decoded = jidDecode(jid);
    return decoded?.user && decoded?.server ? `${decoded.user}@${decoded.server}` : jid;
  } catch (error) {
    return jid || 'unknown';
  }
}

export function getMessageType(message) {
  if (message.conversation) return 'conversation';
  if (message.imageMessage) return 'imageMessage';
  if (message.videoMessage) return 'videoMessage';
  if (message.extendedTextMessage) return 'extendedTextMessage';
  if (message.buttonsResponseMessage) return 'buttonsResponseMessage';
  if (message.listResponseMessage) return 'listResponseMessage';
  if (message.templateButtonReplyMessage) return 'templateButtonReplyMessage';
  if (message.pollCreationMessage) return 'pollCreationMessage';
  if (message.interactiveResponseMessage) return 'interactiveResponseMessage';
  return 'unknown';
}

export function getMimeType(message) {
  if (message?.imageMessage) return message.imageMessage.mimetype || 'image/jpeg';
  if (message?.videoMessage) return message.videoMessage.mimetype || 'video/mp4';
  if (message?.audioMessage) return message.audioMessage.mimetype || 'audio/mp3';
  if (message?.documentMessage) return message.documentMessage.mimetype || 'application/pdf';
  if (message?.stickerMessage) return 'image/webp';
  return 'unknown';
}

export async function downloadMedia(message, pathFile) {
  const type = Object.keys(message || {})[0];
  const mimeMap = {
    imageMessage: 'image',
    videoMessage: 'video',
    stickerMessage: 'sticker',
    documentMessage: 'document',
    audioMessage: 'audio',
  };

  if (!type || !mimeMap[type]) {
    return null;
  }

  try {
    const stream = await downloadContentFromMessage(message[type], mimeMap[type]);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    if (pathFile) {
      await fsPromises.writeFile(pathFile, buffer);
      return pathFile;
    } else {
      return buffer;
    }
  } catch (error) {
    throw error;
  }
}