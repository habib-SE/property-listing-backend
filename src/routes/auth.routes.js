const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile-data', authenticateToken, (req, res, next) => {
    console.log('GET /profile-data request received');
    next();
}, authController.getProfileData);
router.get('/me', authenticateToken, authController.getMe);
router.put('/update-profile', authenticateToken, authController.updateProfile);
router.put('/update-password', authenticateToken, authController.updatePassword);

module.exports = router;
