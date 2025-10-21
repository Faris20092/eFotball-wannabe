const { execSync, spawn } = require('child_process');
const path = require('path');

function killNodeProcesses() {
  // no-op: removed aggressive taskkill for safety
}

function startBot() {
  console.log('Starting bot...');
  const proc = spawn('node', ['index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });
  return proc;
}

function deployCommands() {
  try {
    console.log('Deploying slash commands...');
    execSync('node deploy-commands.js', {
      cwd: __dirname,
      stdio: 'inherit',
      env: process.env,
    });
    console.log('Deploy complete.');
  } catch (err) {
    console.error('deploy-commands failed (continuing restart):', err && err.stack ? err.stack : (err?.message || err));
  }
}

function main() {
  try {
    console.log('Restarting bot...');
    // 1) Deploy commands
    deployCommands();
    // 2) Start the bot in the current console (no handoff, no detaching)
    startBot();
  } catch (e) {
    console.error('restart-bot failed:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
}

main();
//taskkill /F /IM node.exe
//node deploy-commands.js