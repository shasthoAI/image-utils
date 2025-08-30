import path from 'path';
import fs from 'fs';

const BASE_DIR = process.env.IMAGE_UTILS_DATA_DIR || process.cwd();
const dataDir = path.resolve(BASE_DIR, 'data');
const dbPath = path.join(dataDir, 'image-tools.db');
const jsonPath = path.join(dataDir, 'image-tools.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Attempt to use better-sqlite3; on failure, fall back to JSON store
let db;
try {
  const mod = await import('better-sqlite3');
  const Database = mod.default;
  const raw = new Database(dbPath);
  raw.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      config TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      error_message TEXT
    );
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      type TEXT NOT NULL,
      original_name TEXT NOT NULL,
      path TEXT NOT NULL,
      size INTEGER,
      mime_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs (id)
    );
    CREATE TABLE IF NOT EXISTS tool_chains (
      id TEXT PRIMARY KEY,
      name TEXT,
      steps TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS chain_executions (
      id TEXT PRIMARY KEY,
      chain_id TEXT NOT NULL,
      current_step INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      input_files TEXT,
      output_files TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chain_id) REFERENCES tool_chains (id)
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
    CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs (type);
    CREATE INDEX IF NOT EXISTS idx_files_job_id ON files (job_id);
    CREATE INDEX IF NOT EXISTS idx_files_type ON files (type);
  `);

  function normalizeArgs(params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    if (!Array.isArray(params)) params = params != null ? [params] : [];
    return { params, cb };
  }

  db = {
    run(sql, params, cb) {
      const { params: p, cb: callback } = normalizeArgs(params, cb);
      try {
        const stmt = raw.prepare(sql);
        const info = stmt.run(...p);
        if (callback) callback.call({ changes: info.changes, lastID: info.lastInsertRowid }, null);
      } catch (err) { if (callback) callback(err); }
    },
    get(sql, params, cb) {
      const { params: p, cb: callback } = normalizeArgs(params, cb);
      try {
        const stmt = raw.prepare(sql);
        const row = stmt.get(...p);
        if (callback) callback(null, row);
      } catch (err) { if (callback) callback(err); }
    },
    all(sql, params, cb) {
      const { params: p, cb: callback } = normalizeArgs(params, cb);
      try {
        const stmt = raw.prepare(sql);
        const rows = stmt.all(...p);
        if (callback) callback(null, rows);
      } catch (err) { if (callback) callback(err); }
    }
  };
  console.log('🗃️  Database: SQLite (better-sqlite3) initialized at', dbPath);
} catch (e) {
  console.warn('⚠️  SQLite unavailable, falling back to JSON storage:', e.message);
  console.log('📄 Database: JSON fallback at', jsonPath);
  // JSON fallback store
  const load = () => {
    try {
      if (fs.existsSync(jsonPath)) return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch {}
    return { jobs: [], files: [], tool_chains: [], chain_executions: [] };
  };
  const save = (data) => {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  };
  const nowISO = () => new Date().toISOString();

  const likeMatch = (val, pattern) => {
    // pattern like %foo% — convert to simple includes
    const needle = String(pattern).replace(/^%|%$/g, '');
    return String(val).includes(needle);
  };

  db = {
    run(sql, params, cb) {
      try {
        const s = sql.toLowerCase();
        const data = load();
        if (s.startsWith('insert into jobs')) {
          const [id, type, configStr] = params;
          data.jobs.push({ id, type, status: 'pending', config: configStr, created_at: nowISO(), updated_at: nowISO(), completed_at: null, error_message: null });
          save(data);
          cb && cb.call({ changes: 1, lastID: id }, null);
          return;
        }
        if (s.startsWith('update jobs set status')) {
          const [status, updated_at, error_message, completed_at, id] = params;
          const j = data.jobs.find(x => x.id === id);
          if (j) { j.status = status; j.updated_at = updated_at; j.error_message = error_message; j.completed_at = completed_at; save(data); cb && cb.call({ changes: 1 }, null); return; }
          cb && cb.call({ changes: 0 }, null); return;
        }
        if (s.startsWith('insert into files')) {
          const [id, job_id, type, original_name, pathValue, size, mime_type] = params;
          data.files.push({ id, job_id, type, original_name, path: pathValue, size, mime_type, created_at: nowISO() });
          save(data);
          cb && cb.call({ changes: 1, lastID: id }, null);
          return;
        }
        if (s.startsWith('insert into tool_chains')) {
          const [id, name, steps] = params;
          data.tool_chains.push({ id, name, steps, created_at: nowISO(), updated_at: nowISO() });
          save(data); cb && cb.call({ changes: 1, lastID: id }, null); return;
        }
        if (s.startsWith('update chain_executions set current_step')) {
          const [current_step, updated_at, id] = params;
          const ce = data.chain_executions.find(x => x.id === id);
          if (ce) { ce.current_step = current_step; ce.updated_at = updated_at; save(data); }
          cb && cb.call({ changes: ce ? 1 : 0 }, null); return;
        }
        if (s.includes('update chain_executions set status = "completed"')) {
          const [output_files, updated_at, id] = params;
          const ce = data.chain_executions.find(x => x.id === id);
          if (ce) { ce.status = 'completed'; ce.output_files = output_files; ce.updated_at = updated_at; save(data); }
          cb && cb.call({ changes: ce ? 1 : 0 }, null); return;
        }
        if (s.includes('update chain_executions set status = "failed"')) {
          const [updated_at, id] = params;
          const ce = data.chain_executions.find(x => x.id === id);
          if (ce) { ce.status = 'failed'; ce.updated_at = updated_at; save(data); }
          cb && cb.call({ changes: ce ? 1 : 0 }, null); return;
        }
        if (s.startsWith('update chain_executions set status = ?')) {
          const [status, updated_at, id] = params;
          const ce = data.chain_executions.find(x => x.id === id);
          if (ce) { ce.status = status; ce.updated_at = updated_at; save(data); }
          cb && cb.call({ changes: ce ? 1 : 0 }, null); return;
        }
        if (s.startsWith('insert into chain_executions')) {
          const [id, chain_id, input_files] = params;
          data.chain_executions.push({ id, chain_id, current_step: 0, status: 'pending', input_files, output_files: null, created_at: nowISO(), updated_at: nowISO() });
          save(data); cb && cb.call({ changes: 1, lastID: id }, null); return;
        }
        // default
        cb && cb.call({ changes: 0 }, null);
      } catch (err) { cb && cb(err); }
    },
    get(sql, params, cb) {
      try {
        const s = sql.toLowerCase();
        const data = load();
        if (s.startsWith('select * from jobs where id =')) {
          const [id] = params;
          const row = data.jobs.find(x => x.id === id) || null;
          cb && cb(null, row); return;
        }
        if (s.startsWith('select * from tool_chains where id =')) {
          const [id] = params;
          const row = data.tool_chains.find(x => x.id === id) || null;
          cb && cb(null, row); return;
        }
        if (s.startsWith('select path from files where job_id')) {
          const [jobId, like] = params;
          const row = data.files.find(f => f.job_id === jobId && f.type === 'output' && likeMatch(f.path, like));
          cb && cb(null, row ? { path: row.path } : undefined); return;
        }
        if (s.startsWith('select * from chain_executions where id =')) {
          const [id] = params;
          const row = data.chain_executions.find(x => x.id === id) || null;
          cb && cb(null, row); return;
        }
        cb && cb(null, undefined);
      } catch (err) { cb && cb(err); }
    },
    all(sql, params, cb) {
      try {
        const s = sql.toLowerCase();
        const data = load();
        if (typeof params === 'function') { cb = params; params = []; }
        if (s.startsWith('select * from jobs order by')) {
          const rows = [...data.jobs].sort((a,b)=> (a.created_at < b.created_at ? 1 : -1));
          cb && cb(null, rows); return;
        }
        if (s.startsWith('select * from files where job_id')) {
          const [jobId] = params || [];
          const rows = data.files.filter(f => f.job_id === jobId);
          cb && cb(null, rows); return;
        }
        if (s.startsWith('select * from tool_chains order by')) {
          const rows = [...data.tool_chains].sort((a,b)=> (a.created_at < b.created_at ? 1 : -1));
          cb && cb(null, rows); return;
        }
        cb && cb(null, []);
      } catch (err) { cb && cb(err); }
    }
  };
}

export { db };
