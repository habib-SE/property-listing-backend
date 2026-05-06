const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');

router.get('/cities', locationController.getCities);
router.get('/developers', locationController.getDevelopers);
router.get('/communities', locationController.getCommunities);
router.get('/property-types', locationController.getPropertyTypes);
router.get('/communities/all', locationController.getAllCommunities);


module.exports = router;
