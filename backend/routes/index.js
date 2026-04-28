// routes/index.js
// Defines all REST API routes and mounts them under /api

const express = require('express');
const roomRoutes = require('./rooms');
const healthRoutes = require('./health');

const router = express.Router();

router.use('/rooms', roomRoutes);
router.use('/health', healthRoutes);

module.exports = router;
