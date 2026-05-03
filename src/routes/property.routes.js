const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/property.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/', propertyController.getProperties);
router.get('/:id', propertyController.getPropertyById);

router.post('/', authenticateToken, upload.array('images', 10), propertyController.createProperty);
router.put('/:id', authenticateToken, propertyController.updateProperty);
router.delete('/:id', authenticateToken, propertyController.deleteProperty);

module.exports = router;
