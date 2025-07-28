require('dotenv').config();
const nlpService = require('./src/services/nlp.service');
const schemaGeneratorService = require('./src/services/schemaGenerator.service');
const fs = require('fs');
const path = require('path');
const { openaiResponseLogger } = require('./src/utils/logger');

// Sample prompt from the examples
const samplePrompt = `
Design a schema for a blog platform where users can write and publish articles.
Articles have a title, content, publication date, and status (draft or published).
Users can have roles (admin, editor, author, reader).
Articles can have multiple tags and belong to categories.
Readers can leave comments on articles.
Track article view counts and user engagement metrics.
`;

// Make sure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

async function testSchemaGeneration() {
  console.log('Testing schema generation with OpenAI...');
  
  try {
    console.log('Processing prompt...');
    
    // Record start time
    const startTime = Date.now();
    
    // Extract entities from the prompt
    const result = await nlpService.extractEntities(samplePrompt);
    
    // Calculate time taken
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`Schema generation successful in ${timeTaken} seconds!`);
    console.log('Entities found:', result.entities.length);
    console.log('Relationships found:', result.relationships.length);
    
    // Generate a full schema
    console.log('\nGenerating complete schema...');
    const schema = await schemaGeneratorService.generateSchema(result, {
      name: 'Blog Platform',
      description: 'Schema for a blog platform with users, articles, comments, and metrics'
    });
    
    // Save the result to a file for inspection
    const outputPath = path.join(logsDir, 'schema-output.json');
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
    console.log(`\nFull schema saved to ${outputPath}`);
    console.log('OpenAI responses have been logged to logs/openai-responses.log');
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error generating schema:', error);
  }
}

testSchemaGeneration();
