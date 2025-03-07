/**
 * This script kills any processes running on the Vite development server ports (5173-5200)
 * It runs automatically before 'npm run dev' to ensure we don't have multiple instances
 */

import { exec } from 'child_process';
import { platform } from 'os';

const isWindows = platform() === 'win32';

console.log('🔍 Checking for processes using Vite development ports (5173-5200)...');

// Define a function to kill processes by port
const killProcessesByPort = (ports) => {
  if (isWindows) {
    // On Windows, use a more direct approach to kill processes by port
    const portList = ports.join(',');
    const command = `powershell -Command "foreach ($port in ${portList}) { $processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess; if ($processId) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue } }"`;
    
    exec(command, (error) => {
      if (error) {
        console.log('⚠️ Warning: Could not kill all port processes, but continuing anyway.');
        console.log(`Error details: ${error.message}`);
      } else {
        console.log(`✅ Successfully killed processes on ports: ${portList}`);
      }
      
      // Also kill any stray node processes that might be running Vite
      killNodeProcessesByName();
    });
  } else {
    // On Unix systems, use lsof to find and kill processes by port
    const portCommands = ports.map(port => `lsof -i :${port} -t | xargs -r kill -9`).join('; ');
    exec(portCommands, (error) => {
      if (error) {
        console.log('⚠️ Warning: Could not kill all port processes, but continuing anyway.');
      } else {
        console.log(`✅ Successfully killed processes on ports: ${ports.join(', ')}`);
      }
      
      // Also kill any stray node processes that might be running Vite
      killNodeProcessesByName();
    });
  }
};

// Define a function to kill node processes by name pattern
const killNodeProcessesByName = () => {
  if (isWindows) {
    // On Windows, find and kill node processes that might be running Vite
    exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', (error, stdout) => {
      if (error || !stdout.includes('node.exe')) {
        console.log('✅ No Node.js processes found.');
        return;
      }
      
      // Extract PIDs from the output
      const lines = stdout.split('\n').filter(line => line.includes('node.exe'));
      if (lines.length > 0) {
        console.log(`🧹 Found ${lines.length} Node.js processes. Cleaning up...`);
        
        // Kill processes that might be running Vite (look for vite in command line)
        exec('powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like \'*vite*\'} | Stop-Process -Force"', (killError) => {
          if (killError) {
            console.log('⚠️ Warning: Could not kill all Node.js processes, but continuing anyway.');
          } else {
            console.log('✅ Cleaned up Node.js processes running Vite.');
          }
          
          console.log('✅ Port cleanup completed. Starting development server...');
        });
      } else {
        console.log('✅ No Node.js processes found to clean up.');
        console.log('✅ Port cleanup completed. Starting development server...');
      }
    });
  } else {
    // On Unix systems, find and kill node processes that might be running Vite
    exec('ps aux | grep node | grep vite', (error, stdout) => {
      if (error || !stdout.trim()) {
        console.log('✅ No Node.js processes running Vite found.');
        console.log('✅ Port cleanup completed. Starting development server...');
        return;
      }
      
      // Extract PIDs and kill them
      const pids = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => line.split(/\s+/)[1])
        .filter(pid => pid);
      
      if (pids.length > 0) {
        console.log(`🧹 Found ${pids.length} Node.js processes running Vite. Cleaning up...`);
        exec(`kill -9 ${pids.join(' ')}`, (killError) => {
          if (killError) {
            console.log('⚠️ Warning: Could not kill all Node.js processes, but continuing anyway.');
          } else {
            console.log('✅ Cleaned up Node.js processes running Vite.');
          }
          
          console.log('✅ Port cleanup completed. Starting development server...');
        });
      } else {
        console.log('✅ No Node.js processes found to clean up.');
        console.log('✅ Port cleanup completed. Starting development server...');
      }
    });
  }
};

// Generate an array of ports to check
const portsToCheck = Array.from({ length: 28 }, (_, i) => 5173 + i);

// First, try to kill processes by port
killProcessesByPort(portsToCheck); 