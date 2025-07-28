const Schema = require('../models/schema.model');
const nlpService = require('../services/nlp.service');
const schemaGeneratorService = require('../services/schemaGenerator.service');
const logger = require('../utils/logger');

/**
 * Generate database schema from natural language input
 * @param {Object} req - Express request object with natural language prompt
 * @param {Object} res - Express response object
 */
exports.generateSchema = async (req, res) => {
  try {
    const { prompt, name = 'New Schema', description = '' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    logger.info('Generating schema from prompt', { prompt });

    // Process natural language using NLP service
    const extractedEntities = await nlpService.extractEntities(prompt);
    
    // Generate schema from extracted entities
    const schema = await schemaGeneratorService.generateSchema(extractedEntities, { name, description });
    
    // Save schema to database
    const newSchema = new Schema(schema);
    await newSchema.save();
    
    return res.status(201).json({ 
      message: 'Schema generated successfully', 
      schema: newSchema 
    });
  } catch (error) {
    logger.error('Error generating schema:', error);
    return res.status(500).json({ 
      error: 'Failed to generate schema', 
      details: error.message 
    });
  }
};

/**
 * Get a specific schema by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSchemaById = async (req, res) => {
  try {
    const schema = await Schema.findById(req.params.id);
    
    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }
    
    return res.status(200).json({ schema });
  } catch (error) {
    logger.error('Error fetching schema:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch schema', 
      details: error.message 
    });
  }
};

/**
 * Update an existing schema
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateSchema = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const schema = await Schema.findById(id);
    
    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }
    
    // Increment version number
    updates.version = schema.version + 1;
    updates.updatedAt = new Date();
    
    const updatedSchema = await Schema.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    
    return res.status(200).json({ 
      message: 'Schema updated successfully', 
      schema: updatedSchema 
    });
  } catch (error) {
    logger.error('Error updating schema:', error);
    return res.status(500).json({ 
      error: 'Failed to update schema', 
      details: error.message 
    });
  }
};

/**
 * Get available schema templates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTemplates = async (req, res) => {
  try {
    // This would typically fetch template schemas from a database or config file
    const templates = [
      { 
        id: 'ecommerce',
        name: 'E-Commerce',
        description: 'Standard e-commerce database schema with products, customers, orders, and payments'
      },
      { 
        id: 'blog',
        name: 'Blog/CMS',
        description: 'Content management system with posts, users, comments, and categories'
      },
      { 
        id: 'inventory',
        name: 'Inventory Management',
        description: 'Inventory tracking system with products, warehouses, and stock movements'
      },
      { 
        id: 'crm',
        name: 'Customer Relationship Management',
        description: 'CRM system with contacts, companies, deals, and activities'
      }
    ];
    
    return res.status(200).json({ templates });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch templates', 
      details: error.message 
    });
  }
};
