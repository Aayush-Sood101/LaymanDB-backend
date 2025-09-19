require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./src/utils/logger');

async function testGemini() {
  try {
    console.log('Testing Gemini API connection...');
    
    // Get API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('Error: GEMINI_API_KEY is not set in environment variables');
      return;
    }
    
    console.log('API Key exists:', !!apiKey);
    console.log('API Key prefix:', apiKey.substring(0, 7) + '...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Sample text input
    const prompt = "Create a simple schema for a blog with users, posts, and comments";
    
    // System prompt (now included as part of the user message)
    const systemPrompt = 
      "Create a valid Mermaid ER diagram from this database description. " +
      "Output only the diagram code starting with 'erDiagram'. " +
      "Use PK for primary keys, FK for foreign keys, and proper cardinality notation. " +
      "Use data types: string, number, date, boolean.";
    
    console.log('Sending request to Gemini API...');
    console.log('Using model:', 'gemini-2.5-flash');
    
    // Use the correct API format
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\n---\n\nGenerate a diagram for the following description:\n\n${prompt}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: 'text/plain',
      }
    });
    
    const response = await result.response;
    const rawText = response.text();
    
    console.log('\nResponse received!');
    console.log('Response preview:');
    console.log('-----------------------------------');
    console.log(rawText.substring(0, 500) + (rawText.length > 500 ? '...' : ''));
    console.log('-----------------------------------');
    
    console.log('\nAPI is working correctly!');
  } catch (error) {
    console.error('Error testing Gemini API:', error);
  }
}

// Run the test
testGemini();