require('dotenv').config();
const OpenAI = require('openai');
const { openaiResponseLogger } = require('./src/utils/logger');

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
    
    // Use a sample database design prompt
    const prompt = "Create a simple schema for a blog with users, posts and comments";
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a database design expert."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });
    
    console.log('Response received!');
    
    // Log the full response to the dedicated log file
    openaiResponseLogger.info('Test OpenAI response', {
      prompt: prompt,
      model: "gpt-3.5-turbo",
      response: response.choices[0].message.content,
      usage: response.usage,
      timestamp: new Date().toISOString()
    });
    
    console.log('Response summary:', response.choices[0].message.content.substring(0, 100) + '...');
    console.log('Full response logged to logs/openai-responses.log');
    
    // Show usage data
    if (response.usage) {
      console.log('\nUsage data:');
      console.log(`- Prompt tokens: ${response.usage.prompt_tokens}`);
      console.log(`- Completion tokens: ${response.usage.completion_tokens}`);
      console.log(`- Total tokens: ${response.usage.total_tokens}`);
    }
    
    console.log('API is working correctly!');
  } catch (error) {
    console.error('Error testing OpenAI API:', error);
  }
}

// Run test
testOpenAI();
