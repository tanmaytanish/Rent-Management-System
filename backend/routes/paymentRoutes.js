const express = require('express');
const {
    submitPayment,
    approvePayment,
    getOwnerPaymentRequests
} = require('../controllers/paymentController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/submit', protect, roleMiddleware('tenant'), submitPayment);
router.patch('/:paymentId/approve', protect, roleMiddleware('owner'), approvePayment);
router.get('/owner/pending', protect, roleMiddleware('owner'), getOwnerPaymentRequests);

module.exports = router;
