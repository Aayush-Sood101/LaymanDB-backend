const express = require('express');
const router = express.Router();

const schemaRoutes = require('./schema.routes');
const sessionRoutes = require('./session.routes');
const exportRoutes = require('./export.routes');
const geminiRoutes = require('./gemini.routes');

// Mount route modules
router.use('/schema', schemaRoutes);
router.use('/session', sessionRoutes);
router.use('/export', exportRoutes);
router.use('/gemini', geminiRoutes);

module.exports = router;
