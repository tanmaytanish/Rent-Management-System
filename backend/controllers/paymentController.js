const Tenant = require('../models/Tenant');
const RentBill = require('../models/RentBill');
const ElectricityBill = require('../models/ElectricityBill');
const PaymentRecord = require('../models/PaymentRecord');

const getBillModelByType = (billType) => {
    if (billType === 'rent') {
        return RentBill;
    }

    if (billType === 'electricity') {
        return ElectricityBill;
    }

    return null;
};

exports.submitPayment = async (req, res, next) => {
    try {
        const { billType, billId, reference } = req.body;

        if (!billType || !billId) {
            return res.status(400).json({ success: false, error: 'billType and billId are required' });
        }

        const BillModel = getBillModelByType(billType);
        if (!BillModel) {
            return res.status(400).json({ success: false, error: 'Invalid bill type' });
        }

        const tenant = await Tenant.findOne({ userId: req.user._id });
        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant profile not found' });
        }

        const bill = await BillModel.findById(billId);
        if (!bill) {
            return res.status(404).json({ success: false, error: 'Bill not found' });
        }

        if (String(bill.tenantId) !== String(tenant._id)) {
            return res.status(403).json({ success: false, error: 'Forbidden: bill does not belong to you' });
        }

        if (bill.status === 'paid') {
            return res.status(400).json({ success: false, error: 'Bill is already paid' });
        }

        if (bill.status === 'pending') {
            return res.status(400).json({ success: false, error: 'Payment already submitted for this bill' });
        }

        const payment = await PaymentRecord.create({
            tenantId: tenant._id,
            ownerId: tenant.ownerId,
            billType,
            billId,
            amount: bill.totalAmount,
            reference: reference || '',
            status: 'submitted'
        });

        bill.status = 'pending';
        await bill.save();

        return res.status(201).json({
            success: true,
            message: 'Payment submitted for approval',
            payment,
            bill
        });
    } catch (error) {
        return next(error);
    }
};

exports.approvePayment = async (req, res, next) => {
    try {
        const { paymentId } = req.params;

        const payment = await PaymentRecord.findOne({ _id: paymentId, ownerId: req.user._id });
        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment request not found' });
        }

        if (payment.status !== 'submitted') {
            return res.status(400).json({ success: false, error: 'Only submitted payments can be approved' });
        }

        const BillModel = getBillModelByType(payment.billType);
        const bill = await BillModel.findById(payment.billId);

        if (!bill) {
            return res.status(404).json({ success: false, error: 'Associated bill not found' });
        }

        const tenant = await Tenant.findOne({ _id: bill.tenantId, ownerId: req.user._id });
        if (!tenant) {
            return res.status(403).json({ success: false, error: 'Forbidden: tenant access denied' });
        }

        payment.status = 'approved';
        payment.reviewedAt = new Date();
        await payment.save();

        bill.status = 'paid';
        await bill.save();

        return res.status(200).json({ success: true, message: 'Payment approved', payment, bill });
    } catch (error) {
        return next(error);
    }
};

exports.getOwnerPaymentRequests = async (req, res, next) => {
    try {
        const payments = await PaymentRecord.find({ ownerId: req.user._id, status: 'submitted' })
            .populate('tenantId', 'userId')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, payments });
    } catch (error) {
        return next(error);
    }
};
