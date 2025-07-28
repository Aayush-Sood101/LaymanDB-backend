require('dotenv').config();
const nlpService = require('./src/services/nlp.service');

// Sample prompt from the examples
const samplePrompt = `
Design a schema for a blog platform where users can write and publish articles.
Articles have a title, content, publication date, and status (draft or published).
Users can have roles (admin, editor, author, reader).
Articles can have multiple tags and belong to categories.
Readers can leave comments on articles.
Track article view counts and user engagement metrics.
`;

async function testSchemaGeneration() {
  console.log('Testing schema generation with OpenAI...');
  
  try {
    const result = await nlpService.extractEntities(samplePrompt);
    console.log('Schema generation successful!');
    console.log('Entities found:', result.entities.length);
    console.log('Relationships found:', result.relationships.length);
    console.log('\nEntities:');
    console.log(JSON.stringify(result.entities, null, 2));
    console.log('\nRelationships:');
    console.log(JSON.stringify(result.relationships, null, 2));
  } catch (error) {
    console.error('Error generating schema:', error);
  }
}

testSchemaGeneration();
