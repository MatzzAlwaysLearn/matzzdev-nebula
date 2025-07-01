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

    on(event, handler) {
        if (typeof event === 'object' && event !== null) {
            Object.entries(event).forEach(([ev, fn]) => this.on(ev, fn));
            return;
        }
        if (event === 'connection.update') {
            throw new Error("Event 'connection.update' is handled by system and cannot be overridden.");
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

    async init() {
        const printQR = !this.number;
        const { state, saveCreds } = await useMultiFileAuthState(this.authName);
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
            if (update.connection === 'open') {
                this.logger.info('WhatsApp connection established!');
            } else if (update.connection === 'close') {
                this.logger.warn('WhatsApp connection closed.');
                const reason = update.lastDisconnect?.error?.output?.statusCode || update.lastDisconnect?.error?.message;
                if (reason) {
                    this.logger.warn(`Disconnect reason: ${reason}, restarting...`);
                    setTimeout(() => this.init(), 2000);
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

/* 
Usage example:
const nebula = new Nebula();
nebula.on('messages.upsert', msg => console.log(msg));
await nebula.ready();
*/