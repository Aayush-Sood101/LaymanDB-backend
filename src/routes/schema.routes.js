const express = require('express');
const router = express.Router();
const schemaController = require('../controllers/schema.controller');

/**
 * @route POST /api/schema/generate
 * @description Generate database schema from natural language input
 * @access Public
 */
router.post('/generate', schemaController.generateSchema);

/**
 * @route GET /api/schema/:id
 * @description Get a specific schema by ID
 * @access Public
 */
router.get('/:id', schemaController.getSchemaById);

/**
 * @route PUT /api/schema/:id
 * @description Update an existing schema
 * @access Public
 */
router.put('/:id', schemaController.updateSchema);

/**
 * @route GET /api/schema/templates
 * @description Get available schema templates
 * @access Public
 */
router.get('/templates', schemaController.getTemplates);

module.exports = router;
