#!/usr/bin/env node
/**
 * db-up.mjs — ensures the database referenced by DATABASE_URL is reachable.
 *
 * - DATABASE_URL points to a remote host (e.g. Neon PostgreSQL)  → no-op.
 * - DATABASE_URL points to the local sandbox PostgreSQL          → boots it
 *   (initdb on first run, then pg_ctl start) using the portable
 *   binaries in .sandbox/pg. Fully idempotent.
 *
 * Wired into `npm run db:push` so `bun run dev` / `npm run dev` always boot
 * with a live database, in the sandbox AND on a fresh clone in VS Code.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectEnv } from './with-env.mjs';

loadProjectEnv(); // .env is the project source of truth (overrides stale shell vars)

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PG_DIR = path.join(ROOT, '.sandbox', 'pg');
const DATA_DIR = path.join(ROOT, '.sandbox', 'pgdata');
const LOG_FILE = path.join(ROOT, '.sandbox', 'postgres.log');
const PORT = Number(process.env.LOCAL_PG_PORT || 5433);
const PGUSER = 'postgres';

const url = process.env.DATABASE_URL || '';
const isLocalPg = /^postgres(ql)?:\/\//.test(url) && /@?(127\.0\.0\.1|localhost):/.test(url);

if (!isLocalPg) {
  console.log('[db-up] DATABASE_URL is not a local PostgreSQL — nothing to do.');
  process.exit(0);
}

if (!existsSync(path.join(PG_DIR, 'bin', 'postgres'))) {
  console.error('[db-up] Local PostgreSQL binaries missing at .sandbox/pg — cannot start.');
  process.exit(1);
}

function portOpen(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host: '127.0.0.1', port, timeout: 700 });
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
  });
}

if (await portOpen(PORT)) {
  console.log(`[db-up] PostgreSQL already running on 127.0.0.1:${PORT}`);
  process.exit(0);
}

const env = {
  ...process.env,
  LC_ALL: 'C',
  LD_LIBRARY_PATH: path.join(PG_DIR, 'lib'),
};

if (!existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
  mkdirSync(DATA_DIR, { recursive: true });
  console.log('[db-up] Initialising fresh PostgreSQL data directory…');
  const init = spawnSync(path.join(PG_DIR, 'bin', 'initdb'), [
    '-D', DATA_DIR, '-U', PGUSER, '-E', 'UTF8', '--auth=trust',
  ], { env, stdio: 'ignore' });
  if (init.status !== 0) {
    console.error('[db-up] initdb failed (exit ' + init.status + ')');
    process.exit(1);
  }
}

console.log(`[db-up] Starting PostgreSQL on 127.0.0.1:${PORT}…`);
const ctl = spawnSync(path.join(PG_DIR, 'bin', 'pg_ctl'), [
  '-D', DATA_DIR,
  '-l', LOG_FILE,
  '-o', `-p ${PORT} -c listen_addresses=127.0.0.1`,
  '-w', '-t', '30',
  'start',
], { env, stdio: 'ignore' });

if (ctl.status !== 0 || !(await portOpen(PORT))) {
  console.error('[db-up] PostgreSQL failed to start. See .sandbox/postgres.log');
  process.exit(1);
}

// Ensure the application database exists.
const dbName = (url.split('/').pop() || 'shopmitra').split('?')[0];
const psql = (sql) => spawnSync(path.join(PG_DIR, 'bin', 'psql'), [
  '-h', '127.0.0.1', '-p', String(PORT), '-U', PGUSER, '-d', 'postgres',
  '-tAc', sql,
], { env, stdio: 'pipe' });

const exists = psql(`SELECT 1 FROM pg_database WHERE datname='${dbName}'`);
if (String(exists.stdout || '').trim() !== '1') {
  spawnSync(path.join(PG_DIR, 'bin', 'createdb'), [
    '-h', '127.0.0.1', '-p', String(PORT), '-U', PGUSER, dbName,
  ], { env, stdio: 'ignore' });
  console.log(`[db-up] Created database "${dbName}".`);
}

console.log('[db-up] PostgreSQL is ready.');
