# Nebula WhatsApp Bot Module

Versi: **1.0.2**

Nebula adalah modul WhatsApp multi-device berbasis [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) yang mudah digunakan untuk pemula maupun developer lanjutan.

---

## Instalasi

```bash
npm install matzzdev-nebula
```

---

## Fitur Utama

- **Multi-auth**: Multi session dengan nama folder auth fleksibel.
- **Event Listener Mudah**: Daftarkan event WhatsApp dengan `.on()` (kecuali `connection.update`).
- **Custom Connection Log**: Kustomisasi log koneksi WhatsApp dengan `setConnectionLogHandler`.
- **Mode Command**: Pilih mode `case` (file case.js).
- **Akses State & saveCreds**: Langsung dari instance Nebula.
- **Restart Otomatis**: Jika disconnect karena error, otomatis reconnect.
- **Log Koneksi Lengkap**: Semua status koneksi dicatat detail.
- **Tanpa Class**: API berbasis function dan object, bukan class.

---

## Cara Penggunaan

### 1. Import Nebula
```js
import createNebula from './index.js';
```

### 2. Membuat Instance & Start
```js
const nebula = await createNebula('MySession', 'case');
// Tidak perlu .init() atau .ready(), langsung aktif setelah await
```

### 3. Listen Event (kecuali 'connection.update')
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

### 4. Kustomisasi Log Koneksi
```js
nebula.setConnectionLogHandler((update, log) => {
    if (update.connection === 'open') {
        log('Custom: Terhubung!', 'info');
    }
});
```

### 5. Mode Command 'case'
- Buat file `case.js` di folder yang sama dengan `index.js`.
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

## Command Detect

### Cara Menggunakan

```js
nebula.on('messages.upsert', async (msg) => {
    const m = msg.messages?.[0];
    if (!m?.message?.conversation) return;
    const text = m.message.conversation;

    nebula.detectCommand(text);

    if (nebula.commandDetect) {
        console.log('Command terdeteksi:', nebula.commandDetect);
        // Contoh aksi:
        if (nebula.commandDetect === 'hai') {
            nebula.socket.sendMessage(m.key.remoteJid, { text: 'Halo juga!' }, { quoted: m });
        }
    }
});
```

- Prefix default: `#`, `!`, `/`, `.`
- Tambah prefix: `nebula.listPrefix.push('$')`

---

## Konfigurasi

Saat pertama kali dijalankan, file `config.js` akan otomatis dibuat. Silakan edit file tersebut untuk mengatur owner, prefix, dan konfigurasi lain.

## Cara Menggunakan Serialize

Untuk memproses pesan WhatsApp, gunakan modul `Serialize` (akses langsung dari `nebula.smsg`) agar pesan lebih mudah di-handle di command handler/case.

### Contoh Penggunaan di Handler/Case

```js
const nebula = await createNebula('MySession', 'case');
import config from './config.js'
const sock = nebula.socket
// Tidak perlu import Serialize, cukup akses dari nebula.smsg
export default function handler(nebula) {
  nebula.on('messages.upsert', async (msg) => {
    // Ambil pesan pertama (atau sesuaikan dengan kebutuhan)
    const m = msg.messages[0];
    // Buat objek serialize
    const sMsg = new nebula.smsg(m, sock, config);

    // Contoh penggunaan:
    if (sMsg.isCmd) {
      if (sMsg.command === 'ping') {
        await sMsg.reply('Pong!');
      }
      // hanya contoh gunakan logika anda sendiri
    }
  });
}
```

### Penjelasan

- `Serialize` bisa diakses langsung dari `nebula.smsg`.
- Menerima 3 parameter: pesan, socket (conn), dan config.
- Prefix dan otomatis terdeteksi dari config.

---

## Penjelasan Singkat

- **Nebula** adalah pembungkus Baileys siap pakai, tanpa class.
- **Event `connection.update`** otomatis di-handle, gunakan `setConnectionLogHandler` untuk log custom.
- **Mode `case`**: cukup buat file `case.js` dan daftarkan fitur bot di sana.
- **Logger**: Semua log penting langsung ke console.

---

Lisensi: MIT