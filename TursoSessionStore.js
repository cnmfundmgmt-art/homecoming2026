/**
 * TursoSessionStore — express-session compatible store backed by Turso (libsql).
 * Sessions are stored in a shared `sessions` table so they work across all Render instances.
 */
const { createClient } = require('@libsql/client');
const session = require('express-session');

let _client = null;

function getClient() {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) return null;
    _client = createClient({ url, authToken: token });
  }
  return _client;
}

class TursoSessionStore extends session.Store {
  constructor(options = {}) {
    super(options);
    this.ttl = (options.ttl || 86400) * 1000; // ms
    this.prefix = options.prefix || 'sess:';
  }

  async ensureTable() {
    const client = getClient();
    if (!client) return;
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid TEXT PRIMARY KEY,
          sess TEXT NOT NULL,
          expire INTEGER NOT NULL
        )
      `);
      await client.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire)`);
    } catch (e) {
      console.log('[TursoSessionStore] table init:', e.message);
    }
  }

  async get(sid, callback) {
    try {
      const client = getClient();
      if (!client) return callback(null, null);
      await this.ensureTable();
      const key = this.prefix + sid;
      const now = Date.now();
      const rows = await client.execute({
        sql: 'SELECT sess FROM sessions WHERE sid = ? AND expire > ?',
        args: [key, now]
      });
      if (rows.rows && rows.rows.length > 0) {
        const sess = JSON.parse(rows.rows[0].sess);
        return callback(null, sess);
      }
      return callback(null, null);
    } catch (e) {
      return callback(e);
    }
  }

  async set(sid, session, callback) {
    try {
      const client = getClient();
      if (!client) return callback(null);
      await this.ensureTable();
      const key = this.prefix + sid;
      const maxAge = session.cookie?.maxAge || this.ttl;
      const expire = Date.now() + maxAge;
      const sess = JSON.stringify(session);
      await client.execute({
        sql: 'INSERT OR REPLACE INTO sessions (sid, sess, expire) VALUES (?, ?, ?)',
        args: [key, sess, expire]
      });
      return callback(null);
    } catch (e) {
      return callback(e);
    }
  }

  async destroy(sid, callback) {
    try {
      const client = getClient();
      if (!client) return callback(null);
      const key = this.prefix + sid;
      await client.execute({ sql: 'DELETE FROM sessions WHERE sid = ?', args: [key] });
      return callback(null);
    } catch (e) {
      return callback(e);
    }
  }

  async touch(sid, session, callback) {
    try {
      const client = getClient();
      if (!client) return callback(null);
      const key = this.prefix + sid;
      const maxAge = session.cookie?.maxAge || this.ttl;
      const expire = Date.now() + maxAge;
      await client.execute({ sql: 'UPDATE sessions SET expire = ? WHERE sid = ?', args: [expire, key] });
      return callback(null);
    } catch (e) {
      return callback(e);
    }
  }
}

module.exports = TursoSessionStore;
