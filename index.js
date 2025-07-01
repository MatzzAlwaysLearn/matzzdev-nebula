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

    /**
     * Deteksi dan load mode command (case/plugin).
     * Untuk mode 'case', otomatis require file 'case.js' jika ada.
     * Untuk mode 'plugin', bisa dikembangkan sesuai kebutuhan.
     */
    _loadCommandMode() {
        if (this.commandMode === 'case') {
            try {
                const casePath = require('path').join(__dirname, 'case.js');
                if (require('fs').existsSync(casePath)) {
                    require(casePath)(this);
                }
            } catch (e) {
                this.logger.warn('File case.js tidak ditemukan atau error:', e.message);
            }
        } else if (this.commandMode === 'plugin') {
            // Mode plugin: bisa dikembangkan untuk load plugin dari folder tertentu
            // Contoh: this._loadPlugins();
        }
    }

    /**
     * Daftarkan event listener dengan cara super gampang.
     * Bisa: nebula.on('event', handler)
     * Bisa: nebula.on({ event1: handler1, event2: handler2 })
     * Bisa: await nebula.ready(); lalu akses nebula.socket
     */
    on(event, handler) {
        if (typeof event === 'object' && event !== null) {
            Object.entries(event).forEach(([ev, fn]) => this.on(ev, fn));
            return;
        }
        // Jika socket sudah siap, langsung daftarkan
        if (this.socket) {
            this.socket.ev.on(event, handler);
        } else {
            // Daftarkan ke pending agar otomatis aktif saat socket siap
            if (!this._pendingEvents) this._pendingEvents = [];
            this._pendingEvents.push([event, handler]);
        }
    }

    /**
     * Hapus event listener.
     */
    off(event, handler) {
        if (this.socket) {
            this.socket.ev.off(event, handler);
        }
    }

    /**
     * Promise yang resolve saat socket siap.
     * Contoh: await nebula.ready();
     */
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
        this.socket = makeWASocket(socketConfig);

        // Daftarkan event yang sempat pending sebelum socket siap
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

// Contoh penggunaan super gampang:
// const nebula = new Nebula();
// nebula.on('messages.upsert', msg => console.log(msg));
// nebula.on({ 'connection.update': update => console.log(update) });
// await nebula.ready(); // jika ingin akses nebula.socket langsung setelah siap