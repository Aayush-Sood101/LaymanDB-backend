/**
 * Query Generator Service
 * Converts natural language questions into SQL queries based on database schema
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const { format } = require('sql-formatter');

class QueryGeneratorService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
    this.genAI = null;
    this.model = null;
    this.initialize();
  }

  initialize() {
    if (this.isInitialized()) {
      logger.info('Query Generator Service already initialized.');
      return;
    }
    
    if (!this.apiKey) {
      logger.error('GEMINI_API_KEY is not set in environment variables. Query Generator Service will not function.');
      return;
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
      logger.info(`Query Generator Service initialized successfully with model: ${this.modelName}`);
    } catch (error) {
      logger.error('Failed to initialize Query Generator Service', { error: error.message });
      this.model = null;
    }
  }

  isInitialized() {
    return !!this.model;
  }

  /**
   * Build a schema context string for the AI prompt
   */
  buildSchemaContext(schema, dialect = 'mysql') {
    if (!schema || !schema.tables) {
      return 'No schema available.';
    }

    let context = `Database Schema (${dialect.toUpperCase()}):\n\n`;
    
    schema.tables.forEach(table => {
      context += `Table: ${table.name}\n`;
      
      if (table.description) {
        context += `Description: ${table.description}\n`;
      }
      
      context += 'Columns:\n';
      table.columns.forEach(column => {
        const constraints = [];
        if (column.isPrimaryKey) constraints.push('PRIMARY KEY');
        if (column.isForeignKey) constraints.push('FOREIGN KEY');
        if (column.isUnique) constraints.push('UNIQUE');
        if (!column.isNullable) constraints.push('NOT NULL');
        
        const constraintStr = constraints.length > 0 ? ` (${constraints.join(', ')})` : '';
        context += `  - ${column.name}: ${column.dataType}${constraintStr}`;
        
        if (column.description) {
          context += ` - ${column.description}`;
        }
        context += '\n';
      });
      
      context += '\n';
    });
    
    // Add relationships information
    if (schema.relationships && schema.relationships.length > 0) {
      context += 'Relationships:\n';
      schema.relationships.forEach(rel => {
        context += `  - ${rel.fromTable} ${rel.type} ${rel.toTable}`;
        if (rel.description) {
          context += ` (${rel.description})`;
        }
        context += '\n';
      });
      context += '\n';
    }
    
    return context;
  }

  /**
   * Extract SQL from AI response
   */
  extractSQL(text) {
    if (!text) return '';
    
    // Try to extract from code blocks
    const sqlBlockRegex = /```(?:sql)?\s*([\s\S]*?)```/i;
    const match = text.match(sqlBlockRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // If no code block, check if the entire response looks like SQL
    const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b/i;
    if (sqlKeywords.test(text)) {
      return text.trim();
    }
    
    logger.warn('Could not extract SQL from response.', { responsePrefix: text.substring(0, 100) });
    return text.trim();
  }

  /**
   * Generate SQL query from natural language question
   */
  async generateQuery(question, schema, dialect = 'mysql') {
    if (!this.isInitialized()) {
      this.initialize();
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'Query Generator Service is not initialized. Please check your GEMINI_API_KEY.',
          sql: null,
          explanation: null
        };
      }
    }

    try {
      logger.info('Generating SQL query from natural language', { 
        questionLength: question.length,
        dialect,
        schemaName: schema?.name || 'unknown'
      });

      const schemaContext = this.buildSchemaContext(schema, dialect);
      
      const systemPrompt = `You are an expert SQL query generator. Given a database schema and a natural language question, generate an accurate, efficient SQL query.

Important guidelines:
1. Return ONLY valid ${dialect.toUpperCase()} SQL syntax
2. Use proper JOINs when querying multiple tables
3. Follow ${dialect.toUpperCase()} conventions for data types and functions
4. Include appropriate WHERE clauses, GROUP BY, ORDER BY as needed
5. Add a brief comment at the top explaining what the query does
6. Optimize for readability and performance
7. Use table and column names exactly as they appear in the schema
8. If the question is ambiguous or cannot be answered with the given schema, explain why in a comment

Format your response as:
1. SQL query (in a code block)
2. Brief explanation of the query logic`;

      const userPrompt = `${schemaContext}

Natural Language Question:
${question}

Generate the ${dialect.toUpperCase()} query:`;

      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt}\n\n---\n\n${userPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2, // Lower temperature for more deterministic SQL
          maxOutputTokens: 2048,
          responseMimeType: 'text/plain',
        }
      });

      const response = await result.response;
      const rawText = response.text();
      
      // Extract SQL and explanation
      let sql = this.extractSQL(rawText);
      
      // Try to format the SQL
      try {
        sql = format(sql, {
          language: dialect === 'sqlserver' ? 'tsql' : dialect,
          indent: '  ',
          uppercase: true,
          linesBetweenQueries: 2,
        });
      } catch (formatError) {
        logger.warn('Could not format SQL, returning unformatted', { error: formatError.message });
      }

      // Extract explanation (everything after the SQL block)
      let explanation = rawText;
      const sqlBlockMatch = rawText.match(/```(?:sql)?\s*([\s\S]*?)```\s*([\s\S]*)/i);
      if (sqlBlockMatch && sqlBlockMatch[2]) {
        explanation = sqlBlockMatch[2].trim();
      } else {
        // If no clear separation, use a generic explanation
        explanation = 'SQL query generated based on your question.';
      }

      if (!sql) {
        logger.error('Generated response does not contain valid SQL', { response: rawText });
        return {
          success: false,
          error: 'Could not generate valid SQL from your question. Please try rephrasing.',
          sql: null,
          explanation: null
        };
      }

      logger.info('Successfully generated SQL query', { 
        sqlLength: sql.length,
        explanationLength: explanation.length
      });

      return {
        success: true,
        error: null,
        sql,
        explanation,
        dialect
      };
    } catch (error) {
      logger.error('Error generating SQL query', { error: error.message });
      
      const clientError = error.message.includes('API key') 
        ? 'An authentication error occurred. Please check the server configuration.'
        : `Failed to generate query: ${error.message}`;
      
      return {
        success: false,
        error: clientError,
        sql: null,
        explanation: null
      };
    }
  }

  /**
   * Generate example questions based on schema
   */
  generateExampleQuestions(schema) {
    if (!schema || !schema.tables || schema.tables.length === 0) {
      return [];
    }

    const examples = [];
    const tables = schema.tables;

    // Simple SELECT examples
    if (tables.length > 0) {
      const firstTable = tables[0];
      examples.push(`Show me all records from ${firstTable.name}`);
      
      const dateColumn = firstTable.columns.find(col => 
        col.dataType.toLowerCase().includes('date') || 
        col.dataType.toLowerCase().includes('timestamp')
      );
      
      if (dateColumn) {
        examples.push(`Show me ${firstTable.name} created in the last 30 days`);
      }
    }

    // JOIN examples based on relationships
    if (schema.relationships && schema.relationships.length > 0) {
      const firstRel = schema.relationships[0];
      examples.push(`Show me all ${firstRel.fromTable} with their related ${firstRel.toTable}`);
    }

    // COUNT/GROUP BY examples
    if (tables.length > 1) {
      examples.push(`Count the number of records in each table`);
    }

    // Specific column examples
    tables.forEach(table => {
      const nameColumn = table.columns.find(col => 
        col.name.toLowerCase().includes('name') || 
        col.name.toLowerCase().includes('title')
      );
      
      if (nameColumn && examples.length < 8) {
        examples.push(`Find ${table.name} where ${nameColumn.name} contains a specific keyword`);
      }
    });

    return examples.slice(0, 6); // Return max 6 examples
  }
}

module.exports = new QueryGeneratorService();
