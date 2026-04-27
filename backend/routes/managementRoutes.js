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

router.use(protect, roleMiddleware('owner'));

router.post('/properties', createProperty);
router.get('/owner/properties', getOwnerProperties);
router.post('/flats', createFlat);
router.post('/tenants', createTenant);
router.get('/owner/tenants', getOwnerTenants);
router.get('/properties/:id/flats', getFlatsByProperty);

module.exports = router;
