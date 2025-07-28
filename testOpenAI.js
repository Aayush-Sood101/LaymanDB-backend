require('dotenv').config();
const OpenAI = require('openai');

// Log environment variables (without showing full key)
const apiKey = process.env.OPENAI_API_KEY || '';
console.log('API Key exists:', !!apiKey);
console.log('API Key prefix:', apiKey.substring(0, 7) + '...');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test function
async function testOpenAI() {
  try {
    console.log('Testing OpenAI API connection...');
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Say hello!"
        }
      ]
    });
    
    console.log('Response received!');
    console.log('Message:', response.choices[0].message.content);
    console.log('API is working correctly!');
  } catch (error) {
    console.error('Error testing OpenAI API:', error);
  }
}

// Run test
testOpenAI();
