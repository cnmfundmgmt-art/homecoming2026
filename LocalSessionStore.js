/**
 * LocalSessionStore — express-session compatible store backed by local SQLite.
 * Used as fallback when Turso env vars are not set.
 */
const session = require('express-session');
const Database = require('better-sqlite3');
const path = require('path');

class LocalSessionStore extends session.Store {
  constructor(options = {}) {
    super(options);
    this.ttl = (options.ttl || 86400) * 1000; // ms
    this.prefix = options.prefix || 'sess:';
    const dbPath = options.dbPath || path.join(__dirname, 'sessions.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
    `);
    console.log(`[LocalSessionStore] Using SQLite: ${dbPath}`);
  }

  get(sid, callback) {
    try {
      const key = this.prefix + sid;
      const now = Date.now();
      const row = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expire > ?').get(key, now);
      if (row) {
        return callback(null, JSON.parse(row.sess));
      }
      return callback(null, null);
    } catch (e) {
      return callback(e);
    }
  }

  set(sid, sess, callback) {
    try {
      const key = this.prefix + sid;
      const maxAge = sess.cookie?.maxAge || this.ttl;
      const expire = Date.now() + maxAge;
      const sessStr = JSON.stringify(sess);
      this.db.prepare('INSERT OR REPLACE INTO sessions (sid, sess, expire) VALUES (?, ?, ?)').run(key, sessStr, expire);
      return callback(null);
    } catch (e) {
      return callback(e);
    }
  }

  destroy(sid, callback) {
    try {
      const key = this.prefix + sid;
      this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(key);
      return callback(null);
    } catch (e) {
      return callback(e);
    }
  }

  touch(sid, sess, callback) {
    try {
      const key = this.prefix + sid;
      const maxAge = sess.cookie?.maxAge || this.ttl;
      const expire = Date.now() + maxAge;
      this.db.prepare('UPDATE sessions SET expire = ? WHERE sid = ?').run(expire, key);
      return callback(null);
    } catch (e) {
      return callback(e);
    }
  }
}

module.exports = LocalSessionStore;
