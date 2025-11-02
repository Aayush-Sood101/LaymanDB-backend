/**
 * Query Controller
 * Handles natural language to SQL query generation
 */

const queryGeneratorService = require('../services/queryGenerator.service');
const logger = require('../utils/logger');

/**
 * Generate SQL query from natural language question
 * POST /api/query/generate
 */
exports.generateQuery = async (req, res) => {
  try {
    const { question, schema, dialect = 'mysql' } = req.body;

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

    // Validate dialect
    const validDialects = ['mysql', 'postgresql', 'sqlite', 'sqlserver'];
    const normalizedDialect = dialect.toLowerCase();
    
    if (!validDialects.includes(normalizedDialect)) {
      return res.status(400).json({
        success: false,
        error: `Invalid dialect. Must be one of: ${validDialects.join(', ')}`
      });
    }

    logger.info('Query generation request received', {
      questionLength: question.length,
      dialect: normalizedDialect,
      tableCount: schema.tables.length,
      schemaName: schema.name || 'unnamed'
    });

    // Generate the query
    const result = await queryGeneratorService.generateQuery(
      question.trim(),
      schema,
      normalizedDialect
    );

    if (!result.success) {
      logger.warn('Query generation failed', { error: result.error });
      return res.status(500).json(result);
    }

    logger.info('Query generated successfully');
    return res.status(200).json(result);

  } catch (error) {
    logger.error('Error in generateQuery controller:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while generating the query',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate example questions based on schema
 * POST /api/query/examples
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

    const examples = queryGeneratorService.generateExampleQuestions(schema);

    return res.status(200).json({
      success: true,
      examples
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
