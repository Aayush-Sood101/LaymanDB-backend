/**
 * Mermaid Query Routes
 * Routes for natural language to Mermaid ER Diagram generation
 */

const express = require('express');
const router = express.Router();
const mermaidQueryController = require('../controllers/mermaidQuery.controller');

// Generate Mermaid ER diagram from natural language
router.post('/generate', mermaidQueryController.generateMermaidQuery);

// Get example questions based on schema
router.post('/examples', mermaidQueryController.getExampleQuestions);

module.exports = router;
