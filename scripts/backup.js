/**
 * Daily Backup Script for Homecoming 2026
 * Run daily via cron or manually
 * 
 * Local: Backs up SQLite database
 * Turso: Exports database to JSON file
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Config
const BACKUP_DIR = path.join(__dirname, 'backups');
const DB_PATH = path.join(__dirname, 'homecoming.db');
const DATE = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ─── Local SQLite Backup ───
function backupLocal() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('⚠️  Local database not found, skipping...');
    return;
  }
  
  const backupPath = path.join(BACKUP_DIR, `homecoming-${DATE}.db`);
  
  try {
    // Copy database file
    fs.copyFileSync(DB_PATH, backupPath);
    
    // Also copy wal and shm if they exist
    if (fs.existsSync(DB_PATH + '-wal')) {
      fs.copyFileSync(DB_PATH + '-wal', backupPath + '-wal');
    }
    if (fs.existsSync(DB_PATH + '-shm')) {
      fs.copyFileSync(DB_PATH + '-shm', backupPath + '-shm');
    }
    
    console.log(`✅ Local backup saved: ${backupPath}`);
    
    // Keep only last 7 days
    cleanupOldBackups('homecoming-', '.db');
  } catch (err) {
    console.error('❌ Local backup failed:', err.message);
  }
}

// ─── Turso Backup ───
async function backupTurso() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!tursoUrl || !tursoToken) {
    console.log('⚠️  Turso not configured, skipping...');
    return;
  }
  
  const { createClient } = require('@libsql/client');
  const client = createClient({ url: tursoUrl, authToken: tursoToken });
  
  const tables = ['registrations', 'audit_logs', 'merch_orders', 'checkins'];
  const backupData = { timestamp: new Date().toISOString() };
  
  try {
    for (const table of tables) {
      try {
        const result = await client.execute(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
      } catch (e) {
        console.log(`⚠️  Table ${table} not found, skipping...`);
      }
    }
    
    const backupPath = path.join(BACKUP_DIR, `turso-${DATE}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`✅ Turso backup saved: ${backupPath}`);
    
    // Cleanup old backups
    cleanupOldBackups('turso-', '.json');
  } catch (err) {
    console.error('❌ Turso backup failed:', err.message);
  }
  
  await client.close();
}

// ─── Cleanup old backups (keep last 7 days) ───
function cleanupOldBackups(prefix, ext) {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(prefix) && f.endsWith(ext))
      .sort()
      .reverse();
    
    // Remove files older than 7 days
    for (let i = 7; i < files.length; i++) {
      const filePath = path.join(BACKUP_DIR, files[i]);
      fs.unlinkSync(filePath);
      console.log(`🗑️  Deleted old backup: ${files[i]}`);
    }
  } catch (err) {
    console.log('⚠️  Cleanup error:', err.message);
  }
}

// ─── Main ───
async function main() {
  console.log(`\n🗓️  Running daily backup (${DATE})...\n`);
  
  // Local backup
  backupLocal();
  
  // Turso backup
  await backupTurso();
  
  console.log('\n✅ Backup complete!\n');
}

main();