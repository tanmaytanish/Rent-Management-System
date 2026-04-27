const express = require('express');
const {
    generateMonthlyBills,
    getBillsForTenant,
    getMyBills,
    getUnpaidBills,
    getBillById
} = require('../controllers/billController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/generate-monthly', protect, roleMiddleware('owner'), generateMonthlyBills);
router.get('/tenant/:tenantId', protect, roleMiddleware('owner'), getBillsForTenant);
router.get('/my', protect, getMyBills);
router.get('/unpaid', protect, getUnpaidBills);
router.get('/:billType/:billId', protect, getBillById);

module.exports = router;
