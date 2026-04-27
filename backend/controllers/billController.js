const Tenant = require('../models/Tenant');
const RentBill = require('../models/RentBill');
const ElectricityBill = require('../models/ElectricityBill');

const getBillModelByType = (billType) => {
    if (billType === 'rent') {
        return RentBill;
    }

    if (billType === 'electricity') {
        return ElectricityBill;
    }

    return null;
};

const getTenantForOwner = async (ownerId, tenantId) => {
    return Tenant.findOne({ _id: tenantId, ownerId }).populate('flatId', 'rentAmount flatNumber');
};

const getTenantForUser = async (userId) => {
    return Tenant.findOne({ userId }).populate('flatId', 'rentAmount flatNumber');
};

exports.generateMonthlyBills = async (req, res, next) => {
    try {
        const {
            tenantId,
            month,
            waterAmount,
            dueDate,
            prevReading,
            currReading,
            rate,
            rentStatus,
            electricityStatus
        } = req.body;

        if (!tenantId || !month || waterAmount === undefined || !dueDate || prevReading === undefined || currReading === undefined || rate === undefined) {
            return res.status(400).json({
                success: false,
                error: 'tenantId, month, waterAmount, dueDate, prevReading, currReading and rate are required'
            });
        }

        const tenant = await getTenantForOwner(req.user._id, tenantId);
        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }

        const rentValue = Number(tenant.flatId?.rentAmount || 0);
        const waterValue = Number(waterAmount);
        const prev = Number(prevReading);
        const curr = Number(currReading);
        const unitRate = Number(rate);

        if ([waterValue, prev, curr, unitRate].some((value) => Number.isNaN(value))) {
            return res.status(400).json({ success: false, error: 'Invalid numeric values in request' });
        }

        if (curr < prev) {
            return res.status(400).json({
                success: false,
                error: 'Current reading must be greater than or equal to previous reading'
            });
        }

        const existingRentBill = await RentBill.findOne({ tenantId, month });
        const existingElectricityBill = await ElectricityBill.findOne({ tenantId, month });

        if (existingRentBill || existingElectricityBill) {
            return res.status(400).json({
                success: false,
                error: 'Monthly bills already generated for this tenant and month'
            });
        }

        const units = curr - prev;
        const rentTotal = rentValue + waterValue;
        const electricityTotal = units * unitRate;

        const rentBill = await RentBill.create({
            tenantId,
            month,
            rentAmount: rentValue,
            waterAmount: waterValue,
            totalAmount: rentTotal,
            status: rentStatus || 'unpaid',
            dueDate
        });

        const electricityBill = await ElectricityBill.create({
            tenantId,
            month,
            prevReading: prev,
            currReading: curr,
            rate: unitRate,
            units,
            totalAmount: electricityTotal,
            status: electricityStatus || 'unpaid'
        });

        return res.status(201).json({
            success: true,
            message: 'Monthly bills generated successfully',
            rentBill,
            electricityBill
        });
    } catch (error) {
        return next(error);
    }
};

exports.getBillsForTenant = async (req, res, next) => {
    try {
        const { tenantId } = req.params;

        const tenant = await getTenantForOwner(req.user._id, tenantId);
        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }

        const [rentBills, electricityBills] = await Promise.all([
            RentBill.find({ tenantId }).sort({ month: -1 }),
            ElectricityBill.find({ tenantId }).sort({ month: -1 })
        ]);

        return res.status(200).json({ success: true, rentBills, electricityBills });
    } catch (error) {
        return next(error);
    }
};

exports.getMyBills = async (req, res, next) => {
    try {
        const tenant = await getTenantForUser(req.user._id);

        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant profile not found' });
        }

        const [rentBills, electricityBills] = await Promise.all([
            RentBill.find({ tenantId: tenant._id }).sort({ month: -1 }),
            ElectricityBill.find({ tenantId: tenant._id }).sort({ month: -1 })
        ]);

        return res.status(200).json({ success: true, tenantId: tenant._id, rentBills, electricityBills });
    } catch (error) {
        return next(error);
    }
};

exports.getUnpaidBills = async (req, res, next) => {
    try {
        let tenantIds = [];

        if (req.user.role === 'owner') {
            const ownerTenants = await Tenant.find({ ownerId: req.user._id }).select('_id');
            tenantIds = ownerTenants.map((tenant) => tenant._id);
        } else if (req.user.role === 'tenant') {
            const tenant = await Tenant.findOne({ userId: req.user._id }).select('_id');
            if (!tenant) {
                return res.status(404).json({ success: false, error: 'Tenant profile not found' });
            }
            tenantIds = [tenant._id];
        } else {
            return res.status(403).json({ success: false, error: 'Forbidden: unsupported role' });
        }

        const [rentBills, electricityBills] = await Promise.all([
            RentBill.find({ tenantId: { $in: tenantIds }, status: 'unpaid' }).sort({ month: -1 }),
            ElectricityBill.find({ tenantId: { $in: tenantIds }, status: 'unpaid' }).sort({ month: -1 })
        ]);

        return res.status(200).json({ success: true, rentBills, electricityBills });
    } catch (error) {
        return next(error);
    }
};

exports.getBillById = async (req, res, next) => {
    try {
        const { billType, billId } = req.params;

        const BillModel = getBillModelByType(billType);
        if (!BillModel) {
            return res.status(400).json({ success: false, error: 'Invalid bill type' });
        }

        const bill = await BillModel.findById(billId);
        if (!bill) {
            return res.status(404).json({ success: false, error: 'Bill not found' });
        }

        if (req.user.role === 'tenant') {
            const tenant = await Tenant.findOne({ userId: req.user._id }).select('_id');
            if (!tenant || String(tenant._id) !== String(bill.tenantId)) {
                return res.status(403).json({ success: false, error: 'Forbidden: bill access denied' });
            }
        } else if (req.user.role === 'owner') {
            const tenant = await Tenant.findOne({ _id: bill.tenantId, ownerId: req.user._id }).select('_id');
            if (!tenant) {
                return res.status(403).json({ success: false, error: 'Forbidden: bill access denied' });
            }
        } else {
            return res.status(403).json({ success: false, error: 'Forbidden: unsupported role' });
        }

        return res.status(200).json({ success: true, bill });
    } catch (error) {
        return next(error);
    }
};
