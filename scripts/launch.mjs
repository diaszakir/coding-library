import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const command = process.argv[2];
if (!['dev', 'start'].includes(command)) throw new Error('Expected dev or start');

// Next loads .env files later. Read them here too so host and port can be set
// consistently on Windows, macOS, and Linux without shell-specific syntax.
const require = createRequire(import.meta.url);
const requireNext = createRequire(require.resolve('next/package.json'));
const { loadEnvConfig } = requireNext('@next/env');
loadEnvConfig(process.cwd(), command === 'dev');
const hostname = process.env.DEVLIBRARY_HOST || '127.0.0.1';
const port = process.env.PORT || '3000';
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}
const executable = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const child = spawn(process.execPath, [executable, command, '--hostname', hostname, '--port', port, ...process.argv.slice(3)], { stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
