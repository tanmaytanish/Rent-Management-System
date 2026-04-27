const express = require('express');
const {
    getStats,
    getUsers,
    updateUser,
    deleteUser,
    getProperties,
    deleteProperty,
    getTenants,
    getBills,
    getPayments,
    approvePayment,
    rejectPayment,
} = require('../controllers/adminController');
const { protect, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require admin role
router.use(protect, roleMiddleware('admin'));

router.get('/stats', getStats);

router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/properties', getProperties);
router.delete('/properties/:id', deleteProperty);

router.get('/tenants', getTenants);

router.get('/bills', getBills);

router.get('/payments', getPayments);
router.patch('/payments/:id/approve', approvePayment);
router.patch('/payments/:id/reject', rejectPayment);

module.exports = router;
