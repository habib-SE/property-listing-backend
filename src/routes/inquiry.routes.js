const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiry.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.post('/', inquiryController.submitInquiry);
router.get('/', authenticateToken, inquiryController.getInquiries); // Assuming only logged in sellers/admins can see inquiries

module.exports = router;
