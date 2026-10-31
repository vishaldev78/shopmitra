// Spawns the Next.js dev server as a fully detached daemon that survives
// the calling shell (double-fork emulation via child_process detached).
import { spawn } from 'child_process';

const child = spawn('node', ['scripts/with-env.mjs', '--log', 'dev.log', 'next', 'dev', '-p', '3000'], {
  cwd: '/home/z/my-project',
  detached: true,
  stdio: 'ignore',
  env: { ...process.env, PATH: `/home/z/my-project/node_modules/.bin:${process.env.PATH}` },
});
child.unref();
console.log('dev server daemon started, pid', child.pid);
