# 🚀 Nebula WhatsApp Bot Module

**Versi:** 1.0.2  
Nebula adalah modul WhatsApp multi-device berbasis [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) yang mudah digunakan untuk pemula maupun developer lanjutan.

---

## 🔥 Fitur Utama

- Multi-auth: Multi session, nama folder auth fleksibel.
- Event Listener Simpel: Daftarkan event WhatsApp dengan `.on()`.
- Custom Connection Log: Kustomisasi log koneksi WhatsApp.
- Mode Command: Pilih mode `case` (default) atau `plugin` (manual).
- Akses State & saveCreds: Mudah dari instance Nebula.
- Restart Otomatis: Disconnect/error? Bot auto-reconnect!
- Logger Lengkap: Semua status koneksi dicatat detail.
- Tanpa Class Ribet: API berbasis function & object.

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
import createNebula from 'matzzdev-nebula'
```

#### CJS (require)
```js
const createNebula = require('matzzdev-nebula')
```

---

### 2. Membuat Instance & Start

```js
// ESM
import createNebula from 'matzzdev-nebula'
const nebula = await createNebula('MySession')

// CJS
const createNebula = require('matzzdev-nebula')
;(async () => {
    const nebula = await createNebula('MySession')
})()
```
- Argumen 1: Nama folder auth (bebas, contoh: `'MySession'`)
- Argumen 2: Mode command (`'case'` (default) atau `'plugin'`)
- Argumen 3 (opsional): `options` (lihat bagian log pairing code)

---

### 3. Listen Event WhatsApp

```js
nebula.on('messages.upsert', msg => {
    console.log('Pesan baru:', msg)
})

// Atau banyak event sekaligus:
nebula.on({
    'messages.upsert': msg => { /* ... */ },
    'creds.update': creds => { /* ... */ }
})
```

---

### 4. Kustomisasi Log Koneksi

```js
nebula.setConnectionLogHandler((update, log) => {
    if (update.connection === 'open') {
        log('Custom: Terhubung!', 'info')
    }
})
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
    }
    ```

---

## 🧑‍💻 Deteksi Command

### Deteksi Command Otomatis

```js
nebula.on('messages.upsert', async (msg) => {
    const m = msg.messages?.[0]
    if (!m?.message?.conversation) return
    const text = m.message.conversation

    nebula.detectCommand(text)

    if (nebula.commandDetect) {
        console.log('Command terdeteksi:', nebula.commandDetect)
        if (nebula.commandDetect === 'hai') {
            nebula.socket.sendMessage(m.key.remoteJid, { text: 'Halo juga!' }, { quoted: m })
        }
    }
})
```
- Prefix default: `#`, `!`, `/`, `.`
- Tambah prefix: `nebula.listPrefix.push('$')`

---

## 📦 Serialize: Cara Mudah Handle Pesan

### Kenapa Serialize?
Agar pesan WhatsApp jadi lebih mudah diolah di handler/command.

### Cara Pakai

```js
// ESM
import createNebula from 'matzzdev-nebula'
const nebula = await createNebula()
const sMsg = new nebula.smsg(msg, nebula.socket, nebula.config)

// CJS
const createNebula = require('matzzdev-nebula')
;(async () => {
    const nebula = await createNebula()
    const sMsg = new nebula.smsg(msg, nebula.socket, nebula.config)
})()
```

### Contoh di Handler

```js
nebula.on('messages.upsert', async (msg) => {
    const m = msg.messages[0]
    const sMsg = new nebula.smsg(m, nebula.socket, nebula.config)

    if (sMsg.isCmd) {
        if (sMsg.command === 'ping') {
            await sMsg.reply('Pong!')
        }
        // Tambahkan command lain sesuai kebutuhan
    }
})
```

---

## 📝 Custom Log Pairing Code (Opsional)

Anda bisa mengkustomisasi log saat pairing code WhatsApp muncul.  
Jika tidak diisi, akan otomatis menggunakan log default.

```js
// ESM
import createNebula from 'matzzdev-nebula'
const nebula = await createNebula('MySession', 'case', {
    logPairingCode: (code, number) => {
        console.log('Kode pairing untuk', number, 'adalah:', code)
    }
})

// CJS
const createNebula = require('matzzdev-nebula')
;(async () => {
    const nebula = await createNebula('MySession', 'case', {
        logPairingCode: (code, number) => {
            console.log('Kode pairing:', code, 'untuk nomor:', number)
        }
    })
})()
```
- Jika tidak ingin custom, cukup panggil tanpa argumen ketiga.

---

# Sistem Plugin Nebula

## Konsep Dasar

Sistem plugin Nebula memungkinkan Anda menambah, mengelola, dan menjalankan fitur bot secara modular hanya dengan menambah file JavaScript di folder `plugin/`. Setiap plugin harus mengikuti struktur tertentu agar bisa dikenali dan dijalankan oleh sistem.

---

## Struktur Plugin

Setiap file di dalam folder `plugin/` harus mengekspor sebuah objek dengan struktur minimal seperti berikut:

```js
module.exports = {
  type: 'command', // atau 'hook', 'event'
  name: 'nama_command',
  description: 'Deskripsi singkat command',
  execute(ctx, ...args) {
    // kode eksekusi command
    return 'Hasil eksekusi'
  }
}
```

**Properti yang wajib:**
- `type`: Jenis plugin (`command`, `hook`, atau `event`)
- `name`: Nama unik plugin/command
- `execute`: Fungsi yang akan dijalankan saat plugin dipanggil

**Properti opsional:**
- `description`, `usage`, `dependsOn`, `init`, `destroy`, dll.

---

## Cara Menambah Command

1. Buat folder `plugin/` di root project jika belum ada.
2. Tambahkan file baru untuk command, misal `hello.js`:

    ```js
    // ESM
    export default {
      type: 'command',
      name: 'hello',
      description: 'Say hello',
      execute(ctx) {
        return `Hello, ${ctx.user || 'World'}!`
      }
    }

    // CJS
    module.exports = {
      type: 'command',
      name: 'hello',
      description: 'Say hello',
      execute(ctx) {
        return `Hello, ${ctx.user || 'World'}!`
      }
    }
    ```

3. Restart bot. Command akan otomatis terdeteksi.

---

## Cara Menambah Hook

Mulai versi terbaru, **plugin hook tidak membutuhkan properti `name`**.  
Semua plugin dengan `type: 'hook'` akan dieksekusi terus-menerus setiap ada pesan masuk (misal pada event `messages.upsert`).

### Contoh Plugin Hook

```js
// ESM
export default {
  type: 'hook',
  execute(ctx, next) {
    console.log('Log:', ctx)
    // Bisa lanjut ke next middleware jika ingin (optional)
    if (typeof next === 'function') next()
  }
}

// CJS
module.exports = {
  type: 'hook',
  execute(ctx, next) {
    console.log('Log:', ctx)
    if (typeof next === 'function') next()
  }
}
```

### Cara Memanggil Hook di Handler Anda

Pada handler event WhatsApp (misal `messages.upsert`), panggil `nebula.executeHooks()` agar semua hook dijalankan:

```js
nebula.on('messages.upsert', async (msg) => {
    await nebula.executeHooks(msg)
    // Lanjutkan logika handler Anda di sini
})
```

- **Catatan:** Anda tidak perlu mengisi `name` pada plugin hook.
- Semua plugin hook akan dieksekusi setiap kali Anda memanggil `nebula.executeHooks()`.

---

## Cara Menambah Event

```js
// ESM
export default {
  type: 'event',
  name: 'onStart',
  execute() {
    console.log('Bot started!')
  }
}

// CJS
module.exports = {
  type: 'event',
  name: 'onStart',
  execute() {
    console.log('Bot started!')
  }
}
```

---

## Dependency Antar Plugin

Jika plugin Anda membutuhkan plugin lain, gunakan properti `dependsOn`:

```js
module.exports = {
  type: 'command',
  name: 'foo',
  dependsOn: ['bar'],
  execute(ctx) {
    // kode
  }
}
```

---

## Lifecycle (Opsional)

Plugin dapat memiliki fungsi `init` dan `destroy` yang akan dipanggil saat plugin di-load atau dihapus:

```js
module.exports = {
  type: 'command',
  name: 'foo',
  init() {
    // kode inisialisasi
  },
  destroy() {
    // kode cleanup
  },
  execute(ctx) {
    // kode utama
  }
}
```

---

## Mode Plugin Manual (Advanced)

Jika Anda ingin mendaftarkan command secara manual (tanpa file di folder plugin), gunakan mode `plugin`:

```js
// ESM
import createNebula from 'matzzdev-nebula'
const nebula = await createNebula('SessionName', 'plugin')
nebula.__registerCommand({
  type: 'command',
  name: 'foo',
  execute(ctx) {
    return 'Ini command foo!'
  }
})

// CJS
const createNebula = require('matzzdev-nebula')
;(async () => {
  const nebula = await createNebula('SessionName', 'plugin')
  nebula.__registerCommand({
    type: 'command',
    name: 'foo',
    execute(ctx) {
      return 'Ini command foo!'
    }
  })
})()
```

---

## Menjalankan Command

Untuk menjalankan command (mode plugin/manual), gunakan:

```js
const result = await nebula.processCommand('nama_command', ctx, ...args)
```

Pada mode default (`case`), fungsi ini tidak melakukan apapun.

---

## Catatan

- Semua plugin harus memiliki struktur `{ type, name, execute }`.
- Untuk command WhatsApp, Anda sendiri yang harus mendeteksi dan memproses command dari pesan, lalu memanggil `processCommand` jika perlu.
- Sistem plugin ini sangat fleksibel dan otomatis membaca semua file di folder `plugin/` sesuai tipe-nya.

---

## Troubleshooting

- Jika plugin tidak terdeteksi, pastikan file di folder `plugin/` sudah sesuai struktur.
- Cek error di terminal untuk pesan validasi plugin.