/**
 * Controller for the Gemini Playground feature
 */

const geminiService = require('../services/geminiService');
const logger = require('../utils/logger');

/**
 * Generate an ER diagram using Gemini model
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateERDiagram = async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      logger.warn('Invalid input for Gemini ER diagram generation', { input });
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid text description of the database schema.'
      });
    }
    
    logger.info('Received request to generate ER diagram using Gemini', { inputLength: input.length });
    
    const result = await geminiService.generateERDiagram(input);
    
    if (!result.success) {
      logger.error('Failed to generate ER diagram using Gemini', { error: result.error });
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate ER diagram.'
      });
    }
    
    logger.info('Successfully generated ER diagram using Gemini');
    
    return res.status(200).json({
      success: true,
      mermaidCode: result.mermaidCode
    });
  } catch (error) {
    logger.error('Error in generateERDiagram controller', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while generating the ER diagram.'
    });
  }
};

module.exports = {
  generateERDiagram
};