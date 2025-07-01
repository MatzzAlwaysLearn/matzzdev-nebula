# 🚀 Nebula WhatsApp Bot Module

**Versi:** 1.0.2  
Nebula adalah modul WhatsApp multi-device berbasis [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) yang dirancang agar mudah digunakan baik untuk pemula maupun developer lanjutan.

---

## 🔥 Fitur Utama

- **Multi-auth**: Multi session, nama folder auth fleksibel.
- **Event Listener Simpel**: Daftarkan event WhatsApp dengan `.on()`.
- **Custom Connection Log**: Kustomisasi log koneksi WhatsApp.
- **Mode Command**: Pilih mode `case` (file case.js).
- **Akses State & saveCreds**: Mudah dari instance Nebula.
- **Restart Otomatis**: Disconnect/error? Bot auto-reconnect!
- **Logger Lengkap**: Semua status koneksi dicatat detail.
- **Tanpa Class Ribet**: API berbasis function & object.

---

## ⚡️ Instalasi

```bash
npm install matzzdev-nebula
```

---

## 🚦 Getting Started

### 1. Import Nebula

#### ESM (direkomendasikan)
```js
import createNebula from 'matzzdev-nebula';
```

#### CJS (require)
```js
const createNebula = require('matzzdev-nebula');
```

---

### 2. Membuat Instance & Start

```js
const nebula = await createNebula('MySession', 'case');
// Bot langsung aktif setelah await!
```
- **Argumen 1:** Nama folder auth (bebas, contoh: `'MySession'`)
- **Argumen 2:** Mode command (default: `'case'`)

---

### 3. Listen Event WhatsApp

```js
nebula.on('messages.upsert', msg => {
    console.log('Pesan baru:', msg);
});

// Atau banyak event sekaligus:
nebula.on({
    'messages.upsert': msg => { /* ... */ },
    'creds.update': creds => { /* ... */ }
});
```

---

### 4. Kustomisasi Log Koneksi

```js
nebula.setConnectionLogHandler((update, log) => {
    if (update.connection === 'open') {
        log('Custom: Terhubung!', 'info');
    }
});
```

---

### 5. Mode Command 'case'

- Buat file `case.js` di folder project Anda.
- Export function yang menerima instance Nebula.
- Contoh `case.js`:
    ```js
    export default function(nebula) {
        nebula.on('messages.upsert', msg => {
            // Logika bot kamu di sini
        });
    }
    ```

---

## 🛠️ Konfigurasi Otomatis

- Saat pertama kali dijalankan, file `config.js` otomatis dibuat di folder project Anda.
- Edit file tersebut untuk mengatur owner, prefix, dsb.
- Contoh isi awal:
    ```js
    export default {
      owner: ['628xxxxxxx'],
      prefix: {
        listPrefix: ['#', '!', '/', '.'],
        noPrefix: false
      }
    };
    ```

---

## 🧑‍💻 Command Detect

### Deteksi Command Otomatis

```js
nebula.on('messages.upsert', async (msg) => {
    const m = msg.messages?.[0];
    if (!m?.message?.conversation) return;
    const text = m.message.conversation;

    nebula.detectCommand(text);

    if (nebula.commandDetect) {
        console.log('Command terdeteksi:', nebula.commandDetect);
        if (nebula.commandDetect === 'hai') {
            nebula.socket.sendMessage(m.key.remoteJid, { text: 'Halo juga!' }, { quoted: m });
        }
    }
});
```
- **Prefix default:** `#`, `!`, `/`, `.`
- **Tambah prefix:** `nebula.listPrefix.push('$')`

---

## 📦 Serialize: Cara Mudah Handle Pesan

### Kenapa Serialize?
Agar pesan WhatsApp jadi lebih mudah diolah di handler/command.

### Cara Pakai

```js
// ESM
import createNebula from 'matzzdev-nebula';
const nebula = await createNebula();
const sMsg = new nebula.smsg(msg, nebula.socket, nebula.config);

// CJS
const createNebula = require('matzzdev-nebula');
(async () => {
    const nebula = await createNebula();
    const sMsg = new nebula.smsg(msg, nebula.socket, nebula.config);
})();
```

### Contoh di Handler

```js
nebula.on('messages.upsert', async (msg) => {
    const m = msg.messages[0];
    const sMsg = new nebula.smsg(m, nebula.socket, nebula.config);

    if (sMsg.isCmd) {
        if (sMsg.command === 'ping') {
            await sMsg.reply('Pong!');
        }
        // Tambahkan command lain sesuai kebutuhan
    }
});
```

---

## ❓ FAQ Interaktif

- **Q:** Apakah bisa custom nama auth dan mode command di CJS?
  - **A:** Ya! Cukup isi argumen saat `createNebula('NamaFolderAuth', 'case')`.

- **Q:** Apakah config.js harus di-edit?
  - **A:** Wajib! Isi owner dan prefix sesuai kebutuhan Anda.

- **Q:** Bisa import tanpa `/index.js` atau `/index.cjs`?
  - **A:** Bisa! Cukup `import createNebula from 'matzzdev-nebula'` atau `require('matzzdev-nebula')`.

- **Q:** Bagaimana handle pesan masuk?
  - **A:** Gunakan `nebula.on('messages.upsert', handler)`.

---

## 📝 Penjelasan Singkat

- **Nebula** = wrapper Baileys siap pakai, tanpa class ribet.
- **Event `connection.update`** otomatis di-handle, gunakan `setConnectionLogHandler` untuk log custom.
- **Mode `case`**: cukup buat file `case.js` dan daftarkan fitur bot di sana.
- **Logger**: Semua log penting langsung ke console.

---

## ⚖️ Lisensi

MIT License — by MatzzDev

---

**Butuh bantuan?**  
Buka [issues](https://github.com/MatzzAlwaysLearn/matzzdev-nebula/issues) atau join komunitas!