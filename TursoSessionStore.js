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
    console.log('[TursoSessionStore] TURSO_DATABASE_URL:', url ? 'SET' : 'MISSING');
    console.log('[TursoSessionStore] TURSO_AUTH_TOKEN:', token ? 'SET' : 'MISSING');
    if (!url || !token) {
      console.error('[TursoSessionStore] FATAL: Turso env vars missing — sessions will NOT persist!');
      return null;
    }
    _client = createClient({ url, authToken: token });
    console.log('[TursoSessionStore] Client created, URL:', url.substring(0, 50) + '...');
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
    console.log('[TursoSessionStore] getClient():', client ? 'CONNECTED' : 'NULL — TURSO vars may be missing!');
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
      console.log('[TursoSessionStore] sessions table ready');
    } catch (e) {
      console.log('[TursoSessionStore] table init ERROR:', e.message);
    }
  }

  async get(sid, callback) {
    try {
      const client = getClient();
      if (!client) {
        console.warn('[TursoSessionStore] get() — no client, returning null session');
        return callback(null, null);
      }
      await this.ensureTable();
      const key = this.prefix + sid;
      const now = Date.now();
      const rows = await client.execute({
        sql: 'SELECT sess FROM sessions WHERE sid = ? AND expire > ?',
        args: [key, now]
      });
      if (rows.rows && rows.rows.length > 0) {
        const sess = JSON.parse(rows.rows[0].sess);
        console.log('[TursoSessionStore] get() SESSION FOUND for sid:', sid);
        return callback(null, sess);
      }
      console.log('[TursoSessionStore] get() no session found for sid:', sid);
      return callback(null, null);
    } catch (e) {
      console.error('[TursoSessionStore] get() ERROR:', e.message);
      return callback(e);
    }
  }

  async set(sid, session, callback) {
    try {
      const client = getClient();
      if (!client) {
        console.warn('[TursoSessionStore] set() — no client, session NOT saved!');
        return callback(null);
      }
      await this.ensureTable();
      const key = this.prefix + sid;
      const maxAge = session.cookie?.maxAge || this.ttl;
      const expire = Date.now() + maxAge;
      const sess = JSON.stringify(session);
      await client.execute({
        sql: 'INSERT OR REPLACE INTO sessions (sid, sess, expire) VALUES (?, ?, ?)',
        args: [key, sess, expire]
      });
      console.log('[TursoSessionStore] set() SAVED session:', sid, 'expire:', expire);
      return callback(null);
    } catch (e) {
      console.error('[TursoSessionStore] set() ERROR:', e.message);
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
