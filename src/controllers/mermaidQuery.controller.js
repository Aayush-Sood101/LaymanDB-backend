/**
 * Mermaid Query Controller
 * Handles natural language to Mermaid ER Diagram generation
 */

const mermaidQueryGeneratorService = require('../services/mermaidQueryGenerator.service');
const logger = require('../utils/logger');

/**
 * Generate Mermaid ER diagram from natural language question
 * POST /api/mermaid-query/generate
 */
exports.generateMermaidQuery = async (req, res) => {
  try {
    const { question, schema } = req.body;

    // Validate input
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Question is required and must be a non-empty string'
      });
    }

    if (!schema || !schema.tables) {
      return res.status(400).json({
        success: false,
        error: 'Valid schema is required with tables array'
      });
    }

    logger.info('Mermaid query generation request received', {
      questionLength: question.length,
      tableCount: schema.tables.length,
      schemaName: schema.name || 'unnamed'
    });

    // Generate the Mermaid diagram
    const result = await mermaidQueryGeneratorService.generateMermaidQuery(
      question.trim(),
      schema
    );

    if (!result.success) {
      logger.warn('Mermaid query generation failed', { error: result.error });
      return res.status(500).json(result);
    }

    logger.info('Mermaid query generated successfully');
    return res.status(200).json(result);

  } catch (error) {
    logger.error('Error in generateMermaidQuery controller:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while generating the Mermaid diagram',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate example questions based on schema
 * POST /api/mermaid-query/examples
 */
exports.getExampleQuestions = async (req, res) => {
  try {
    const { schema } = req.body;

    if (!schema || !schema.tables) {
      return res.status(400).json({
        success: false,
        error: 'Valid schema is required with tables array'
      });
    }

    logger.info('Example questions request received', {
      tableCount: schema.tables.length,
      schemaName: schema.name || 'unnamed'
    });

    const examples = mermaidQueryGeneratorService.generateExampleQuestions(schema);

    return res.status(200).json({
      success: true,
      examples: examples
    });

  } catch (error) {
    logger.error('Error in getExampleQuestions controller:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while generating example questions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
