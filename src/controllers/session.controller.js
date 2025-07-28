const Session = require('../models/session.model');
const Schema = require('../models/schema.model');
const logger = require('../utils/logger');

/**
 * Create a new design session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createSession = async (req, res) => {
  try {
    const { name, description, schemaId, prompt } = req.body;
    
    const sessionData = {
      name: name || 'New Session',
      description,
      prompt,
      schemas: [],
      history: []
    };
    
    // If a schema ID is provided, add it to the session
    if (schemaId) {
      const schema = await Schema.findById(schemaId);
      if (schema) {
        sessionData.schemas = [schema._id];
        sessionData.activeSchemaId = schema._id;
        sessionData.history.push({
          version: 1,
          schemaId: schema._id,
          comment: 'Initial schema created'
        });
      }
    }
    
    const session = new Session(sessionData);
    await session.save();
    
    return res.status(201).json({
      message: 'Session created successfully',
      session
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    return res.status(500).json({
      error: 'Failed to create session',
      details: error.message
    });
  }
};

/**
 * Get a specific session by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('schemas')
      .populate('activeSchemaId')
      .populate('history.schemaId');
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    return res.status(200).json({ session });
  } catch (error) {
    logger.error('Error fetching session:', error);
    return res.status(500).json({
      error: 'Failed to fetch session',
      details: error.message
    });
  }
};

/**
 * Get version history for a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSessionHistory = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('history.schemaId');
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    return res.status(200).json({ history: session.history });
  } catch (error) {
    logger.error('Error fetching session history:', error);
    return res.status(500).json({
      error: 'Failed to fetch session history',
      details: error.message
    });
  }
};

/**
 * Save the current state of a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.saveSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { schemaId, comment } = req.body;
    
    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const schema = await Schema.findById(schemaId);
    
    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }
    
    // Create a new version of the schema
    const newSchema = new Schema({
      ...schema.toObject(),
      _id: undefined,
      version: schema.version + 1,
      updatedAt: new Date()
    });
    
    await newSchema.save();
    
    // Update session with new schema
    session.schemas.push(newSchema._id);
    session.activeSchemaId = newSchema._id;
    session.history.push({
      version: newSchema.version,
      schemaId: newSchema._id,
      comment: comment || `Updated to version ${newSchema.version}`
    });
    session.updatedAt = new Date();
    
    await session.save();
    
    return res.status(200).json({
      message: 'Session saved successfully',
      session
    });
  } catch (error) {
    logger.error('Error saving session:', error);
    return res.status(500).json({
      error: 'Failed to save session',
      details: error.message
    });
  }
};
