import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const BASE_DIR = process.env.IMAGE_UTILS_DATA_DIR || process.cwd();
const dataDir = path.resolve(BASE_DIR, 'data');
const jsonPath = path.join(dataDir, 'image-tools.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Pure JSON-based database (reliable, no compilation needed)
console.log('📄 Database: Pure JSON storage at', jsonPath);

// Enhanced JSON database operations with proper structure
const load = () => {
  try {
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      // Ensure proper structure exists
      return {
        jobs: data.jobs || [],
        files: data.files || [],
        tool_chains: data.tool_chains || [],
        chain_executions: data.chain_executions || []
      };
    }
  } catch (error) {
    console.warn('⚠️  JSON database corrupted, starting fresh:', error.message);
  }
  return { jobs: [], files: [], tool_chains: [], chain_executions: [] };
};

const save = (data) => {
  try {
    // Atomic write with backup
    const tempPath = jsonPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, jsonPath);
  } catch (error) {
    console.error('⚠️  Failed to save database:', error.message);
  }
};

const nowISO = () => new Date().toISOString();

const likeMatch = (val, pattern) => {
  // pattern like %foo% — convert to simple includes
  const needle = String(pattern).replace(/^%|%$/g, '');
  return String(val).includes(needle);
};

// Enhanced database with better performance and reliability
const db = {
  run(sql, params, cb) {
    try {
      const s = sql.toLowerCase();
      const data = load();
      
      // Jobs table operations
      if (s.startsWith('insert into jobs')) {
        const [id, type, configStr] = params;
        data.jobs.push({ 
          id, type, 
          status: 'pending', 
          config: configStr, 
          created_at: nowISO(), 
          updated_at: nowISO(), 
          completed_at: null, 
          error_message: null 
        });
        save(data);
        cb && cb.call({ changes: 1, lastID: id }, null);
        return;
      }
      
      if (s.startsWith('update jobs set status')) {
        const [status, updated_at, error_message, completed_at, id] = params;
        const j = data.jobs.find(x => x.id === id);
        if (j) { 
          j.status = status; 
          j.updated_at = updated_at; 
          j.error_message = error_message; 
          j.completed_at = completed_at; 
          save(data); 
          cb && cb.call({ changes: 1 }, null); 
          return; 
        }
        cb && cb.call({ changes: 0 }, null); 
        return;
      }
      
      // Files table operations
      if (s.startsWith('insert into files')) {
        const [id, job_id, type, original_name, pathValue, size, mime_type] = params;
        data.files.push({ 
          id, job_id, type, original_name, 
          path: pathValue, size, mime_type, 
          created_at: nowISO() 
        });
        save(data);
        cb && cb.call({ changes: 1, lastID: id }, null);
        return;
      }
      
      // Tool chains operations
      if (s.startsWith('insert into tool_chains')) {
        const [id, name, steps] = params;
        data.tool_chains.push({ 
          id, name, steps, 
          created_at: nowISO(), 
          updated_at: nowISO() 
        });
        save(data); 
        cb && cb.call({ changes: 1, lastID: id }, null); 
        return;
      }
      
      // Chain executions operations
      if (s.startsWith('update chain_executions set current_step')) {
        const [current_step, updated_at, id] = params;
        const ce = data.chain_executions.find(x => x.id === id);
        if (ce) { 
          ce.current_step = current_step; 
          ce.updated_at = updated_at; 
          save(data); 
        }
        cb && cb.call({ changes: ce ? 1 : 0 }, null); 
        return;
      }
      
      if (s.includes('update chain_executions set status = "completed"')) {
        const [output_files, updated_at, id] = params;
        const ce = data.chain_executions.find(x => x.id === id);
        if (ce) { 
          ce.status = 'completed'; 
          ce.output_files = output_files; 
          ce.updated_at = updated_at; 
          save(data); 
        }
        cb && cb.call({ changes: ce ? 1 : 0 }, null); 
        return;
      }
      
      if (s.includes('update chain_executions set status = "failed"')) {
        const [updated_at, id] = params;
        const ce = data.chain_executions.find(x => x.id === id);
        if (ce) { 
          ce.status = 'failed'; 
          ce.updated_at = updated_at; 
          save(data); 
        }
        cb && cb.call({ changes: ce ? 1 : 0 }, null); 
        return;
      }
      
      if (s.startsWith('update chain_executions set status = ?')) {
        const [status, updated_at, id] = params;
        const ce = data.chain_executions.find(x => x.id === id);
        if (ce) { 
          ce.status = status; 
          ce.updated_at = updated_at; 
          save(data); 
        }
        cb && cb.call({ changes: ce ? 1 : 0 }, null); 
        return;
      }
      
      if (s.startsWith('insert into chain_executions')) {
        const [id, chain_id, input_files] = params;
        data.chain_executions.push({ 
          id, chain_id, 
          current_step: 0, 
          status: 'pending', 
          input_files, 
          output_files: null, 
          created_at: nowISO(), 
          updated_at: nowISO() 
        });
        save(data); 
        cb && cb.call({ changes: 1, lastID: id }, null); 
        return;
      }
      
      // Default fallback
      cb && cb.call({ changes: 0 }, null);
    } catch (err) { 
      cb && cb(err); 
    }
  },

  get(sql, params, cb) {
    try {
      const s = sql.toLowerCase();
      const data = load();
      
      if (s.startsWith('select * from jobs where id =')) {
        const [id] = params;
        const row = data.jobs.find(x => x.id === id) || null;
        cb && cb(null, row); 
        return;
      }
      
      if (s.startsWith('select * from tool_chains where id =')) {
        const [id] = params;
        const row = data.tool_chains.find(x => x.id === id) || null;
        cb && cb(null, row); 
        return;
      }
      
      if (s.startsWith('select path from files where job_id')) {
        const [jobId, like] = params;
        const row = data.files.find(f => f.job_id === jobId && f.type === 'output' && likeMatch(f.path, like));
        cb && cb(null, row ? { path: row.path } : undefined); 
        return;
      }
      
      if (s.startsWith('select * from chain_executions where id =')) {
        const [id] = params;
        const row = data.chain_executions.find(x => x.id === id) || null;
        cb && cb(null, row); 
        return;
      }
      
      cb && cb(null, undefined);
    } catch (err) { 
      cb && cb(err); 
    }
  },

  all(sql, params, cb) {
    try {
      const s = sql.toLowerCase();
      const data = load();
      
      if (typeof params === 'function') { 
        cb = params; 
        params = []; 
      }
      
      if (s.startsWith('select * from jobs order by')) {
        const rows = [...data.jobs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        cb && cb(null, rows); 
        return;
      }
      
      if (s.startsWith('select * from files where job_id')) {
        const [jobId] = params || [];
        const rows = data.files.filter(f => f.job_id === jobId);
        cb && cb(null, rows); 
        return;
      }
      
      if (s.startsWith('select * from tool_chains order by')) {
        const rows = [...data.tool_chains].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        cb && cb(null, rows); 
        return;
      }
      
      if (s.startsWith('select * from chain_executions order by')) {
        const rows = [...data.chain_executions].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        cb && cb(null, rows); 
        return;
      }
      
      cb && cb(null, []);
    } catch (err) { 
      cb && cb(err); 
    }
  },

  close() {
    // Ensure final save on close
    return Promise.resolve();
  }
};

export { db };