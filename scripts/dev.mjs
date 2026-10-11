// Start backend (port 5000) and frontend (port 5173) together:  npm run dev
import { spawn, execSync } from 'node:child_process';

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

// A previous run that was not shut down cleanly keeps the ports busy ("Port 5000 is already in use").
// Free them first — but only if the process holding the port is Node (never touch other apps).
function freePort(port) {
  try {
    const pids = new Set();
    if (isWin) {
      const out = execSync(`netstat -ano | findstr LISTENING | findstr :${port}`, { encoding: 'utf8' });
      for (const line of out.split(/\r?\n/)) {
        const cols = line.trim().split(/\s+/);
        if (cols[1]?.endsWith(`:${port}`)) pids.add(cols.at(-1));
      }
    } else {
      execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).split('\n').filter(Boolean).forEach(p => pids.add(p));
    }
    for (const pid of pids) {
      const name = isWin
        ? execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' })
        : execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' });
      if (!/node/i.test(name)) {
        console.log(`  ⚠ Port ${port} is used by another program (pid ${pid}) — close it and try again.`);
        continue;
      }
      execSync(isWin ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`, { stdio: 'ignore' });
      console.log(`  ↻ Stopped an old server that was still running on port ${port}`);
    }
  } catch { /* nothing listening */ }
}
freePort(5000);
freePort(5173);

const procs = [
  { name: 'api', color: '\x1b[35m', args: ['run', 'dev', '--prefix', 'backend'] },
  { name: 'web', color: '\x1b[36m', args: ['run', 'dev', '--prefix', 'frontend'] }
].map(({ name, color, args }) => {
  const child = spawn(`${npm} ${args.join(' ')}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) => stream.on('data', (buf) => {
    for (const line of buf.toString().split(/\r?\n/)) if (line.trim()) out.write(prefix + line + '\n');
  });
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`);
    shutdown();
  });
  return child;
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const p of procs) if (!p.killed) p.kill();
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
console.log('\n  PG Manager starting…  App → http://localhost:5173   API → http://localhost:5000\n');
