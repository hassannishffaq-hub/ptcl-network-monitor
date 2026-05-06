const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'network.db');
const db = new sqlite3.Database(dbPath);

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create IPs table
      db.run(`
        CREATE TABLE IF NOT EXISTS ips (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `, () => {
        // Insert default settings
        const defaultSettings = [
          { key: 'ping_interval', value: '1' },
          { key: 'warning_ms', value: '100' },
          { key: 'critical_ms', value: '300' },
          { key: 'loss_warning', value: '10' },
          { key: 'loss_critical', value: '50' },
          { key: 'discord_webhook', value: '' }
        ];

        let completed = 0;
        defaultSettings.forEach(setting => {
          db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', 
            [setting.key, setting.value], () => {
              completed++;
              if (completed === defaultSettings.length) {
                // Insert default Google DNS IP if table is empty
                db.get('SELECT COUNT(*) as count FROM ips', (err, row) => {
                  if (!err && row.count === 0) {
                    db.run('INSERT INTO ips (ip, label) VALUES (?, ?)', 
                      ['8.8.8.8', 'Google DNS'], resolve);
                  } else {
                    resolve();
                  }
                });
              }
            });
        });
      });
    });
  });
}

// IP operations
function getAllIPs() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM ips ORDER BY created_at', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getIPById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM ips WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getIPByAddress(ip) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM ips WHERE ip = ?', [ip], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function addIP(ip, label) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO ips (ip, label) VALUES (?, ?)', [ip, label], function(err) {
      if (err) reject(err);
      else resolve({ lastInsertRowid: this.lastID });
    });
  });
}

function deleteIP(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM ips WHERE id = ? AND ip != ?', [id, '8.8.8.8'], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

// Settings operations
function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : null);
    });
  });
}

function updateSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key], function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

function getAllSettings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM settings', (err, rows) => {
      if (err) reject(err);
      else {
        const result = {};
        rows.forEach(setting => {
          result[setting.key] = setting.value;
        });
        resolve(result);
      }
    });
  });
}

module.exports = {
  initDatabase,
  getAllIPs,
  getIPById,
  getIPByAddress,
  addIP,
  deleteIP,
  getSetting,
  updateSetting,
  getAllSettings
};
