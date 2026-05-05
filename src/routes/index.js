const express = require('express');
const router = express.Router();

// Import individual routes
const authRoutes = require('./auth.routes');
const propertyRoutes = require('./property.routes');
const locationRoutes = require('./location.routes');
const inquiryRoutes = require('./inquiry.routes');
const agencyRoutes = require('./agency.routes');

// Use routes
router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/locations', locationRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/agencies', agencyRoutes);

module.exports = router;
