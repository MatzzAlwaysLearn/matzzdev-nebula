import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
} from '@whiskeysockets/baileys';
import P from 'pino';

class Nebula {
    constructor(
        logger = 'silent',
        authName = 'Nebula',
        number = '6289546828812',
        commandMode = 'case' 
    ) {
        if (typeof logger === 'string') {
            this.logger = P({ level: logger });
        } else if (typeof logger === 'object' && typeof logger.level === 'string') {
            this.logger = P(logger);
        } else {
            this.logger = logger;
        }
        this.authName = authName;
        this.number = number;
        this.commandMode = commandMode;
        this.eventHandlers = {};
        this._pendingEvents = [];
        this._ready = new Promise(resolve => { this._resolveReady = resolve; });
        this._connectionLogHandler = null;
        this.state = null;
        this.saveCreds = null;
        this.listPrefix = ['#', '!', '/', '.'];
        this.commandDetect = null;
        this._loadCommandMode();
        this.init();
    }

    _loadCommandMode() {
        if (this.commandMode === 'case') {
            try {
                const casePath = require('path').join(__dirname, 'case.js');
                if (require('fs').existsSync(casePath)) {
                    require(casePath)(this);
                }
            } catch (e) {
                this.logger.warn('case.js not found or error: ' + e.message);
            }
        } else if (this.commandMode === 'plugin') {
            // Plugin mode: extend here if needed
        }
   }

    /**
     * Set custom connection log handler.
     * @param {function} handler - Receives (update, defaultLogger)
     */
    setConnectionLogHandler(handler) {
        this._connectionLogHandler = handler;
    }

    on(event, handler) {
        if (typeof event === 'object' && event !== null) {
            Object.entries(event).forEach(([ev, fn]) => this.on(ev, fn));
            return;
        }
        if (event === 'connection.update') {
            throw new Error("Event 'connection.update' is handled by system and cannot be overridden. Use setConnectionLogHandler(fn) to customize log output.");
        }
        if (this.socket) {
            this.socket.ev.on(event, handler);
        } else {
            if (!this._pendingEvents) this._pendingEvents = [];
            this._pendingEvents.push([event, handler]);
        }
    }

    off(event, handler) {
        if (this.socket) {
            this.socket.ev.off(event, handler);
        }
    }

    ready() {
        return this._ready;
    }

    /**
     * Utility to detect command from a message using listPrefix and regex.
     * Call this in your message handler to set nebula.commandDetect.
     * @param {string} text
     * @returns {string|null} command name or null
     */
    detectCommand(text) {
        if (!text || typeof text !== 'string') return null;
        for (const prefix of this.listPrefix) {
            const regex = new RegExp(`^\\${prefix}(\\w+)`, 'i');
            const match = text.match(regex);
            if (match) {
                this.commandDetect = match[1].toLowerCase();
                return this.commandDetect;
            }
        }
        this.commandDetect = null;
        return null;
    }

    async init() {
        const printQR = !this.number;
        const { state, saveCreds } = await useMultiFileAuthState(this.authName);
        this.state = state;
        this.saveCreds = saveCreds;
        const socketConfig = {
            auth: state,
            printQRInTerminal: printQR,
            browser: Browsers.ubuntu('Chrome'),
            logger: this.logger,
        };
        if (this.number && !printQR) {
            socketConfig.number = this.number;
        }
        this.socket = makeWASocket.default(socketConfig);

        this.socket.ev.on('connection.update', (update) => {
            const log = this.logger;
            const defaultLogger = (msg, level = 'info') => {
                if (typeof log[level] === 'function') log[level](msg);
                else log.info(msg);
            };

            defaultLogger(`[CONNECTION] Status: ${update.connection || 'unknown'}`, 'info');
            // Only log QR if phone number is not provided or falsy
            if (update.qr && !this.number) defaultLogger('[CONNECTION] QR code received', 'info');
            if (update.pairingCode) defaultLogger(`[CONNECTION] Pairing code: ${update.pairingCode}`, 'info');
            if (update.isNewLogin) defaultLogger('[CONNECTION] New login detected', 'info');
            if (update.lastDisconnect) {
                defaultLogger(`[CONNECTION] Last disconnect: ${JSON.stringify(update.lastDisconnect, null, 2)}`, 'warn');
                const reason = update.lastDisconnect?.error?.output?.statusCode || update.lastDisconnect?.error?.message;
                if (reason) {
                    defaultLogger(`[CONNECTION] Disconnect reason: ${reason}, restarting...`, 'warn');
                    setTimeout(() => this.init(), 2000);
                }
            }
            if (update.connection === 'open') {
                defaultLogger('[CONNECTION] WhatsApp connection established!', 'info');
            } else if (update.connection === 'close') {
                defaultLogger('[CONNECTION] WhatsApp connection closed.', 'warn');
            }

            // Allow user to customize connection log
            if (typeof this._connectionLogHandler === 'function') {
                try {
                    this._connectionLogHandler(update, defaultLogger);
                } catch (e) {
                    defaultLogger(`[CONNECTION] Custom log handler error: ${e.message}`, 'error');
                }
            }
        });

        if (this._pendingEvents && this._pendingEvents.length) {
            this._pendingEvents.forEach(([event, handler]) => {
                this.socket.ev.on(event, handler);
            });
            this._pendingEvents = [];
        }

        if (this.number && !(this.socket.authState?.creds?.me)) {
            const code = await this.socket.requestPairingCode(this.number);
            this.logger.info(`Pairing code: ${code}`);
        }

        this.socket.ev.on('creds.update', saveCreds);

        if (this._resolveReady) this._resolveReady();
    }
}

export default Nebula;