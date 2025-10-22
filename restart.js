/**
 * Simple script to restart the server
 * This ensures all changes are properly applied
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('🔄 Restarting the server...');

// Build the project
console.log('🛠️ Building the project...');
const buildProcess = spawn(npmCmd, ['run', 'build'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed with code:', code);
    process.exit(code);
  }

  console.log('✅ Build completed successfully');
  console.log('🚀 Starting the server...');

  // Start the server
  const startProcess = spawn(npmCmd, ['run', 'start'], {
    stdio: 'inherit',
    shell: true
  });

  startProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Server exited with code:', code);
      process.exit(code);
    }
  });
});
