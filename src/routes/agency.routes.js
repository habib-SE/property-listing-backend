const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agency.controller');

router.get('/', agencyController.getAllAgencies);

module.exports = router;
