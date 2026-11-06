/**
 * @file scripts/dev-all.ts
 * @description Orchestrates one-command local startup of the entire Thenar ecosystem:
 * 1. Python Enrollment Service (Port 8000)
 * 2. Gateway REST + WebSocket Server (Port 3000)
 * 3. Device Simulator (ESP32 telemetry streamer)
 * 4. Companion Web App (Vite Dev Server, Port 5173)
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const isWindows = process.platform === 'win32';
const processes: ChildProcess[] = [];

function runProcess(name: string, command: string, args: string[], cwd = process.cwd(), color = '\x1b[36m') {
  console.log(`${color}[${name}]\x1b[0m Starting ${command} ${args.join(' ')}`);

  const useShell = isWindows && !command.toLowerCase().endsWith('.exe');

  const proc = spawn(command, args, {
    cwd,
    shell: useShell,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  proc.stdout?.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) console.log(`${color}[${name}]\x1b[0m ${line}`);
    }
  });

  proc.stderr?.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) console.error(`${color}[${name}:ERR]\x1b[0m ${line}`);
    }
  });

  proc.on('close', (code) => {
    console.log(`${color}[${name}]\x1b[0m Exited with code ${code}`);
  });

  processes.push(proc);
  return proc;
}

async function main() {
  console.log('====================================================');
  console.log('🚀 Starting Thenar Monorepo Ecosystem (All Services)');
  console.log('====================================================\n');

  // 1. Python Enrollment Service
  const pythonPath = isWindows
    ? path.resolve(process.cwd(), 'apps/enrollment/.venv/Scripts/python.exe')
    : path.resolve(process.cwd(), 'apps/enrollment/.venv/bin/python');

  runProcess(
    'ENROLLMENT',
    pythonPath,
    ['-m', 'uvicorn', 'apps.enrollment.src.main:app', '--port', '8000', '--host', '127.0.0.1'],
    process.cwd(),
    '\x1b[35m' // Magenta
  );

  // 2. Gateway API & WebSocket Server
  setTimeout(() => {
    runProcess(
      'GATEWAY',
      'npx',
      ['tsx', 'apps/gateway/src/server.ts'],
      process.cwd(),
      '\x1b[32m' // Green
    );
  }, 1000);

  // 3. Vite Web Frontend
  setTimeout(() => {
    runProcess(
      'WEB',
      'npx',
      ['vite', '--port', '5173', '--host', '127.0.0.1'],
      process.cwd(),
      '\x1b[36m' // Cyan
    );
  }, 2000);

  // 4. Device Simulator (periodic background heartbeat)
  setTimeout(() => {
    runProcess(
      'DEVICE-SIM',
      'npx',
      ['tsx', 'apps/device-sim/src/cli.ts', '--scenario=owner-unlock', '--count=1'],
      process.cwd(),
      '\x1b[33m' // Yellow
    );
  }, 3500);

  const cleanup = () => {
    console.log('\nStopping all services...');
    for (const p of processes) {
      try {
        p.kill();
      } catch {
        // ignore
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch(console.error);
