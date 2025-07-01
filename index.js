import makeWASocket, { useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import P from 'pino';
import Serialize from './lib/serialize.js';

const question = (query) => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        });
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
};

// Buat config.js di folder project pengguna (bukan di folder module)
const userCwd = process.cwd();
const configPath = path.join(userCwd, 'config.js');

// Cegah error import config.js jika belum ada, buat otomatis lalu exit agar user edit dulu
if (!fs.existsSync(configPath)) {
    const defaultConfig = `
export default {
  owner: ['628xxxxxxx'], // Ganti dengan nomor WhatsApp owner WAJIB
  prefix: {
    listPrefix: ['#', '!', '/', '.'], // Daftar prefix yang digunakan
    // noPrefix: true // Jika ingin mengaktifkan mode tanpa prefix, ubah ke true
    // Jika ingin menggunakan prefix, biarkan noPrefix tetap false
    // tambahkan prefix sesuai kebutuhan
    noPrefix: false
  }
  // Tambahkan konfigurasi lain di sini
};
`.trimStart();
    fs.writeFileSync(configPath, defaultConfig, 'utf8');
    console.log('\x1b[33m[CONFIG]\x1b[0m File config.js berhasil dibuat di folder project Anda.');
    console.log('\x1b[36m[CONFIG]\x1b[0m Silakan edit config.js terlebih dahulu sebelum menjalankan ulang bot!');
    process.exit(0);
}

// Import config dari config.js di folder project pengguna
import config from path.isAbsolute(configPath) ? `file://${configPath}` : `./config.js`;

async function createNebula(authName = 'Nebula', commandMode = 'case') {
    const { state, saveCreds } = await useMultiFileAuthState(authName);
    const socketConfig = {
        auth: state,
        browser: ['Ubuntu', 'Chrome', '22.04'],
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        syncFullHistory: true,
        generateHighQualityLinkPreview: true,
    };
    const socket = await makeWASocket.default(socketConfig);
    if (
        !(socket.authState?.creds?.me) &&
        !(socket.authState?.creds?.registered)
    ) {
        try {
            const number = await question('Masukkan nomor WhatsApp untuk pairing (misal: 62895406828812): ');
            const code = await socket.requestPairingCode(number);
            console.log(`[CONNECTION] Pairing code: ${code}`);
        } catch (e) {
            console.warn(`[CONNECTION] Failed to get pairing code: ${e}`);
        }
    }

    // --- Struktur & API ---
    let _pendingEvents = [];
    let _connectionLogHandler = null;
    let commandDetect = null;
    let listPrefix = ['#', '!', '/', '.'];
    let nebula = null;

    function _loadCommandMode(nebulaInstance) {
        if (commandMode === 'case') {
            try {
                const casePath = path.join(process.cwd(), 'case.js');
                if (fs.existsSync(casePath)) {
                    // Gunakan dynamic import agar support ESM, bukan require
                    import(casePath).then((caseModule) => {
                        if (typeof caseModule.default === 'function') {
                            caseModule.default(nebulaInstance);
                        } else if (typeof caseModule === 'function') {
                            caseModule(nebulaInstance);
                        }
                    }).catch((e) => {
                        console.warn('case.js not found or error: ' + e.message);
                    });
                }
            } catch (e) {
                console.warn('case.js not found or error: ' + e.message);
            }
        }
    }

    function setConnectionLogHandler(handler) {
        _connectionLogHandler = handler;
    }

    function on(event, handler) {
        if (typeof event === 'object' && event !== null) {
            Object.entries(event).forEach(([ev, fn]) => on(ev, fn));
            return;
        }
        if (event === 'connection.update') {
            throw new Error("Event 'connection.update' is handled by system and cannot be overridden. Use setConnectionLogHandler(fn) to customize log output.");
        }
        if (socket) {
            socket.ev.on(event, handler);
        } else {
            _pendingEvents.push([event, handler]);
        }
    }

    function off(event, handler) {
        if (socket) {
            socket.ev.off(event, handler);
        }
    }

    function detectCommand(text) {
        if (!text || typeof text !== 'string') return null;
        for (const prefix of listPrefix) {
            const regex = new RegExp(`^\\${prefix}(\\w+)`, 'i');
            const match = text.match(regex);
            if (match) {
                commandDetect = match[1].toLowerCase();
                return commandDetect;
            }
        }
        commandDetect = null;
        return null;
    }

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
        const log = (msg, level = 'info') => {
            if (level === 'warn') console.warn(msg);
            else if (level === 'error') console.error(msg);
            else console.log(msg);
        };

        log(`[CONNECTION] Status: ${update.connection || 'unknown'}`, 'info');
        if (update.qr && !number) log('[CONNECTION] QR code received', 'info');
        if (update.isNewLogin) log('[CONNECTION] New login detected', 'info');
        if (update.lastDisconnect) {
            log(`[CONNECTION] Last disconnect: ${JSON.stringify(update.lastDisconnect, null, 2)}`, 'warn');
            const reason = update.lastDisconnect?.error?.output?.statusCode || update.lastDisconnect?.error?.message;
            if (reason) {
                log(`[CONNECTION] Disconnect reason: ${reason}, restarting...`, 'warn');
                setTimeout(() => createNebula(authName, commandMode), 2000);
            }
        }
        if (update.connection === 'open') {
            log('[CONNECTION] WhatsApp connection established!', 'info');
        } else if (update.connection === 'close') {
            log('[CONNECTION] WhatsApp connection closed.', 'warn');
        }

        if (typeof _connectionLogHandler === 'function') {
            try {
                _connectionLogHandler(update, log);
            } catch (e) {
                log(`[CONNECTION] Custom log handler error: ${e.message}`, 'error');
            }
        }
    });

    if (_pendingEvents.length) {
        _pendingEvents.forEach(([event, handler]) => {
            socket.ev.on(event, handler);
        });
        _pendingEvents = [];
    }

    nebula = {
        setConnectionLogHandler,
        on,
        off,
        detectCommand,
        get socket() { return socket; },
        get state() { return state; },
        get saveCreds() { return saveCreds; },
        get number() { return number; },
        get commandMode() { return commandMode; },
        get commandDetect() { return commandDetect; },
        get listPrefix() { return config.prefix.listPrefix; },
        get config() { return config; },
        get smsg() { return Serialize; }
    };

    _loadCommandMode(nebula);

    return nebula;
}

export default createNebula;