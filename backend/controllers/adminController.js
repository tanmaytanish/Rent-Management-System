const User = require('../models/User');
const Property = require('../models/Property');
const Flat = require('../models/Flat');
const Tenant = require('../models/Tenant');
const RentBill = require('../models/RentBill');
const ElectricityBill = require('../models/ElectricityBill');
const PaymentRecord = require('../models/PaymentRecord');

// ─── STATS ──────────────────────────────────────────
exports.getStats = async (req, res, next) => {
    try {
        const [users, owners, tenants, properties, flats, activeTenants, rentBills, electricityBills, payments, pendingPayments] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'owner' }),
            User.countDocuments({ role: 'tenant' }),
            Property.countDocuments(),
            Flat.countDocuments(),
            Tenant.countDocuments({ status: 'active' }),
            RentBill.countDocuments(),
            ElectricityBill.countDocuments(),
            PaymentRecord.countDocuments(),
            PaymentRecord.countDocuments({ status: 'pending' }),
        ]);

        // Total revenue (approved payments)
        const revenueAgg = await PaymentRecord.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        res.json({
            success: true,
            stats: {
                users, owners, tenants, properties, flats,
                activeTenants,
                totalBills: rentBills + electricityBills,
                rentBills, electricityBills,
                payments, pendingPayments,
                totalRevenue,
            },
        });
    } catch (error) { next(error); }
};

// ─── USERS ──────────────────────────────────────────
exports.getUsers = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.role) filter.role = req.query.role;
        const users = await User.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) { next(error); }
};

exports.updateUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ success: false, error: 'Cannot modify admin user' });

        const { name, role } = req.body;
        if (name) user.name = name;
        if (role && ['owner', 'tenant'].includes(role)) user.role = role;
        await user.save();

        res.json({ success: true, user });
    } catch (error) { next(error); }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ success: false, error: 'Cannot delete admin user' });

        // Cascade: remove tenant records, bills, payments linked to this user
        const tenantRecords = await Tenant.find({ userId: user._id });
        for (const t of tenantRecords) {
            await RentBill.deleteMany({ tenantId: t._id });
            await ElectricityBill.deleteMany({ tenantId: t._id });
            await PaymentRecord.deleteMany({ tenantId: t._id });
        }
        await Tenant.deleteMany({ userId: user._id });

        // If owner, remove their properties, flats, and associated tenant data
        if (user.role === 'owner') {
            const props = await Property.find({ ownerId: user._id });
            const propIds = props.map(p => p._id);
            const ownerFlats = await Flat.find({ propertyId: { $in: propIds } });
            const flatIds = ownerFlats.map(f => f._id);

            const ownerTenants = await Tenant.find({ ownerId: user._id });
            for (const t of ownerTenants) {
                await RentBill.deleteMany({ tenantId: t._id });
                await ElectricityBill.deleteMany({ tenantId: t._id });
                await PaymentRecord.deleteMany({ tenantId: t._id });
            }
            await Tenant.deleteMany({ ownerId: user._id });
            await Flat.deleteMany({ propertyId: { $in: propIds } });
            await Property.deleteMany({ ownerId: user._id });
        }

        await User.findByIdAndDelete(user._id);
        res.json({ success: true, message: 'User and related data deleted' });
    } catch (error) { next(error); }
};

// ─── PROPERTIES ─────────────────────────────────────
exports.getProperties = async (req, res, next) => {
    try {
        const properties = await Property.find().populate('ownerId', 'name mobileNumber').sort({ createdAt: -1 });
        // Attach flat counts
        const result = [];
        for (const p of properties) {
            const flatCount = await Flat.countDocuments({ propertyId: p._id });
            const occupiedCount = await Tenant.countDocuments({ propertyId: p._id, status: 'active' });
            result.push({ ...p.toObject(), flatCount, occupiedCount });
        }
        res.json({ success: true, properties: result });
    } catch (error) { next(error); }
};

exports.deleteProperty = async (req, res, next) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

        const flats = await Flat.find({ propertyId: property._id });
        const flatIds = flats.map(f => f._id);

        // Remove tenants in those flats and their bills/payments
        const tenants = await Tenant.find({ flatId: { $in: flatIds } });
        for (const t of tenants) {
            await RentBill.deleteMany({ tenantId: t._id });
            await ElectricityBill.deleteMany({ tenantId: t._id });
            await PaymentRecord.deleteMany({ tenantId: t._id });
        }
        await Tenant.deleteMany({ flatId: { $in: flatIds } });
        await Flat.deleteMany({ propertyId: property._id });
        await Property.findByIdAndDelete(property._id);

        res.json({ success: true, message: 'Property and related data deleted' });
    } catch (error) { next(error); }
};

// ─── TENANTS ────────────────────────────────────────
exports.getTenants = async (req, res, next) => {
    try {
        const tenants = await Tenant.find()
            .populate('userId', 'name mobileNumber')
            .populate('ownerId', 'name')
            .populate('propertyId', 'name')
            .populate('flatId', 'flatNumber rentAmount')
            .sort({ createdAt: -1 });
        res.json({ success: true, tenants });
    } catch (error) { next(error); }
};

// ─── BILLS ──────────────────────────────────────────
exports.getBills = async (req, res, next) => {
    try {
        const [rentBills, electricityBills] = await Promise.all([
            RentBill.find().populate('tenantId').sort({ createdAt: -1 }).limit(200),
            ElectricityBill.find().populate('tenantId').sort({ createdAt: -1 }).limit(200),
        ]);
        res.json({ success: true, rentBills, electricityBills });
    } catch (error) { next(error); }
};

// ─── PAYMENTS ───────────────────────────────────────
exports.getPayments = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        const payments = await PaymentRecord.find(filter)
            .populate({ path: 'tenantId', populate: { path: 'userId', select: 'name mobileNumber' } })
            .populate('ownerId', 'name')
            .sort({ createdAt: -1 })
            .limit(200);
        res.json({ success: true, payments });
    } catch (error) { next(error); }
};

exports.approvePayment = async (req, res, next) => {
    try {
        const payment = await PaymentRecord.findById(req.params.id);
        if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
        if (payment.status !== 'pending') return res.status(400).json({ success: false, error: 'Payment already processed' });

        payment.status = 'approved';
        payment.approvedAt = new Date();
        await payment.save();

        // Mark associated bills as paid
        for (const bill of payment.bills) {
            const Model = bill.billType === 'rent' ? RentBill : ElectricityBill;
            await Model.findByIdAndUpdate(bill.billId, { status: 'paid' });
        }

        res.json({ success: true, message: 'Payment approved', payment });
    } catch (error) { next(error); }
};

exports.rejectPayment = async (req, res, next) => {
    try {
        const payment = await PaymentRecord.findById(req.params.id);
        if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
        if (payment.status !== 'pending') return res.status(400).json({ success: false, error: 'Payment already processed' });

        payment.status = 'rejected';
        payment.reviewNote = req.body.note || '';
        await payment.save();

        // Revert bills to unpaid
        for (const bill of payment.bills) {
            const Model = bill.billType === 'rent' ? RentBill : ElectricityBill;
            await Model.findByIdAndUpdate(bill.billId, { status: 'unpaid' });
        }

        res.json({ success: true, message: 'Payment rejected', payment });
    } catch (error) { next(error); }
};
