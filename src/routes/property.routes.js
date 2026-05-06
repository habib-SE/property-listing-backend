const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/property.controller');
const { authenticateToken, optionalAuthenticate } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/', optionalAuthenticate, propertyController.getProperties);
router.get('/:id', optionalAuthenticate, propertyController.getPropertyById);

router.post('/', authenticateToken, upload.array('images', 10), propertyController.createProperty);
router.put('/:id', authenticateToken, upload.array('images', 10), propertyController.updateProperty);
router.patch('/:id/status', authenticateToken, propertyController.updatePropertyStatus);
router.delete('/:id', authenticateToken, propertyController.deleteProperty);

module.exports = router;
