require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('=== CHECKING ENVIRONMENT CONFIGURATION ===\n');

// Read the key directly from .env file
try {
  const envPath = path.resolve(__dirname, '.env');
  console.log('Looking for .env file at:', envPath);
  
  if (fs.existsSync(envPath)) {
    console.log('✓ .env file exists');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    console.log('Contents of .env file (first 100 chars):');
    console.log(envContent.substring(0, 100) + '...');
    
    const match = envContent.match(/OPENAI_API_KEY=([^\s\r\n]+)/);
    if (match && match[1]) {
      console.log('✓ Found OpenAI API key in .env file. First few characters:', match[1].substring(0, 7) + '...');
    } else {
      console.log('× No OPENAI_API_KEY found in .env file');
    }
  } else {
    console.log('× .env file does not exist at this path');
  }
} catch (err) {
  console.error('Error reading .env file:', err);
}

// Check if the key is in the environment variables
const apiKey = process.env.OPENAI_API_KEY;
console.log('\nChecking environment variables:');
console.log('OPENAI_API_KEY exists in env:', !!apiKey ? '✓ Yes' : '× No');
if (apiKey) {
  console.log('OPENAI_API_KEY first few characters:', apiKey.substring(0, 7) + '...');
}

// List all environment variables (without values for security)
console.log('\nList of all environment variables:');
Object.keys(process.env).forEach(key => {
  console.log(`- ${key}: ${key === 'OPENAI_API_KEY' ? '[hidden]' : 'value available'}`);
});

// Check if the logs directory exists
console.log('\n=== CHECKING LOG CONFIGURATION ===\n');

const logsDir = path.join(__dirname, 'logs');
console.log('Looking for logs directory at:', logsDir);

if (!fs.existsSync(logsDir)) {
  console.log('× Logs directory does not exist. Creating it...');
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✓ Logs directory created successfully');
  } catch (error) {
    console.error('Error creating logs directory:', error);
  }
} else {
  console.log('✓ Logs directory exists');
  
  // Check for log files
  const logFiles = [
    'combined.log',
    'error.log',
    'openai-responses.log'
  ];
  
  logFiles.forEach(file => {
    const logPath = path.join(logsDir, file);
    if (fs.existsSync(logPath)) {
      try {
        const stats = fs.statSync(logPath);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        console.log(`✓ ${file} exists (${fileSizeKB} KB)`);
        
        // For openai-responses.log, check if it has content
        if (file === 'openai-responses.log' && stats.size > 0) {
          const content = fs.readFileSync(logPath, 'utf8');
          const entries = content.split('\n').filter(line => line.trim() !== '');
          console.log(`  - Contains ${entries.length} log entries`);
          console.log('  - OpenAI response logging is configured correctly');
        }
      } catch (error) {
        console.error(`Error checking ${file}:`, error);
      }
    } else {
      console.log(`× ${file} does not exist yet`);
      if (file === 'openai-responses.log') {
        console.log('  - OpenAI responses will be logged here after the first API call');
        console.log('  - Run testOpenAI.js to test OpenAI integration and generate logs');
      }
    }
  });
}
