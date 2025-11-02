/**
 * Mermaid Query Generator Service
 * Converts natural language questions into Mermaid ER Diagram code based on database schema
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class MermaidQueryGeneratorService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-exp';
    this.genAI = null;
    this.model = null;
    this.initialize();
  }

  initialize() {
    if (this.isInitialized()) {
      logger.info('Mermaid Query Generator Service already initialized.');
      return;
    }
    
    if (!this.apiKey) {
      logger.error('GEMINI_API_KEY is not set in environment variables. Mermaid Query Generator Service will not function.');
      return;
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
      logger.info(`Mermaid Query Generator Service initialized successfully with model: ${this.modelName}`);
    } catch (error) {
      logger.error('Failed to initialize Mermaid Query Generator Service', { error: error.message });
      this.model = null;
    }
  }

  isInitialized() {
    return !!this.model;
  }

  /**
   * Build a schema context string for the AI prompt
   */
  buildSchemaContext(schema) {
    if (!schema || !schema.tables) {
      return 'No schema available.';
    }

    let context = `Database Schema:\n\n`;
    
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
   * Extract Mermaid code from AI response
   */
  extractMermaidCode(text) {
    if (!text) return '';
    
    // Try to extract from code blocks
    const mermaidBlockRegex = /```(?:mermaid)?\s*(erDiagram[\s\S]*?)```/i;
    const match = text.match(mermaidBlockRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Check if the entire response is Mermaid code
    if (text.trim().startsWith('erDiagram')) {
      return text.trim();
    }
    
    logger.warn('Could not extract Mermaid code from response.', { responsePrefix: text.substring(0, 100) });
    return text.trim();
  }

  /**
   * Generate Mermaid ER Diagram code from natural language question
   */
  async generateMermaidQuery(question, schema) {
    if (!this.isInitialized()) {
      this.initialize();
      if (!this.isInitialized()) {
        return {
          success: false,
          error: 'Mermaid Query Generator Service is not initialized. Please check your GEMINI_API_KEY.',
          mermaidCode: null,
          explanation: null
        };
      }
    }

    try {
      logger.info('Generating Mermaid ER diagram from natural language', { 
        questionLength: question.length,
        tableCount: schema.tables ? schema.tables.length : 0
      });

      const schemaContext = this.buildSchemaContext(schema);
      
      const prompt = `You are an expert database architect and Mermaid ER diagram specialist.

${schemaContext}

User Question: "${question}"

Based on the database schema above and the user's question, generate a Mermaid ER diagram that visualizes the relevant parts of the schema to answer or illustrate the question.

IMPORTANT INSTRUCTIONS:
1. Generate ONLY valid Mermaid erDiagram syntax
2. Start with "erDiagram" on the first line
3. Include only tables and relationships relevant to the user's question
4. Use proper Mermaid syntax for relationships: ||--||, ||--o{, }o--||, etc.
5. Include attribute types where relevant
6. Add comments in the diagram to explain the query context
7. Make the diagram clear and easy to understand
8. If the question asks about specific tables or relationships, focus on those

Format your response EXACTLY as follows:
\`\`\`mermaid
erDiagram
    [Your Mermaid ER diagram code here]
\`\`\`

EXPLANATION:
[A brief explanation of what the diagram shows and how it relates to the user's question]

Generate the Mermaid ER diagram now:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logger.info('Mermaid query generated successfully', { responseLength: text.length });

      // Extract Mermaid code
      const mermaidCode = this.extractMermaidCode(text);

      if (!mermaidCode || !mermaidCode.startsWith('erDiagram')) {
        logger.warn('Generated response does not contain valid Mermaid ER diagram', { text: text.substring(0, 200) });
        return {
          success: false,
          error: 'Failed to generate valid Mermaid ER diagram code',
          mermaidCode: null,
          explanation: null
        };
      }

      // Extract explanation
      let explanation = '';
      const explanationMatch = text.match(/EXPLANATION:\s*([\s\S]+?)(?:```|$)/i);
      if (explanationMatch && explanationMatch[1]) {
        explanation = explanationMatch[1].trim();
      }

      return {
        success: true,
        mermaidCode: mermaidCode,
        explanation: explanation || 'This diagram visualizes the relevant parts of your database schema.',
        error: null
      };

    } catch (error) {
      logger.error('Error generating Mermaid query', {
        error: error.message,
        stack: error.stack,
        question: question.substring(0, 100)
      });

      return {
        success: false,
        error: 'An error occurred while generating the Mermaid diagram: ' + error.message,
        mermaidCode: null,
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

    // Generic examples
    examples.push('Show me the complete database structure');
    examples.push('Visualize all table relationships');

    // Table-specific examples
    if (tables.length > 0) {
      const firstTable = tables[0];
      examples.push(`Show me the ${firstTable.name} table and its relationships`);
    }

    if (tables.length > 1) {
      const secondTable = tables[1];
      examples.push(`How are ${tables[0].name} and ${secondTable.name} related?`);
    }

    // Relationship examples
    if (schema.relationships && schema.relationships.length > 0) {
      const rel = schema.relationships[0];
      examples.push(`Diagram the relationship between ${rel.fromTable} and ${rel.toTable}`);
    }

    // Find tables with many columns (likely important entities)
    const largeTable = tables.find(t => t.columns && t.columns.length > 5);
    if (largeTable) {
      examples.push(`Show me all attributes of ${largeTable.name}`);
    }

    return examples.slice(0, 6); // Return max 6 examples
  }
}

module.exports = new MermaidQueryGeneratorService();
