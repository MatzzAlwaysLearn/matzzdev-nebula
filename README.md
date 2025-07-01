# Nebula WhatsApp Bot Module

Nebula adalah modul WhatsApp multi-device berbasis [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) yang sangat fleksibel dan mudah digunakan, baik untuk pemula maupun developer lanjutan.

---

## Fitur Utama

- **Multi-auth**: Bisa multi session dengan nama folder auth yang fleksibel.
- **Event Listener Mudah**: Daftarkan event WhatsApp dengan `.on()` (kecuali `connection.update`).
- **Custom Connection Log**: Kustomisasi log koneksi WhatsApp dengan `setConnectionLogHandler`.
- **Mode Command**: Pilih mode `case` (file case.js) atau `plugin` (bisa dikembangkan).
- **Akses State & saveCreds**: Langsung dari instance Nebula, tanpa perlu import Baileys.
- **Restart Otomatis**: Jika disconnect karena error, otomatis reconnect.
- **Log Koneksi Super Lengkap**: Semua status koneksi dicatat detail.

---

## Cara Penggunaan

### 1. Import Nebula
```js
import Nebula from './index.js';
```

### 2. Membuat Instance
```js
const nebula = new Nebula(
    'info',           // level logger atau config pino atau instance pino (default: 'silent')
    'MySession',      // nama folder auth (default: 'Nebula')
    '6281234567890',  // nomor untuk pairing (default: '6289546828812')
    'case'            // mode command: 'case' atau 'plugin' (default: 'case')
);
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

### 4. Tunggu Socket Siap (opsional, jika ingin akses socket langsung)
```js
await nebula.ready();
// Sekarang bisa akses nebula.socket langsung
```

### 5. Kustomisasi Log Koneksi
```js
nebula.setConnectionLogHandler((update, log) => {
    // update: objek update dari Baileys
    // log: function(msg, level) untuk log custom
    if (update.connection === 'open') {
        log('Custom: Terhubung!', 'info');
    }
    // Tambahkan logika custom lain jika perlu
});
```

### 6. Mode Command 'case'
- Buat file `case.js` di folder yang sama dengan `index.js`.
- Export function yang menerima instance Nebula.
- Contoh `case.js`:
    ```js
    module.exports = (nebula) => {
        nebula.on('messages.upsert', msg => {
            // Logika bot kamu di sini
        });
    };
    ```

### 7. Mode Command 'plugin'
> **Belum tersedia.**  
> Mode plugin masih dalam tahap pengembangan. Saat ini hanya mode `case` yang tersedia.

### 8. Tidak Bisa Override Event 'connection.update' dengan `.on()`
- Gunakan `setConnectionLogHandler()` untuk kustomisasi log koneksi.

### 9. Menghapus Event Listener
```js
nebula.off('messages.upsert', handlerFunction);
```

### 10. Akses State & saveCreds
Langsung dari instance:
```js
nebula.state      // auth state dari Baileys
nebula.saveCreds  // fungsi untuk menyimpan kredensial
```
Berguna jika ingin handle event `creds.update` sendiri:
```js
nebula.on('creds.update', nebula.saveCreds);
```

---

## Contoh Penggunaan Mode Case dengan Command Detect

#### index.js
```js
import Nebula from './index.js';

const nebula = new Nebula();

nebula.on('messages.upsert', async (msg) => {
    // Ambil pesan teks (contoh untuk satu pesan)
    const m = msg.messages?.[0];
    if (!m?.message?.conversation) return;
    const text = m.message.conversation;

    // Deteksi command dengan prefix
    nebula.detectCommand(text);

    // Dynamic import case.js (ESM)
    const { default: NebulaCase } = await import('./case.js');
    NebulaCase(nebula, m);
});
```

#### case.js (ESM)
```js
export default function NebulaCase(nebula, m) {
    // Contoh: menambah prefix custom
    nebula.listPrefix.push('$');

    // Gunakan switch pada nebula.commandDetect
    switch (nebula.commandDetect) {
        case "hai": {
            // Balas pesan, akses nebula.socket jika perlu
            nebula.socket.sendMessage(m.key.remoteJid, { text: "Halo juga!" }, { quoted: m });
            break;
        }
        // Tambahkan case lain sesuai kebutuhan
    }
}
```

#### Penjelasan
- `nebula.listPrefix` adalah array prefix yang bisa kamu tambah/ubah.
- `nebula.detectCommand(text)` akan mengisi `nebula.commandDetect` jika ada prefix yang cocok.
- Di `case.js`, kamu bisa switch berdasarkan `nebula.commandDetect`.
- `case.js` bisa ESM (export default function).

---

## Penjelasan Singkat

- **Nebula** adalah pembungkus Baileys yang siap pakai, tidak perlu repot setup event handler koneksi.
- **Event `connection.update`** sudah otomatis di-handle dan tidak bisa di-override, tapi log-nya bisa dikustomisasi.
- **Mode `case`** cocok untuk pemula, cukup buat file `case.js` dan daftarkan fitur bot di sana.
- **Mode `plugin`** *belum tersedia* dan akan dikembangkan untuk sistem plugin modular.
- **Logger** bisa diatur levelnya, atau pakai config/instance pino sendiri.

---

**Saran:**  
Untuk pemula, cukup fokus pada `.on()` dan file `case.js`. Untuk advanced, manfaatkan akses langsung ke socket, state, dan saveCreds.

---

Lisensi: MIT
