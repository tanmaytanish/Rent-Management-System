const express = require('express');
const {
    submitPayment,
    getPendingPayments,
    approvePayment,
    rejectPayment,
    markManualPayment
} = require('../controllers/paymentController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const upload = require('../config/upload');

const router = express.Router();

// Tenant submits a payment request (with optional screenshot for UPI)
router.post('/', protect, roleMiddleware('tenant'), upload.single('screenshot'), submitPayment);

// Owner views all pending payment requests
router.get('/pending', protect, roleMiddleware('owner'), getPendingPayments);

// Owner approves a payment
router.patch('/:id/approve', protect, roleMiddleware('owner'), approvePayment);

// Owner rejects a payment
router.patch('/:id/reject', protect, roleMiddleware('owner'), rejectPayment);

// Owner manually marks a bill as paid (creates an approved payment record instantly)
router.post('/manual', protect, roleMiddleware('owner'), markManualPayment);

module.exports = router;
