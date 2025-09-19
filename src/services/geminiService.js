/**
 * Google Gemini Service
 * Interacts with Google Gemini 2.5 Flash model to generate Mermaid ER diagrams
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    // Initialize the Google Generative AI client
    this.modelName = 'gemini-2.5-flash';
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = null;
    this.model = null;

    // System prompt for generating Mermaid ER diagrams
    this.systemPrompt = `
You are a database schema designer specialized in creating Entity-Relationship diagrams using Mermaid syntax.

Given a plain English description of a database, your task is to:
1. Identify the entities (tables)
2. Identify attributes for each entity (columns)
3. Identify relationships between entities
4. Output a valid Mermaid ER diagram code

IMPORTANT RULES:
- ONLY respond with valid Mermaid syntax that can be directly rendered
- ALWAYS use the erDiagram declaration
- ALWAYS follow proper Mermaid ER diagram syntax for entities, attributes, and relationships
- DO NOT include any explanations, notes, or non-Mermaid content in your response
- Ensure cardinality notations are valid: ||--||, ||--o{, }o--||, }o--o{, etc.
- Use PK for primary keys and FK for foreign keys
- Only use the following data types: string, number, date, boolean

Example of valid output:

erDiagram
    customer {
        string id PK
        string name
        string email
        date created_at
    }
    
    order {
        string id PK
        string customer_id FK
        number total_amount
        date order_date
        string status
    }
    
    customer ||--o{ order : places
`;
    
    // Try to initialize on construction
    this.initialize();
  }

  /**
   * Initialize the Gemini client and model
   * @returns {Boolean} - Whether initialization was successful
   */
  initialize() {
    try {
      if (!this.apiKey) {
        logger.error('GEMINI_API_KEY is not set in environment variables');
        return false;
      }

      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
      logger.info('Gemini Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Gemini Service', { error: error.message });
      return false;
    }
  }
  
  /**
   * Extract only the Mermaid ER diagram code from a response
   * @param {String} text - The text response from the model
   * @returns {String} - The extracted Mermaid code
   */
  extractMermaidCode(text) {
    if (!text) return '';
    
    // Look for erDiagram declaration
    const erDiagramIndex = text.indexOf('erDiagram');
    if (erDiagramIndex === -1) {
      logger.warn('No erDiagram declaration found in response');
      return text; // Return the whole thing if we can't find erDiagram
    }
    
    // Return from erDiagram to the end
    return text.substring(erDiagramIndex).trim();
  }

  /**
   * Generate a Mermaid ER diagram from a text description
   * @param {String} textInput - The text description of the database schema
   * @returns {Promise<Object>} - Object containing the generated Mermaid code and status
   */
  async generateERDiagram(textInput) {
    if (!this.model) {
      const initialized = this.initialize();
      if (!initialized) {
        return {
          success: false,
          error: 'Gemini Service not initialized. Check API key configuration.',
          mermaidCode: null
        };
      }
    }

    try {
      logger.info('Generating ER diagram with Gemini', { inputLength: textInput.length });
      
      // For Gemini 2.5, we'll use a simpler approach without systemInstruction
      // Instead, we'll include the system prompt as part of the user prompt
      const fullPrompt = `${this.systemPrompt.trim()}\n\nHere is the database I want you to create a Mermaid ER diagram for:\n\n${textInput}`;
      
      const result = await this.model.generateContent(fullPrompt, {
        temperature: 0.2, // Lower temperature for more deterministic outputs
        maxOutputTokens: 8192, // Allow for larger diagrams
      });
      
      const response = await result.response;
      let mermaidCode = response.text();
      
      // Extract just the Mermaid code
      mermaidCode = this.extractMermaidCode(mermaidCode);
      
      if (!mermaidCode.startsWith('erDiagram')) {
        logger.warn('Generated content does not start with erDiagram', { content: mermaidCode.substring(0, 100) });
        return {
          success: false,
          error: 'Generated content is not a valid Mermaid ER diagram',
          mermaidCode: null
        };
      }
      
      logger.info('Successfully generated ER diagram with Gemini', { outputLength: mermaidCode.length });
      
      return {
        success: true,
        error: null,
        mermaidCode
      };
    } catch (error) {
      logger.error('Error generating ER diagram with Gemini', { error: error.message });
      return {
        success: false,
        error: `Failed to generate diagram: ${error.message}`,
        mermaidCode: null
      };
    }
  }
}

module.exports = new GeminiService();