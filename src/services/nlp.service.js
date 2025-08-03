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
- **Text/String Attributes**: names, titles, descriptions, addresses → VARCHAR/TEXT
- **Numeric Attributes**: 
  - Integer values: counts, IDs, quantities → INTEGER
  - Decimal values: prices, rates, measurements → DECIMAL/FLOAT
- **Date/Time Attributes**: dates, timestamps, durations → DATE/DATETIME/TIMESTAMP
- **Boolean Attributes**: flags, yes/no values, status indicators → BOOLEAN
- **Enumerated Values**: gender, status codes, categories → ENUM or reference to lookup tables
- **Binary Data**: images, files, media → BLOB/BINARY
- **JSON/Complex Data**: nested structures, flexible schemas → JSON/JSONB

### KEYS
- **Primary Keys**: Unique entity identifiers (customer_id)
- **Natural vs Surrogate**: Natural (existing attribute) vs Surrogate (generated id)
- **Candidate Keys**: Alternative unique identifiers
- **Foreign Keys**: References to other entities
- **Composite Keys**: Multiple attributes forming unique identifier

## 2. RELATIONSHIP TYPES

### RELATIONSHIP NAMING
- **Use Verb Phrases**: "places", "manages", "contains", "belongs to"
- **Direction Matters**: "employs" vs "works for" depending on perspective
- **Use Present Tense**: "orders" not "ordered"
- **Be Specific**: "teaches" is better than "has" or "associated with"

### CARDINALITY PATTERNS
- **One-to-One (1:1)**: Each entity relates to exactly one other (expressed as 1..1 - 1..1)
- **One-to-Many (1:N)**: One entity relates to multiple others (expressed as 1..1 - 0..*)
- **Many-to-One (N:1)**: Multiple entities relate to one (expressed as 0..* - 1..1)
- **Many-to-Many (M:N)**: Multiple entities relate to multiple others (expressed as 0..* - 0..*)
- **Precise Cardinality**: Use exact ranges like 0..1, 1..1, 1..*, 2..5 when known

### PARTICIPATION CONSTRAINTS
- **Total**: Every entity instance participates in relationship (MUST have)
- **Partial**: Some entity instances may not participate (MAY have)

### RELATIONSHIP CATEGORIES
- **Identifying**: Foreign key is part of primary key (weak entity relationships)
- **Non-identifying**: Foreign key is not part of primary key
- **Recursive**: Entity relates to itself (Employee → Manager)
- **Ternary+**: Involves three or more entities

### SPECIAL RELATIONSHIPS
- **Aggregation**: "Has-a" relationship, entity contains others
- **Composition**: Strong form of aggregation, lifetime dependency
- **Association**: General connection between entities
- **Generalization/Specialization**: Inheritance hierarchies

## 3. NORMALIZATION PRINCIPLES
- Apply normalization to avoid redundancy and anomalies
- Consider 1NF through 3NF as minimum requirements
- Balance normalization with performance needs

## 4. IMPLEMENTATION CONSIDERATIONS
- **Indexing Strategy**: Primary keys, foreign keys, search fields
- **Constraints**: UNIQUE, CHECK, DEFAULT, NOT NULL
- **Triggers**: For complex integrity rules
- **Computed Columns**: For frequently accessed derived data

## 5. TEXTUAL PATTERN ANALYSIS
- "has", "contains", "includes" → attributes or 1:N relationships
- "each", "every", "all" → total participation
- "some", "may", "can" → partial participation
- "belongs to", "is part of" → weak entities or M:1 relationships
- "many", "multiple", "several" → higher cardinality
- "must", "required", "necessary" → NOT NULL constraints
- "unique", "identifies", "distinct" → UNIQUE constraint or key
- "between X and Y" → possible relationship
- "codes", "types", "statuses" → potential lookup/reference tables
- "list of", "set of", "collection of" → potential multi-valued attributes

## 6. HANDLING AMBIGUOUS INPUTS
- **Document Assumptions**: When input is vague, make logical domain-relevant assumptions and explicitly document them in descriptions
- **Infer Related Entities**: When attributes imply relationships (e.g., "customer_id"), create the necessary related entities
- **Suggest Normalizations**: Identify repeated values or enumerations that should be separate lookup tables
- **Provide Alternatives**: When multiple interpretations are valid, choose the most appropriate and explain the choice
- **Fill Missing Details**: Supply reasonable defaults for missing but necessary information

Format the output as a detailed JSON object with:
- entities: array of objects with name, type (strong/weak), attributes (array of objects with name, dataType, isPrimaryKey, isForeignKey, isNullable, isMultiValued, isComposite, isDerived, defaultValue, description)
- relationships: array of objects with name, sourceEntity, targetEntity, type (ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE, MANY_TO_MANY), sourceCardinality, targetCardinality, sourceParticipation (TOTAL/PARTIAL), targetParticipation (TOTAL/PARTIAL), cardinality (optional, expressed as "0..1", "1..*", etc.), attributes (array of relationship attributes), description, assumptionsMade (array of assumptions if input was ambiguous)
- inheritance: array of objects with parent, children (array), type (disjoint/overlapping, total/partial)
- constraints: array of objects with type (check, unique, etc.), entities, attributes, description
- lookupTables: array of objects identifying attributes that were normalized into separate lookup entities

Ensure each entity has appropriate primary keys and attributes with inferred data types based on context. All relationships should have meaningful names. Make and document logical assumptions when input is ambiguous. Identify attributes that should be normalized into lookup tables. Use your database design expertise to infer implicit entities and relationships that may not be explicitly mentioned but are necessary for a complete schema.`
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