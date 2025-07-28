require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Read the key directly from .env file
try {
  const envPath = path.resolve(__dirname, '.env');
  console.log('Looking for .env file at:', envPath);
  
  if (fs.existsSync(envPath)) {
    console.log('.env file exists');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    console.log('Contents of .env file (first 100 chars):');
    console.log(envContent.substring(0, 100) + '...');
    
    const match = envContent.match(/OPENAI_API_KEY=([^\s\r\n]+)/);
    if (match && match[1]) {
      console.log('Found OpenAI API key in .env file. First few characters:', match[1].substring(0, 7) + '...');
    } else {
      console.log('No OPENAI_API_KEY found in .env file');
    }
  } else {
    console.log('.env file does not exist at this path');
  }
} catch (err) {
  console.error('Error reading .env file:', err);
}

// Check if the key is in the environment variables
const apiKey = process.env.OPENAI_API_KEY;
console.log('\nChecking environment variables:');
console.log('OPENAI_API_KEY exists in env:', !!apiKey);
if (apiKey) {
  console.log('OPENAI_API_KEY first few characters:', apiKey.substring(0, 7) + '...');
}

// List all environment variables (without values for security)
console.log('\nList of all environment variables:');
Object.keys(process.env).forEach(key => {
  console.log(`- ${key}: ${key === 'OPENAI_API_KEY' ? '[hidden]' : 'value available'}`);
});
