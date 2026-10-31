#!/usr/bin/env node
/**
 * with-env.mjs — project env runner.
 *
 * Loads `.env` (project source of truth: keys defined there OVERRIDE any
 * inherited shell variables — this makes behaviour identical whether you run
 * via npm/bun in VS Code, a CI shell, or the sandbox) and then spawns the
 * given command with that environment.
 *
 * Usage:
 *   node scripts/with-env.mjs [--log <file>] <command> [args...]
 *
 *   --log <file>  mirror stdout/stderr into <file> (cross-platform `tee`)
 */
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Minimal .env parser: KEY=VALUE, ignores comments/blank lines, strips quotes. */
export function parseDotEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (/^".*"$/.test(val) || /^'.*'$/.test(val)) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

export function loadProjectEnv() {
  const env = parseDotEnv(path.join(ROOT, '.env'));
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  return env;
}

// ------- CLI mode (when executed directly, not imported) -------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  let logFile = null;
  if (argv[0] === '--log') {
    logFile = argv[1];
    argv.splice(0, 2);
  }
  const [cmd, ...args] = argv;
  if (!cmd) {
    console.error('with-env: no command given. Usage: node scripts/with-env.mjs [--log <file>] <cmd> [args...]');
    process.exit(2);
  }

  loadProjectEnv();

  const child = spawn(cmd, args, {
    cwd: ROOT,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  const log = logFile ? createWriteStream(path.join(ROOT, logFile), { flags: 'a' }) : null;
  child.stdout.on('data', (d) => { process.stdout.write(d); if (log) log.write(d); });
  child.stderr.on('data', (d) => { process.stderr.write(d); if (log) log.write(d); });

  const forward = (sig) => () => { try { child.kill(sig); } catch { /* noop */ } };
  process.on('SIGINT', forward('SIGINT'));
  process.on('SIGTERM', forward('SIGTERM'));

  child.on('exit', (code) => {
    if (log) log.end();
    process.exit(code ?? 1);
  });
}
