const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const userCwd = process.cwd();
const configPath = path.join(userCwd, 'config.js');
if (!fs.existsSync(configPath)) {
    const defaultConfig = `
module.exports = {
  owner: ['628xxxxxxx'],
  prefix: {
    listPrefix: ['#', '!', '/', '.'],
    noPrefix: false
  }
};
`.trimStart();
    fs.writeFileSync(configPath, defaultConfig, 'utf8');
    console.log('[CONFIG] File config.js berhasil dibuat di folder project Anda.');
    console.log('[CONFIG] Silakan edit config.js terlebih dahulu sebelum menjalankan ulang bot!');
    process.exit(0);
}

// Load config (CJS style)
const config = require(configPath);

// Import ESM module using dynamic import
async function loadESM() {
    const esmPath = pathToFileURL(path.join(__dirname, 'index.js')).href;
    const mod = await import(esmPath);
    return mod.default;
}

// Export createNebula as CJS
module.exports = async function (...args) {
    const createNebula = await loadESM();
    return createNebula(...args);
};
