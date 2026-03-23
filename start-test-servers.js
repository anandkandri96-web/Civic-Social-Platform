#!/usr/bin/env node

/**
 * Test Server Starter
 * Starts both backend and frontend servers for testing
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting test servers...');

// Start backend server
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'Backend'),
  stdio: 'inherit',
  shell: true
});

backend.on('error', (err) => {
  console.error('❌ Backend server failed to start:', err);
  process.exit(1);
});

// Wait a bit for backend to start, then start frontend
setTimeout(() => {
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_API_URL: 'http://localhost:5000/api' }
  });

  frontend.on('error', (err) => {
    console.error('❌ Frontend server failed to start:', err);
    process.exit(1);
  });

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down test servers...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down test servers...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });

}, 3000);