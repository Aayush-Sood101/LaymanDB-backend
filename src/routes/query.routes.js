/**
 * Query Routes
 * Routes for natural language to SQL query generation
 */

const express = require('express');
const router = express.Router();
const queryController = require('../controllers/query.controller');

/**
 * POST /api/query/generate
 * Generate SQL query from natural language question
 * Body: { question: string, schema: object, dialect?: string }
 */
router.post('/generate', queryController.generateQuery);

/**
 * POST /api/query/examples
 * Get example questions based on schema
 * Body: { schema: object }
 */
router.post('/examples', queryController.getExampleQuestions);

module.exports = router;
