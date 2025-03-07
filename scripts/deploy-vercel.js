#!/usr/bin/env node

/**
 * Helper script for deploying to Vercel
 * Run with: node scripts/deploy-vercel.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Check if Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'ignore' });
  console.log('✅ Vercel CLI is installed');
} catch (error) {
  console.log('❌ Vercel CLI is not installed. Installing...');
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
    console.log('✅ Vercel CLI installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install Vercel CLI. Please install it manually with: npm install -g vercel');
    process.exit(1);
  }
}

// Check if user is logged in to Vercel
try {
  execSync('vercel whoami', { stdio: 'ignore' });
  console.log('✅ Already logged in to Vercel');
} catch (error) {
  console.log('❌ Not logged in to Vercel. Please login:');
  try {
    execSync('vercel login', { stdio: 'inherit' });
  } catch (loginError) {
    console.error('❌ Failed to login to Vercel');
    process.exit(1);
  }
}

// Check if vercel.json exists
const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
if (!fs.existsSync(vercelConfigPath)) {
  console.error('❌ vercel.json not found. Please create it first.');
  process.exit(1);
}

console.log('🚀 Deploying to Vercel...');
try {
  execSync('vercel --prod', { stdio: 'inherit' });
  console.log('✅ Deployment successful!');
} catch (deployError) {
  console.error('❌ Deployment failed');
  process.exit(1);
} 