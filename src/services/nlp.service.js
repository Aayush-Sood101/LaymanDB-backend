const { OpenAI } = require('openai');
const logger = require('../utils/logger');
const { openaiResponseLogger } = require('../utils/logger');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Make sure environment variables are loaded
dotenv.config();

// Initialize OpenAI client if API key is available
let openai;
try {
  // Check for API key in environment
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (apiKey) {
    console.log('Found OpenAI API key in environment variables. First few characters:', apiKey.substring(0, 7) + '...');
    logger.info('Found OpenAI API key in environment variables');
    
    openai = new OpenAI({
      apiKey: apiKey
    });
    logger.info('OpenAI client initialized successfully');
  } else {
    // Try to read directly from .env file as a fallback
    try {
      const envPath = path.resolve(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/OPENAI_API_KEY=([^\s\r\n]+)/);
        if (match && match[1]) {
          console.log('Found OpenAI API key in .env file. First few characters:', match[1].substring(0, 7) + '...');
          logger.info('Found OpenAI API key in .env file, using it directly');
          
          openai = new OpenAI({
            apiKey: match[1]
          });
          logger.info('OpenAI client initialized successfully from .env file');
        } else {
          logger.warn('No OpenAI API key found in .env file');
        }
      } else {
        logger.warn('No .env file found');
      }
    } catch (readError) {
      logger.warn('Error reading .env file directly:', readError);
    }
    
    if (!openai) {
      logger.error('No OpenAI API key found in environment variables or .env file');
      throw new Error('OpenAI API key is required for entity extraction');
    }
  }
} catch (error) {
  logger.error('Error initializing OpenAI client:', error);
  throw error;
}

/**
 * Extract entities, relationships, and attributes from natural language input
 * @param {string} text - Natural language prompt about database design
 * @returns {Object} - Extracted entities, relationships and attributes
 */
exports.extractEntities = async (text) => {
  try {
    if (!openai) {
      throw new Error('OpenAI client is not initialized. Please check your API key configuration.');
    }

    logger.info('Using OpenAI for schema generation');
    const result = await processWithAI(text);
    logger.info('OpenAI processing successful');
    return result;
  } catch (error) {
    logger.error('Error extracting entities:', error);
    throw new Error(`Failed to extract entities: ${error.message}`);
  }
};

/**
 * Process text using OpenAI for entity extraction
 * @param {string} text - Natural language prompt
 * @returns {Object} - Extracted entities and relationships
 */
async function processWithAI(text) {
  try {
    // Use a cost-efficient model
    const model = "gpt-3.5-turbo-0125"; // Using the most efficient version of gpt-3.5-turbo
    logger.info(`Starting OpenAI API request with model: ${model}`);
    
    // Validate OpenAI client is available
    if (!openai) {
      throw new Error('OpenAI client is not initialized');
    }
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: `You are an expert database designer tasked with converting natural language descriptions into formal database schemas. Follow these comprehensive database design principles:

## 1. CONCEPTUAL DESIGN ELEMENTS

### ENTITIES
- **Strong Entities**: Independent existence (Customer, Product)
- **Weak Entities**: Existence depends on another entity (Order Line depends on Order)
- **Lookup/Reference Entities**: Normalize attributes with fixed sets of values (Status, PaymentMethod)

### ATTRIBUTES
- **Simple**: Atomic values (name, age)
- **Composite**: Can be divided (address = street + city + state + zip)
- **Derived**: Calculated from other attributes (age from birthdate)
- **Multi-valued**: Multiple values for one entity (phone_numbers)
- **Required vs Optional**: NOT NULL vs NULL constraint
- **Domain constraints**: Valid value ranges or patterns
- **Default values**: Values used when none provided

### DATA TYPE INFERENCE RULES
- **Text/String Attributes**: names, titles, descriptions, addresses → VARCHAR(255) or TEXT
- **Numeric Attributes**: 
  - Integer values: counts, IDs, quantities → INTEGER
  - Decimal values: prices, rates, measurements → DECIMAL(10,2)
- **Date/Time Attributes**: dates, timestamps, durations → TIMESTAMP
- **Boolean Attributes**: flags, yes/no values, status indicators → BOOLEAN
- **Enumerated Values**: gender, status codes, categories → VARCHAR(255) (in lookup tables)
- **Binary Data**: images, files, media → BLOB (for MySQL) or BYTEA (for PostgreSQL)
- **JSON/Complex Data**: nested structures, flexible schemas → JSON or JSONB (PostgreSQL)

### KEYS
- **Primary Keys**: Unique entity identifiers (use 'id' for default or entity_id pattern)
- **Natural vs Surrogate**: Prefer surrogate keys (generated id) for stability
- **Candidate Keys**: Alternative unique identifiers (set isUnique: true)
- **Foreign Keys**: References to other entities (follow naming pattern: entityname_id)
- **Composite Keys**: Multiple attributes forming unique identifier

## 2. RELATIONSHIP TYPES

### RELATIONSHIP NAMING
- **Use Verb Phrases**: "places", "manages", "contains", "belongs to"
- **Direction Matters**: "employs" vs "works for" depending on perspective
- **Use Present Tense**: "orders" not "ordered"
- **Be Specific**: "teaches" is better than "has" or "associated with"

### CARDINALITY PATTERNS
- **One-to-One (1:1)**: Each entity relates to exactly one other (type: ONE_TO_ONE)
- **One-to-Many (1:N)**: One entity relates to multiple others (type: ONE_TO_MANY)
- **Many-to-One (N:1)**: Multiple entities relate to one (type: MANY_TO_ONE)
- **Many-to-Many (M:N)**: Multiple entities relate to multiple others (type: MANY_TO_MANY)

### PARTICIPATION CONSTRAINTS
- **Total**: Every entity instance participates in relationship (sourceParticipation: "TOTAL")
- **Partial**: Some entity instances may not participate (sourceParticipation: "PARTIAL")

## 3. SQL DATA TYPE CONSIDERATIONS
- Use specific SQL data types compatible with MySQL, PostgreSQL, SQLite, and SQL Server:
  - INTEGER, BIGINT for IDs and numeric values without decimals
  - DECIMAL(10,2) for monetary values and precise decimals
  - VARCHAR(255) for most text fields, TEXT for longer content
  - TIMESTAMP for date/time values
  - BOOLEAN for true/false values

Format the output as a detailed JSON object with these EXACT properties:

### entities
Array of objects with:
- name: entity name (PascalCase or camelCase)
- description: brief description of what this entity represents
- attributes: array of objects with:
  - name: attribute name (camelCase)
  - dataType: SQL data type (VARCHAR(255), INTEGER, DECIMAL(10,2), TIMESTAMP, BOOLEAN, TEXT)
  - isPrimaryKey: boolean (true/false)
  - isForeignKey: boolean (true/false) 
  - isNullable: boolean (true/false)
  - isUnique: boolean (true/false)
  - defaultValue: default value if any (string)
  - description: brief description of the attribute
- position: object with isDraggable set to true

### relationships
Array of objects with:
- name: relationship name (verb or action phrase)
- sourceEntity: name of the source entity
- targetEntity: name of the target entity
- type: one of "ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", "MANY_TO_MANY"
- sourceCardinality: cardinality of source (e.g., "1..1", "0..*")
- targetCardinality: cardinality of target (e.g., "1..1", "0..*")
- sourceParticipation: "TOTAL" or "PARTIAL"
- targetParticipation: "TOTAL" or "PARTIAL"
- description: description of the relationship
- attributes: array of relationship attributes (if any) with same structure as entity attributes
- position: object with isDraggable set to true

ALWAYS include the following for EACH entity:
1. A primary key attribute named 'id' with dataType 'INTEGER' if no natural primary key exists
2. Standard timestamps: created_at and updated_at with dataType 'TIMESTAMP'
3. Reasonable descriptions for each entity and attribute
4. Ensure all entities have properly configured attribute data types

Ensure all relationships have meaningful names and correct cardinality settings. Foreign keys should be properly defined with clear reference to the target entity.`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });
    
    logger.info('OpenAI API response received');
    
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No choices returned from OpenAI API');
    }
    
    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error('Empty response content from OpenAI API');
    }
    
    try {
      // Parse the response to ensure it's valid JSON
      const parsedResponse = JSON.parse(responseContent);
      
      // Enhance relationship descriptions to ensure they display correctly
      if (parsedResponse.relationships && Array.isArray(parsedResponse.relationships)) {
        parsedResponse.relationships = parsedResponse.relationships.map(relationship => {
          // Make sure the description is human-readable and properly formatted
          if (relationship.description) {
            relationship.description = relationship.description.trim();
          }
          // Ensure all components in the diagram are draggable by adding position property if missing
          if (!relationship.position) {
            relationship.position = { isDraggable: true };
          } else {
            relationship.position.isDraggable = true;
          }
          return relationship;
        });
      }
      
      // Ensure all entities are draggable
      if (parsedResponse.entities && Array.isArray(parsedResponse.entities)) {
        parsedResponse.entities = parsedResponse.entities.map(entity => {
          if (!entity.position) {
            entity.position = { isDraggable: true, x: Math.random() * 500, y: Math.random() * 400 };
          } else {
            entity.position.isDraggable = true;
          }
          return entity;
        });
      }
      
      // Stringify the enhanced response
      const enhancedResponse = JSON.stringify(parsedResponse, null, 2);
      
      // Log the full OpenAI response to the dedicated log file
      openaiResponseLogger.info('OpenAI response', {
        prompt: text,
        model: model,
        response: enhancedResponse,
        usage: response.usage,
        timestamp: new Date().toISOString()
      });
      
      logger.info('AI-based entity extraction completed', { 
        entityCount: parsedResponse.entities?.length,
        relationshipCount: parsedResponse.relationships?.length
      });
      
      return parsedResponse;
    } catch (parseError) {
      logger.error('Error parsing OpenAI response:', parseError);
      throw parseError;
    }
  } catch (error) {
    logger.error('OpenAI API error:', error);
    throw error;
  }
}

module.exports = exports;