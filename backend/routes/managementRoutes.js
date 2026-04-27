const express = require('express');
const {
    createProperty,
    createFlat,
    createTenant,
    getOwnerTenants,
    getFlatsByProperty,
    getOwnerProperties
} = require('../controllers/managementController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/properties', protect, roleMiddleware('owner'), createProperty);
router.get('/owner/properties', protect, roleMiddleware('owner'), getOwnerProperties);
router.post('/flats', protect, roleMiddleware('owner'), createFlat);
router.post('/tenants', protect, roleMiddleware('owner'), createTenant);
router.get('/owner/tenants', protect, roleMiddleware('owner'), getOwnerTenants);
router.get('/properties/:id/flats', protect, roleMiddleware('owner'), getFlatsByProperty);

module.exports = router;
