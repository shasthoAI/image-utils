import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'data', 'image-tools.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Jobs table - tracks processing jobs
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      config TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      error_message TEXT
    )
  `);

  // Files table - tracks input and output files
  db.run(`
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
    )
  `);

  // Tool chains table - tracks chained operations
  db.run(`
    CREATE TABLE IF NOT EXISTS tool_chains (
      id TEXT PRIMARY KEY,
      name TEXT,
      steps TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chain executions table - tracks chain execution instances
  db.run(`
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
    )
  `);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs (type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_job_id ON files (job_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_files_type ON files (type)`);
});

export { db };