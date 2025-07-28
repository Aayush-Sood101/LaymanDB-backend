const natural = require('natural');
const { OpenAI } = require('openai');
const logger = require('../utils/logger');
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
      logger.warn('No OpenAI API key found in environment variables or .env file');
    }
  }
} catch (error) {
  logger.error('Error initializing OpenAI client:', error);
}

// Tokenizer for basic NLP processing
const tokenizer = new natural.WordTokenizer();
// Part-of-speech tagger with English lexicon
const lexicon = new natural.Lexicon('EN', 'NN');
const ruleSet = new natural.RuleSet('EN');
const tagger = new natural.BrillPOSTagger(lexicon, ruleSet);

/**
 * Extract entities, relationships, and attributes from natural language input
 * @param {string} text - Natural language prompt about database design
 * @returns {Object} - Extracted entities, relationships and attributes
 */
exports.extractEntities = async (text) => {
  try {
    // Check if OpenAI client is properly initialized
    if (openai && process.env.OPENAI_API_KEY) {
      logger.info('Using OpenAI for schema generation');
      try {
        // Try using OpenAI first
        const result = await processWithAI(text);
        logger.info('OpenAI processing successful');
        return result;
      } catch (aiError) {
        // If OpenAI fails, log the error and fall back to basic NLP
        logger.error('OpenAI processing failed, falling back to basic NLP:', aiError);
        return processWithBasicNLP(text);
      }
    } else {
      // If OpenAI is not available, use basic NLP processing
      logger.info('OpenAI client not available, using basic NLP processing');
      return processWithBasicNLP(text);
    }
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
      model: model, // Using a cost-efficient model
      messages: [
        {
          role: "system",
          content: `You are an expert database designer tasked with converting natural language descriptions into formal database schemas. Follow these comprehensive database design principles:

## 1. CONCEPTUAL DESIGN ELEMENTS

### ENTITIES
- **Strong Entities**: Independent existence (Customer, Product)
- **Weak Entities**: Existence depends on another entity (Order Line depends on Order)
- **Associative Entities**: Represents M:N relationships with attributes (Enrollment connects Student and Course)
- **Aggregated Entities**: Treating a relationship as an entity (Team = aggregation of Players)
- **Subtypes/Supertypes**: For inheritance hierarchies (Person → Employee, Customer)

### ATTRIBUTES
- **Simple**: Atomic values (name, age)
- **Composite**: Can be divided (address = street + city + state + zip)
- **Derived**: Calculated from other attributes (age from birthdate)
- **Multi-valued**: Multiple values for one entity (phone_numbers)
- **Required vs Optional**: NOT NULL vs NULL constraint
- **Domain constraints**: Valid value ranges or patterns
- **Default values**: Values used when none provided

### KEYS
- **Primary Keys**: Unique entity identifiers (customer_id)
- **Natural vs Surrogate**: Natural (existing attribute) vs Surrogate (generated id)
- **Candidate Keys**: Alternative unique identifiers
- **Foreign Keys**: References to other entities
- **Composite Keys**: Multiple attributes forming unique identifier

## 2. RELATIONSHIP TYPES

### CARDINALITY PATTERNS
- **One-to-One (1:1)**: Each entity relates to exactly one other
- **One-to-Many (1:N)**: One entity relates to multiple others
- **Many-to-One (N:1)**: Multiple entities relate to one
- **Many-to-Many (M:N)**: Multiple entities relate to multiple others

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
- **Junction Tables**: For M:N relationships with clean attributes
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

Format the output as a detailed JSON object with:
- entities: array of objects with name, type (strong/weak/associative), attributes (array of objects with name, dataType, isPrimaryKey, isForeignKey, isNullable, isMultiValued, isComposite, isDerived, defaultValue, description)
- relationships: array of objects with sourceEntity, targetEntity, type (ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE, MANY_TO_MANY), sourceCardinality, targetCardinality, sourceParticipation (TOTAL/PARTIAL), targetParticipation (TOTAL/PARTIAL), attributes (array of relationship attributes), description
- inheritance: array of objects with parent, children (array), type (disjoint/overlapping, total/partial)
- constraints: array of objects with type (check, unique, etc.), entities, attributes, description

Ensure each entity has appropriate primary keys and attributes, relationships have proper cardinality, and all identified constraints are included. Use your database design expertise to infer implicit entities and relationships that may not be explicitly mentioned but are necessary for a complete schema.`
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
      const result = JSON.parse(responseContent);
      logger.info('AI-based entity extraction completed', { 
        entityCount: result.entities?.length,
        relationshipCount: result.relationships?.length
      });
      
      return result;
    } catch (parseError) {
      logger.error('Error parsing OpenAI response:', parseError);
      throw parseError;
    }
  } catch (error) {
    logger.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Process text using basic NLP techniques for entity extraction
 * @param {string} text - Natural language prompt
 * @returns {Object} - Extracted entities and relationships
 */
function processWithBasicNLP(text) {
  try {
    // Split text into sentences for better context analysis
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // Tokenize the text
    const tokens = tokenizer.tokenize(text);
    
    // Apply part-of-speech tagging
    const taggedResult = tagger.tag(tokens);
    // Check if tagging worked correctly
    if (!taggedResult || !taggedResult.taggedWords) {
      logger.warn('POS tagging returned unexpected result, using fallback method');
      // Fallback: treat all tokens as potential entities
      return fallbackEntityExtraction(text);
    }
    
    const taggedTokens = taggedResult.taggedWords;
    
    // NLP patterns for database design elements - enhanced with more comprehensive patterns
    const entityPatterns = [
      // Basic entity patterns
      /each\s+(\w+)/gi,                          // "Each student"
      /a\s+(\w+)\s+has/gi,                       // "A student has"
      /an\s+(\w+)\s+has/gi,                      // "An employee has"
      /the\s+(\w+)\s+has/gi,                     // "The department has"
      /create\s+(?:a|an)?\s*(\w+)/gi,            // "Create a database"
      /(\w+)s\s+(?:have|has|contain)/gi,         // "Products have"
      /(\w+)s\s+belong/gi,                       // "Products belong"
      /design\s+(?:a|an)?\s*(\w+)/gi,            // "Design a system"
      
      // Advanced entity patterns
      /table\s+(?:for|of)\s+(\w+)/gi,            // "Table for users"
      /entity\s+(?:named|called)?\s+(\w+)/gi,    // "Entity named customer"
      /(\w+)\s+(?:table|entity|object)/gi,       // "User table"
      /(\w+)\s+(?:records|data|information)/gi,  // "Product records"
      /(?:store|save|record)\s+(\w+)\s+(?:data|information)/gi, // "Store customer data"
      /(\w+)\s+(?:must|should|will)\s+(?:be|have)/gi, // "Orders must have"
      /(?:create|define)\s+(\w+)\s+(?:with|containing|having)/gi // "Create products with"
    ];
    
    // Weak entity patterns - these are entities that depend on another entity for their existence
    const weakEntityPatterns = [
      /(\w+)\s+(?:depends|dependent)\s+on\s+(\w+)/gi,      // "OrderItem depends on Order"
      /(\w+)\s+(?:is part of|belongs to)\s+(\w+)/gi,       // "Address is part of User"
      /(\w+)\s+(?:cannot exist without|requires)\s+(\w+)/gi, // "LineItem cannot exist without Order"
      /weak\s+entity\s+(\w+)\s+(?:of|for)\s+(\w+)/gi,      // "weak entity LineItem for Order"
    ];
    
    // Attribute patterns with more comprehensive coverage
    const attributePatterns = [
      // Basic attribute patterns
      /(?:have|has)\s+(?:a|an)?\s*(\w+)/gi,      // "has a name"
      /(?:with|including)\s+(\w+)/gi,            // "with address"
      /(\w+)\s+(?:like|such as)\s+(.+?)(?:,|and|\.)/gi, // "attributes like name, age"
      /includes?\s+(\w+)/gi,                     // "includes price"
      /contains?\s+(\w+)/gi,                     // "contains title"
      
      // Advanced attribute patterns
      /(\w+)\s+(?:is|are)\s+(?:a|an)\s+attribute/gi,   // "name is an attribute"
      /(?:with|having)\s+(?:these|the|following)\s+(?:fields|attributes|columns):\s*(.+?)(?:\.|\n|$)/gi, // "with fields: name, age, email"
      /(?:store|track|record)\s+(?:the|their)?\s+(\w+)/gi, // "store the address"
      /(?:has|have|include)\s+(?:a|an)?\s*(\w+)\s+field/gi, // "have an email field"
      /properties\s+(?:like|such as|including)\s+(.+?)(?:\.|\n|$)/gi, // "properties like name, price"
      /(\w+)\s+(?:column|field|property)/gi,     // "email column"
      /field\s+(?:for|of|called)\s+(\w+)/gi,     // "field for price"
    ];
    
    // Data type patterns
    const dataTypePatterns = [
      /(\w+)\s+(?:is|as)\s+(?:a|an)?\s*(\w+)\s+(?:type|datatype)/gi, // "price as a decimal type"
      /(\w+)\s+(?:stored as|represented as)\s+(\w+)/gi,             // "date stored as timestamp"
      /(\w+)\s+(?:with type|of type)\s+(\w+)/gi,                    // "id with type integer"
    ];
    
    // Constraint patterns
    const constraintPatterns = [
      /(\w+)\s+(?:must be|should be|is|are)\s+(?:unique|not null|required)/gi, // "email must be unique"
      /(\w+)\s+(?:has|with)\s+(?:a|an)?\s*(?:default|check|constraint)/gi,   // "status with a default"
      /(\w+)\s+(?:cannot|can't|should not)\s+be\s+(?:null|empty)/gi,       // "name cannot be null"
      /primary\s+key\s+(?:is|as)\s+(\w+)/gi,                               // "primary key is id"
    ];
    
    // Relationship patterns with enhanced detection capabilities
    const relationshipPatterns = [
      // Basic relationship patterns
      /(\w+)s?\s+belong\s+to\s+(\w+)s?/gi,       // "Products belong to categories"
      /(\w+)s?\s+have\s+(\w+)s?/gi,              // "Customers have orders"
      /(\w+)s?\s+contains?\s+(\w+)s?/gi,         // "Order contains products"
      /each\s+(\w+)\s+has\s+(\w+)s?/gi,          // "Each student has courses"
      /(\w+)s?\s+(?:are|is)\s+linked\s+to\s+(\w+)s?/gi, // "Patient is linked to doctor"
      /(\w+)s?\s+can\s+(?:have|place)\s+(\w+)s?/gi,  // "Customers can place orders"
      
      // Advanced relationship patterns
      /(\w+)s?\s+(?:references|refers to)\s+(\w+)s?/gi, // "Order references Customer"
      /(\w+)s?\s+(?:associated with|connected to)\s+(\w+)s?/gi, // "User associated with Role"
      /relationship\s+between\s+(\w+)s?\s+and\s+(\w+)s?/gi, // "relationship between Students and Courses"
      /(\w+)s?\s+(?:join|links)\s+(\w+)s?\s+(?:and|with)\s+(\w+)s?/gi, // "Enrollment joins Students and Courses" (junction table)
      /(\w+)s?\s+(?:depends on|requires|needs)\s+(\w+)s?/gi, // "Order depends on Customer"
      /(\w+)s?\s+(?:composed of|made up of|consists of)\s+(\w+)s?/gi, // "Order composed of OrderItems" (composition)
      /(\w+)s?\s+(?:creates|generates|produces)\s+(\w+)s?/gi, // "User creates Posts"
    ];
    
    // Cardinality patterns with more comprehensive coverage
    const cardinalityPatterns = [
      // Basic cardinality patterns
      { regex: /(\w+)s?\s+have\s+(?:many|multiple|several)\s+(\w+)s?/gi, type: 'ONE_TO_MANY' },
      { regex: /each\s+(\w+)\s+has\s+(?:exactly)?\s*one\s+(\w+)/gi, type: 'ONE_TO_ONE' },
      { regex: /(\w+)s?\s+belongs?\s+to\s+(?:exactly)?\s*one\s+(\w+)/gi, type: 'MANY_TO_ONE' },
      { regex: /(?:many|multiple)\s+(\w+)s?\s+to\s+(?:many|multiple)\s+(\w+)s?/gi, type: 'MANY_TO_MANY' },
      
      // Advanced cardinality patterns
      { regex: /one-to-many\s+(?:between|from)\s+(\w+)s?\s+(?:to|and)\s+(\w+)s?/gi, type: 'ONE_TO_MANY' },
      { regex: /one-to-one\s+(?:between|from)\s+(\w+)s?\s+(?:to|and)\s+(\w+)s?/gi, type: 'ONE_TO_ONE' },
      { regex: /many-to-one\s+(?:between|from)\s+(\w+)s?\s+(?:to|and)\s+(\w+)s?/gi, type: 'MANY_TO_ONE' },
      { regex: /many-to-many\s+(?:between|from)\s+(\w+)s?\s+(?:to|and)\s+(\w+)s?/gi, type: 'MANY_TO_MANY' },
      { regex: /(\w+)s?\s+can\s+have\s+(?:many|multiple|several)\s+(\w+)s?/gi, type: 'ONE_TO_MANY' },
      { regex: /every\s+(\w+)\s+(?:must|has to)\s+have\s+one\s+(\w+)/gi, type: 'MANY_TO_ONE' },
      { regex: /1:M\s+(?:between|from)\s+(\w+)s?\s+(?:to|and)\s+(\w+)s?/gi, type: 'ONE_TO_MANY' },
      { regex: /1:1\s+(?:between|from)\s+(\w+)s?\s+(?:to|and)\s+(\w+)s?/gi, type: 'ONE_TO_ONE' },
      { regex: /M:1\s+(?:between|from)\s+(\w+)s?\s+(?:to|and)\s+(\w+)s?/gi, type: 'MANY_TO_ONE' },
      { regex: /M:N\s+(?:between|from)\s+(\w+)s?\s+(?:to|and)\s+(\w+)s?/gi, type: 'MANY_TO_MANY' }
    ];
    
    // Participation constraint patterns
    const participationConstraintPatterns = [
      { regex: /(\w+)s?\s+must\s+(?:have|belong to|be in)\s+(?:at least one|one or more)\s+(\w+)s?/gi, type: 'TOTAL' },
      { regex: /every\s+(\w+)\s+(?:must|has to)\s+have\s+(?:at least one|one or more)\s+(\w+)s?/gi, type: 'TOTAL' },
      { regex: /(\w+)s?\s+may\s+(?:have|belong to|be in)\s+(?:zero or more|some)\s+(\w+)s?/gi, type: 'PARTIAL' },
      { regex: /(\w+)s?\s+(?:can exist|exist)\s+without\s+(?:any|having)\s+(\w+)s?/gi, type: 'PARTIAL' }
    ];
    
    // Extract potential entities (nouns)
    const nouns = taggedTokens.filter(token => 
      token.tag && (token.tag.startsWith('NN') || token.tag === 'NNP' || token.tag === 'NNPS')
    ).map(token => token.token.toLowerCase());
    
    // Create a unique list of nouns
    const uniqueNouns = [...new Set(nouns)];
  
    // Enhanced entity extraction using patterns
    let potentialEntities = [];
    
    // Extract entities using patterns
    entityPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          potentialEntities.push(match[1].toLowerCase().trim());
        }
      }
    });
    
    // Add common nouns as potential entities
    const commonEntities = uniqueNouns.filter(noun => 
      noun.length > 3 && // Avoid short words like "the", "and"
      !["database", "system", "schema", "detail", "information", "data"].includes(noun) // Skip generic terms
    );
    
    potentialEntities = [...potentialEntities, ...commonEntities];
    
    // Remove duplicates and similar words (singular/plural)
    const entitiesMap = new Map();
    potentialEntities.forEach(entity => {
      // Convert plural to singular (basic rule, not comprehensive)
      const singularForm = entity.endsWith('s') ? entity.slice(0, -1) : entity;
      const key = singularForm;
      
      if (!entitiesMap.has(key)) {
        entitiesMap.set(key, {
          name: toTitleCase(entity),
          count: 1,
          originalForms: [entity]
        });
      } else {
        const existingEntity = entitiesMap.get(key);
        existingEntity.count++;
        existingEntity.originalForms.push(entity);
      }
    });
    
    // Extract attributes for entities with enhanced detection
    const entityAttributes = {};
    const entityConstraints = {};
    const entityDataTypes = {};
    
    sentences.forEach(sentence => {
      entitiesMap.forEach((entityInfo, entityKey) => {
        const entityName = entityInfo.name.toLowerCase();
        const lowerSentence = sentence.toLowerCase();
        
        // Check if sentence mentions the entity
        if (lowerSentence.includes(entityName) || 
            entityInfo.originalForms.some(form => lowerSentence.includes(form))) {
          
          // Look for attributes in this sentence
          attributePatterns.forEach(pattern => {
            let match;
            const patternClone = new RegExp(pattern.source, pattern.flags);
            while ((match = patternClone.exec(sentence)) !== null) {
              if (match[1]) {
                const attrName = match[1].toLowerCase().trim();
                if (!entityAttributes[entityName]) {
                  entityAttributes[entityName] = [];
                }
                
                // Handle attribute lists like "name, age, email"
                if (match[2] && match[2].includes(',')) {
                  const attributesList = match[2].split(/,|\band\b/).map(attr => attr.trim().toLowerCase());
                  attributesList.forEach(attr => {
                    if (attr && attr.length > 1 && 
                        !entityAttributes[entityName].includes(attr) && 
                        !["a", "an", "the", "and", "or", "with"].includes(attr)) {
                      entityAttributes[entityName].push(attr);
                    }
                  });
                }
                
                // Avoid adding the same attribute twice
                if (!entityAttributes[entityName].includes(attrName) && 
                    !["a", "an", "the", "and", "or", "with"].includes(attrName) &&
                    attrName.length > 1) {
                  entityAttributes[entityName].push(attrName);
                }
              }
            }
          });
          
          // Look for data type patterns
          dataTypePatterns.forEach(pattern => {
            let match;
            const patternClone = new RegExp(pattern.source, pattern.flags);
            while ((match = patternClone.exec(sentence)) !== null) {
              if (match[1] && match[2]) {
                const attrName = match[1].toLowerCase().trim();
                const dataType = match[2].toLowerCase().trim();
                
                if (!entityDataTypes[entityName]) {
                  entityDataTypes[entityName] = {};
                }
                
                // Map common data type expressions to SQL types
                let sqlType;
                if (['int', 'integer', 'number', 'count'].includes(dataType)) {
                  sqlType = 'INTEGER';
                } else if (['string', 'text', 'char', 'varchar'].includes(dataType)) {
                  sqlType = 'VARCHAR(255)';
                } else if (['datetime', 'timestamp', 'date', 'time'].includes(dataType)) {
                  sqlType = 'TIMESTAMP';
                } else if (['boolean', 'bool', 'flag'].includes(dataType)) {
                  sqlType = 'BOOLEAN';
                } else if (['decimal', 'float', 'double', 'price', 'money'].includes(dataType)) {
                  sqlType = 'DECIMAL(10,2)';
                } else {
                  // If unknown type, make a best guess
                  sqlType = 'VARCHAR(255)';
                }
                
                entityDataTypes[entityName][attrName] = sqlType;
              }
            }
          });
          
          // Look for constraint patterns
          constraintPatterns.forEach(pattern => {
            let match;
            const patternClone = new RegExp(pattern.source, pattern.flags);
            while ((match = patternClone.exec(sentence)) !== null) {
              if (match[1]) {
                const attrName = match[1].toLowerCase().trim();
                
                if (!entityConstraints[entityName]) {
                  entityConstraints[entityName] = {};
                }
                
                if (!entityConstraints[entityName][attrName]) {
                  entityConstraints[entityName][attrName] = [];
                }
                
                // Detect constraint types
                if (lowerSentence.includes('unique') || lowerSentence.includes('must be unique')) {
                  if (!entityConstraints[entityName][attrName].includes('UNIQUE')) {
                    entityConstraints[entityName][attrName].push('UNIQUE');
                  }
                }
                
                if (lowerSentence.includes('not null') || lowerSentence.includes('cannot be null') || 
                    lowerSentence.includes('required') || lowerSentence.includes('must have')) {
                  if (!entityConstraints[entityName][attrName].includes('NOT NULL')) {
                    entityConstraints[entityName][attrName].push('NOT NULL');
                  }
                }
                
                if (lowerSentence.includes('primary key')) {
                  if (!entityConstraints[entityName][attrName].includes('PRIMARY KEY')) {
                    entityConstraints[entityName][attrName].push('PRIMARY KEY');
                  }
                }
                
                // Default value detection (simple pattern)
                const defaultMatch = /default\s+(?:value|is|as)?\s+['"]?([^'"]+)['"]?/i.exec(lowerSentence);
                if (defaultMatch && defaultMatch[1]) {
                  entityConstraints[entityName][attrName].push(`DEFAULT: ${defaultMatch[1].trim()}`);
                }
              }
            }
          });
        }
      });
    });
    
    // Convert to entity objects with enhanced attributes, constraints, and data types
    const entities = Array.from(entitiesMap.values())
      .filter(entityInfo => entityInfo.count > 0) // Only include entities mentioned at least once
      .map(entityInfo => {
        const entityName = entityInfo.name.toLowerCase();
        const attributes = [
          {
            name: 'id',
            dataType: 'INTEGER',
            isPrimaryKey: true,
            isNullable: false,
            description: 'Primary key'
          }
        ];
        
        // Add common attributes only if we don't have extracted attributes that might serve the same purpose
        const hasNameLikeAttribute = entityAttributes[entityName] && 
          entityAttributes[entityName].some(attr => ['name', 'title', 'label'].includes(attr));
        
        if (!hasNameLikeAttribute) {
          attributes.push({
            name: 'name',
            dataType: 'VARCHAR(255)',
            isPrimaryKey: false,
            isNullable: false,
            description: `Name of the ${entityInfo.name}`
          });
        }
        
        // Add extracted attributes with enhanced properties
        if (entityAttributes[entityName]) {
          entityAttributes[entityName].forEach(attr => {
            // Skip if we already have this attribute
            if (!attributes.some(a => a.name === attr)) {
              // Determine data type with preference:
              // 1. From explicit data type mentions
              // 2. From data type inference based on attribute name
              let dataType = 'VARCHAR(255)'; // Default
              if (entityDataTypes[entityName] && entityDataTypes[entityName][attr]) {
                dataType = entityDataTypes[entityName][attr];
              } else {
                dataType = guessDataType(attr);
              }
              
              // Apply constraints
              const isPrimaryKey = entityConstraints && entityConstraints[entityName] && 
                                 entityConstraints[entityName][attr] && 
                                 entityConstraints[entityName][attr].includes('PRIMARY KEY');
                                 
                const isNullable = !(entityConstraints && entityConstraints[entityName] && 
                                 entityConstraints[entityName][attr] && 
                                 entityConstraints[entityName][attr].includes('NOT NULL'));              const isUnique = entityConstraints && entityConstraints[entityName] && 
                              entityConstraints[entityName][attr] && 
                              entityConstraints[entityName][attr].includes('UNIQUE');
                              
              // Check for default value
              let defaultValue = null;
              if (entityConstraints && entityConstraints[entityName] && entityConstraints[entityName][attr]) {
                const defaultConstraint = entityConstraints[entityName][attr].find(c => c.startsWith('DEFAULT:'));
                if (defaultConstraint) {
                  defaultValue = defaultConstraint.substring(8).trim();
                }
              }
              
              const attributeObj = {
                name: attr,
                dataType: dataType,
                isPrimaryKey: isPrimaryKey,
                isNullable: isNullable,
                description: `${toTitleCase(attr)} of the ${entityInfo.name}`
              };
              
              if (isUnique) {
                attributeObj.isUnique = true;
              }
              
              if (defaultValue) {
                attributeObj.defaultValue = defaultValue;
              }
              
              attributes.push(attributeObj);
            }
          });
        }
        
        // Add timestamps if they're not already added
        if (!attributes.some(a => a.name === 'created_at')) {
          attributes.push({
            name: 'created_at',
            dataType: 'TIMESTAMP',
            isPrimaryKey: false,
            isNullable: false,
            defaultValue: 'CURRENT_TIMESTAMP',
            description: 'Creation timestamp'
          });
        }
        
        if (!attributes.some(a => a.name === 'updated_at')) {
          attributes.push({
            name: 'updated_at',
            dataType: 'TIMESTAMP',
            isPrimaryKey: false,
            isNullable: false,
            defaultValue: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            description: 'Last update timestamp'
          });
        }
        
        return {
          name: entityInfo.name,
          attributes,
          description: `Entity representing ${entityInfo.name} in the system`
        };
      });
    
    // Extract potential relationships using pattern matching and sentence analysis
    const relationships = [];
    const relationshipMap = new Map(); // To prevent duplicate relationships
    
    // Process relationship patterns from sentences with enhanced detection
    sentences.forEach(sentence => {
      // Convert to lowercase for case-insensitive matching
      const lowerSentence = sentence.toLowerCase();
      const originalSentence = sentence.trim();
      
      // Process weak entity patterns
      weakEntityPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(lowerSentence)) !== null) {
          if (match[1] && match[2]) {
            const weakEntityName = match[1].toLowerCase().trim();
            const strongEntityName = match[2].toLowerCase().trim();
            
            // Add weak entity if it's not already in the entities list
            const weakEntity = entities.find(e => 
              e.name.toLowerCase() === weakEntityName || 
              e.name.toLowerCase() === (weakEntityName.endsWith('s') ? weakEntityName.slice(0, -1) : weakEntityName + 's')
            );
            
            const strongEntity = entities.find(e => 
              e.name.toLowerCase() === strongEntityName || 
              e.name.toLowerCase() === (strongEntityName.endsWith('s') ? strongEntityName.slice(0, -1) : strongEntityName + 's')
            );
            
            // If both entities exist, set up the identification dependency (weak entity relationship)
            if (weakEntity && strongEntity) {
              const relationKey = `${weakEntity.name}-${strongEntity.name}-weak`;
              
              if (!relationshipMap.has(relationKey)) {
                relationshipMap.set(relationKey, {
                  sourceEntity: weakEntity.name,
                  targetEntity: strongEntity.name,
                  type: 'IDENTIFYING_RELATIONSHIP',
                  isWeak: true,
                  description: `${weakEntity.name} is a weak entity that depends on ${strongEntity.name}`
                });
                
                // Also add a foreign key to the weak entity referencing the strong entity
                const fkAttribute = {
                  name: `${strongEntity.name.toLowerCase()}_id`,
                  dataType: 'INTEGER',
                  isPrimaryKey: true, // Part of composite key for weak entity
                  isNullable: false,
                  isForeignKey: true,
                  references: {
                    entity: strongEntity.name,
                    attribute: 'id'
                  },
                  description: `Reference to ${strongEntity.name} (part of primary key)`
                };
                
                // Add the foreign key if it doesn't exist already
                const entityIndex = entities.findIndex(e => e.name === weakEntity.name);
                if (entityIndex >= 0) {
                  const hasFK = entities[entityIndex].attributes.some(attr => 
                    attr.name === fkAttribute.name
                  );
                  
                  if (!hasFK) {
                    entities[entityIndex].attributes.push(fkAttribute);
                  }
                }
              }
            }
          }
        }
      });
      
      // Process standard relationship patterns
      relationshipPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(lowerSentence)) !== null) {
          if (match[1] && match[2]) {
            const sourceName = match[1].toLowerCase().trim();
            const targetName = match[2].toLowerCase().trim();
            
            // Find corresponding entities
            const sourceEntity = entities.find(e => 
              e.name.toLowerCase() === sourceName || 
              e.name.toLowerCase() === (sourceName.endsWith('s') ? sourceName.slice(0, -1) : sourceName + 's')
            );
            
            const targetEntity = entities.find(e => 
              e.name.toLowerCase() === targetName ||
              e.name.toLowerCase() === (targetName.endsWith('s') ? targetName.slice(0, -1) : targetName + 's')
            );
            
            if (sourceEntity && targetEntity && sourceEntity.name !== targetEntity.name) {
              // Determine relationship type based on patterns in the sentence
              let relationType = 'ONE_TO_MANY'; // Default
              let participationType = null;
              
              // Check for cardinality clues
              cardinalityPatterns.forEach(cardPattern => {
                const cardMatchRegex = new RegExp(cardPattern.regex.source, 'i');
                const cardMatch = cardMatchRegex.exec(lowerSentence);
                if (cardMatch && 
                   ((cardMatch[1] && cardMatch[1].toLowerCase().includes(sourceName) && cardMatch[2] && cardMatch[2].toLowerCase().includes(targetName)) || 
                    (cardMatch[1] && cardMatch[1].toLowerCase().includes(targetName) && cardMatch[2] && cardMatch[2].toLowerCase().includes(sourceName)))) {
                  relationType = cardPattern.type;
                }
              });
              
              // Check for participation constraints
              participationConstraintPatterns.forEach(partPattern => {
                const partMatchRegex = new RegExp(partPattern.regex.source, 'i');
                const partMatch = partMatchRegex.exec(lowerSentence);
                if (partMatch && 
                   ((partMatch[1] && partMatch[1].toLowerCase().includes(sourceName) && partMatch[2] && partMatch[2].toLowerCase().includes(targetName)) || 
                    (partMatch[1] && partMatch[1].toLowerCase().includes(targetName) && partMatch[2] && partMatch[2].toLowerCase().includes(sourceName)))) {
                  participationType = partPattern.type;
                }
              });
              
              // Additional checks for specific relationship types based on keywords
              if (lowerSentence.includes('multiple') && lowerSentence.includes('many')) {
                relationType = 'MANY_TO_MANY';
              } else if (lowerSentence.includes('belongs to') || lowerSentence.includes('owned by')) {
                relationType = 'MANY_TO_ONE';
              } else if (lowerSentence.includes('has one') || lowerSentence.includes('has a single') || 
                        lowerSentence.includes('exactly one')) {
                relationType = 'ONE_TO_ONE';
              } else if (lowerSentence.includes('has many') || lowerSentence.includes('have multiple') || 
                        lowerSentence.includes('can have several')) {
                relationType = 'ONE_TO_MANY';
              }
              
              // Create unique key for the relationship
              const relationKey = `${sourceEntity.name}-${targetEntity.name}`;
              
              if (!relationshipMap.has(relationKey)) {
                const relationship = {
                  sourceEntity: sourceEntity.name,
                  targetEntity: targetEntity.name,
                  type: relationType,
                  description: extractRelationshipDescription(originalSentence, sourceEntity.name, targetEntity.name)
                };
                
                // Add participation constraint if detected
                if (participationType) {
                  relationship.participationType = participationType;
                }
                
                relationshipMap.set(relationKey, relationship);
                
                // For many-to-many relationships, suggest a junction table
                if (relationType === 'MANY_TO_MANY') {
                  const junctionTableName = `${sourceEntity.name}_${targetEntity.name}`;
                  
                  // Create a junction entity if it doesn't exist
                  if (!entities.some(e => e.name === junctionTableName)) {
                    const junctionEntity = {
                      name: junctionTableName,
                      attributes: [
                        {
                          name: 'id',
                          dataType: 'INTEGER',
                          isPrimaryKey: true,
                          isNullable: false,
                          description: 'Primary key'
                        },
                        {
                          name: `${sourceEntity.name.toLowerCase()}_id`,
                          dataType: 'INTEGER',
                          isPrimaryKey: false,
                          isNullable: false,
                          isForeignKey: true,
                          references: {
                            entity: sourceEntity.name,
                            attribute: 'id'
                          },
                          description: `Reference to ${sourceEntity.name}`
                        },
                        {
                          name: `${targetEntity.name.toLowerCase()}_id`,
                          dataType: 'INTEGER',
                          isPrimaryKey: false,
                          isNullable: false,
                          isForeignKey: true,
                          references: {
                            entity: targetEntity.name,
                            attribute: 'id'
                          },
                          description: `Reference to ${targetEntity.name}`
                        },
                        {
                          name: 'created_at',
                          dataType: 'TIMESTAMP',
                          isPrimaryKey: false,
                          isNullable: false,
                          defaultValue: 'CURRENT_TIMESTAMP',
                          description: 'Creation timestamp'
                        }
                      ],
                      isJunctionTable: true,
                      description: `Junction table connecting ${sourceEntity.name} and ${targetEntity.name}`
                    };
                    
                    entities.push(junctionEntity);
                  }
                }
              }
            }
          }
        }
      });
      
      // If no specific patterns match, try entity co-occurrence approach
      const mentionedEntities = entities.filter(entity => 
        lowerSentence.includes(entity.name.toLowerCase())
      );
      
      // If we find multiple entities in one sentence, they might be related
      if (mentionedEntities.length >= 2) {
        for (let i = 0; i < mentionedEntities.length; i++) {
          for (let j = i + 1; j < mentionedEntities.length; j++) {
            const sourceEntity = mentionedEntities[i];
            const targetEntity = mentionedEntities[j];
            
            // Create unique key for the relationship
            const relationKey = `${sourceEntity.name}-${targetEntity.name}`;
            
            if (!relationshipMap.has(relationKey)) {
              // Try to determine the relationship type from sentence
              let relationType = inferRelationshipType(lowerSentence, sourceEntity.name.toLowerCase(), targetEntity.name.toLowerCase());
              
              relationshipMap.set(relationKey, {
                sourceEntity: sourceEntity.name,
                targetEntity: targetEntity.name,
                type: relationType,
                description: extractRelationshipDescription(originalSentence, sourceEntity.name, targetEntity.name)
              });
            }
          }
        }
      }
    });
    
    // Convert the Map to an array of relationships
    relationships.push(...Array.from(relationshipMap.values()));
    
    logger.info('Enhanced NLP entity extraction completed', { 
      entityCount: entities.length,
      relationshipCount: relationships.length
    });
    
    // Return the extracted entities and relationships in a structured format
    // similar to the AI response format for consistency
    return {
      entities,
      relationships,
      // Add placeholder for inheritance to match AI response structure
      inheritance: []
    };
    
    return { entities, relationships };
  } catch (error) {
    logger.error('Error in basic NLP processing:', error);
    return fallbackEntityExtraction(text);
  }
}

/**
 * Fallback function for entity extraction when POS tagging fails
 * @param {string} text - The input text
 * @returns {Object} - Extracted entities and relationships
 */
function fallbackEntityExtraction(text) {
  logger.info('Using fallback entity extraction method');
  
  // Simple approach: split by spaces and filter common words
  const stopwords = ['a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'in', 'on', 'at', 'to', 'of'];
  const tokens = text.split(/\s+/).filter(word => 
    word.length > 3 && !stopwords.includes(word.toLowerCase())
  );
  
  // Find nouns by looking for common database entities in the text
  const commonDbEntities = ['user', 'product', 'order', 'customer', 'account', 'category', 'profile', 'item', 'invoice', 'payment', 'address', 'comment', 'review', 'post', 'image', 'tag', 'transaction'];
  
  // Extract potential entities from text
  const potentialEntities = [];
  commonDbEntities.forEach(entity => {
    if (text.toLowerCase().includes(entity)) {
      potentialEntities.push(entity);
    }
  });
  
  // Add capitalized words from tokens as potential entities
  tokens.forEach(token => {
    if (token.charAt(0) === token.charAt(0).toUpperCase()) {
      potentialEntities.push(token);
    }
  });
  
  const uniqueEntities = [...new Set(potentialEntities)];
  
  // Create entity objects
  const entities = uniqueEntities.map(noun => ({
    name: toTitleCase(noun),
    attributes: [
      {
        name: 'id',
        dataType: 'INTEGER',
        isPrimaryKey: true,
        isNullable: false,
        description: 'Primary key'
      },
      {
        name: 'name',
        dataType: 'VARCHAR(255)',
        isPrimaryKey: false,
        isNullable: false,
        description: 'Name field'
      },
      {
        name: 'created_at',
        dataType: 'TIMESTAMP',
        isPrimaryKey: false,
        isNullable: false,
        defaultValue: 'CURRENT_TIMESTAMP',
        description: 'Creation timestamp'
      }
    ]
  }));
  
  // Create basic relationships
  const relationships = [];
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      relationships.push({
        sourceEntity: entities[i].name,
        targetEntity: entities[j].name,
        type: 'ONE_TO_MANY',
        description: `Relationship between ${entities[i].name} and ${entities[j].name}`
      });
    }
  }
  
  logger.info('Fallback entity extraction completed', { 
    entityCount: entities.length,
    relationshipCount: relationships.length
  });
  
  return { entities, relationships };
}

/**
 * Helper function to convert string to Title Case
 * @param {string} str - Input string
 * @returns {string} - Title cased string
 */
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

/**
 * Extract meaningful description for a relationship from a sentence
 * @param {string} sentence - The sentence containing relationship information
 * @param {string} sourceEntity - The source entity name
 * @param {string} targetEntity - The target entity name
 * @returns {string} - A description of the relationship
 */
function extractRelationshipDescription(sentence, sourceEntity, targetEntity) {
  // Clean the sentence by removing extra spaces and lowercasing
  const cleanedSentence = sentence.trim().toLowerCase();
  const sourceLower = sourceEntity.toLowerCase();
  const targetLower = targetEntity.toLowerCase();
  
  // Look for common relationship verbs in the sentence
  const relationshipVerbs = [
    'has', 'have', 'contains', 'owns', 'belongs to', 'relates to', 
    'is linked to', 'is associated with', 'references', 'depends on'
  ];
  
  // Check if any relationship verb is in the sentence
  for (const verb of relationshipVerbs) {
    // Check for patterns like "User has many Posts"
    const pattern1 = new RegExp(`${sourceLower}s?\\s+${verb}\\s+\\w+\\s*${targetLower}s?`, 'i');
    // Check for patterns like "Posts belong to User"
    const pattern2 = new RegExp(`${targetLower}s?\\s+${verb}\\s+\\w*\\s*${sourceLower}s?`, 'i');
    
    if (pattern1.test(cleanedSentence)) {
      return `${toTitleCase(sourceEntity)} ${verb} ${toTitleCase(targetEntity)}`;
    } else if (pattern2.test(cleanedSentence)) {
      return `${toTitleCase(targetEntity)} ${verb} ${toTitleCase(sourceEntity)}`;
    }
  }
  
  // If no specific pattern is found, return a generic description
  return `Relationship between ${toTitleCase(sourceEntity)} and ${toTitleCase(targetEntity)}`;
}

/**
 * Infer relationship type based on sentence context
 * @param {string} sentence - The sentence to analyze
 * @param {string} sourceEntity - The source entity name
 * @param {string} targetEntity - The target entity name
 * @returns {string} - Relationship type (ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE, MANY_TO_MANY)
 */
function inferRelationshipType(sentence, sourceEntity, targetEntity) {
  // Look for many-to-many indicators
  if (sentence.includes('many-to-many') || 
      (sentence.includes('many') && sentence.includes('multiple') && 
       sentence.includes(sourceEntity) && sentence.includes(targetEntity))) {
    return 'MANY_TO_MANY';
  }
  
  // Look for one-to-one indicators
  if (sentence.includes('one-to-one') || 
      sentence.includes(`each ${sourceEntity} has exactly one ${targetEntity}`) || 
      sentence.includes(`each ${targetEntity} has exactly one ${sourceEntity}`)) {
    return 'ONE_TO_ONE';
  }
  
  // Look for many-to-one indicators
  if (sentence.includes(`${sourceEntity}s belong to one ${targetEntity}`) || 
      sentence.includes(`multiple ${sourceEntity}s per ${targetEntity}`) ||
      sentence.includes(`${targetEntity} has many ${sourceEntity}s`)) {
    return 'MANY_TO_ONE';
  }
  
  // Look for one-to-many indicators
  if (sentence.includes(`${sourceEntity} has many ${targetEntity}s`) || 
      sentence.includes(`one ${sourceEntity} to multiple ${targetEntity}s`) ||
      sentence.includes(`${sourceEntity} contains multiple ${targetEntity}s`)) {
    return 'ONE_TO_MANY';
  }
  
  // Default to ONE_TO_MANY as most common relationship
  return 'ONE_TO_MANY';
}

/**
 * Guess appropriate data type for an attribute name
 * @param {string} attributeName - The name of the attribute
 * @returns {string} - The guessed SQL data type
 */
function guessDataType(attributeName) {
  // Common patterns for data types
  const patterns = [
    { regex: /id$/i, type: 'INTEGER' },
    { regex: /^is|^has|^can|^should|active|enabled|status$/i, type: 'BOOLEAN' },
    { regex: /date|time|created_at|updated_at|timestamp$/i, type: 'TIMESTAMP' },
    { regex: /price|cost|amount|total|balance|money|salary$/i, type: 'DECIMAL(10,2)' },
    { regex: /count|quantity|number|age|year|rating|score$/i, type: 'INTEGER' },
    { regex: /email$/i, type: 'VARCHAR(255)' },
    { regex: /phone|mobile|fax$/i, type: 'VARCHAR(20)' },
    { regex: /description|content|comment|text|message|bio$/i, type: 'TEXT' },
    { regex: /url|link|website|image$/i, type: 'VARCHAR(512)' },
    { regex: /zipcode|postal|postcode$/i, type: 'VARCHAR(10)' },
    { regex: /password|hash$/i, type: 'VARCHAR(255)' }
  ];
  
  // Check if attribute name matches any pattern
  for (const pattern of patterns) {
    if (pattern.regex.test(attributeName)) {
      return pattern.type;
    }
  }
  
  // Default to VARCHAR
  return 'VARCHAR(255)';
}

module.exports = exports;
