/**
 * @file apps/device-sim/src/cli.ts
 * @description Command-line interface for running ESP32 simulator scenarios against the Gateway.
 *
 * USAGE:
 * npm run sim -- --scenario=owner-unlock
 * npm run sim -- --scenario=fingerprint-accepted-impostor
 * npm run sim -- --scenario=random-day --count=5
 */

import { DeviceSimulator } from './simulator.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value ?? 'true';
    }
  }

  return {
    scenario: options.scenario || 'owner-unlock',
    count: Number(options.count || 1),
    speed: Number(options.speed || 1.0),
    seed: options.seed ? Number(options.seed) : undefined,
    gatewayUrl: options['gateway-url'] || 'ws://localhost:3000',
    token: options.token || 'thenar-device-secret-2026'
  };
}

async function main() {
  const opts = parseArgs();
  console.log('----------------------------------------------------');
  console.log('🤖 Thenar ESP32 Hardware Simulator CLI');
  console.log(`Connecting to Gateway: ${opts.gatewayUrl}`);
  console.log(`Scenario: ${opts.scenario} | Count: ${opts.count} | Speed: ${opts.speed}x`);
  console.log('----------------------------------------------------');

  const sim = new DeviceSimulator({
    gatewayUrl: opts.gatewayUrl,
    token: opts.token,
    speed: opts.speed
  });

  const connected = await sim.connect();
  if (!connected) {
    console.warn('⚠️ Could not establish WebSocket connection to Gateway. Running local standalone simulation...');
  } else {
    console.log('✅ Connected to Gateway /ws/device successfully!');
  }

  const scenariosToRun: string[] = [];
  if (opts.scenario === 'random-day') {
    const pool = ['owner-unlock', 'owner-unlock', 'impostor', 'owner-unlock', 'mimic-l1', 'sensor-fault'];
    for (let i = 0; i < opts.count; i++) {
      scenariosToRun.push(pool[i % pool.length]);
    }
  } else {
    for (let i = 0; i < opts.count; i++) {
      scenariosToRun.push(opts.scenario);
    }
  }

  for (let i = 0; i < scenariosToRun.length; i++) {
    const sc = scenariosToRun[i];
    console.log(`\n[${i + 1}/${scenariosToRun.length}] Executing scenario: ${sc}...`);
    const result = await sim.runScenario(sc, opts.seed ? opts.seed + i : undefined);

    if (result) {
      const icon = result.decision === 'accept' ? '🟢 ACCEPTED' : '🔴 REJECTED';
      console.log(`-> Decision: ${icon} | Score: ${result.score ?? 'N/A'} | Tau: ${result.tau} | FP: ${result.fingerprint.result}`);
      if (result.featureDeviations && result.featureDeviations.length > 0) {
        console.log(`   Deviations: ${result.featureDeviations.map(d => `${d.name} (${d.z}σ)`).join(', ')}`);
      }
    }

    if (i < scenariosToRun.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('\n✨ Simulation completed successfully.');
  setTimeout(() => {
    sim.disconnect();
    process.exit(0);
  }, 1000);
}

main().catch((err) => {
  console.error('Simulator CLI error:', err);
  process.exit(1);
});
