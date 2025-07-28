const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');

/**
 * @route POST /api/session/create
 * @description Create a new design session
 * @access Public
 */
router.post('/create', sessionController.createSession);

/**
 * @route GET /api/session/:id
 * @description Get a specific session by ID
 * @access Public
 */
router.get('/:id', sessionController.getSessionById);

/**
 * @route GET /api/session/:id/history
 * @description Get version history for a session
 * @access Public
 */
router.get('/:id/history', sessionController.getSessionHistory);

/**
 * @route POST /api/session/:id/save
 * @description Save the current state of a session
 * @access Public
 */
router.post('/:id/save', sessionController.saveSession);

module.exports = router;
