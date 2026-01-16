#!/usr/bin/env node

/**
 * Development script to run frontend, backend, and vnstock API concurrently
 * Usage: npm run dev:all
 */

const concurrently = require('concurrently');
const path = require('path');

const frontendDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(__dirname, '../../nextjs-blog-backend');
const vnstockDir = path.resolve(__dirname, '../../../Python/vnstock');

console.log('🚀 Starting fullstack development environment...\n');
console.log(`Frontend: ${frontendDir}`);
console.log(`Backend: ${backendDir}`);
console.log(`Vnstock: ${vnstockDir}\n`);

concurrently(
  [
    {
      name: 'frontend',
      command: 'npm run dev',
      cwd: frontendDir,
      prefixColor: 'cyan',
    },
    {
      name: 'backend',
      command: 'npm run dev',
      cwd: backendDir,
      prefixColor: 'magenta',
    },
    {
      name: 'vnstock',
      command: 'python3 run-api.py',
      cwd: vnstockDir,
      prefixColor: 'green',
    },
  ],
  {
    prefix: 'name',
    killOthers: ['failure', 'success'],
    restartTries: 3,
    restartDelay: 1000,
  }
).result.catch((error) => {
  console.error('❌ Error starting development servers:', error);
  process.exit(1);
});

