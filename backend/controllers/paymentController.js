const Tenant = require('../models/Tenant');
const RentBill = require('../models/RentBill');
const ElectricityBill = require('../models/ElectricityBill');
const PaymentRecord = require('../models/PaymentRecord');
const cloudinary = require('../config/cloudinary');

const getBillModel = (billType) => {
    if (billType === 'rent') return RentBill;
    if (billType === 'electricity') return ElectricityBill;
    return null;
};

// Upload a buffer to Cloudinary and return the secure URL
const uploadBufferToCloudinary = (buffer, mimetype) => {
    return new Promise((resolve, reject) => {
        const b64 = Buffer.from(buffer).toString('base64');
        const dataURI = `data:${mimetype};base64,${b64}`;
        cloudinary.uploader.upload(
            dataURI,
            { folder: 'rent-payments', resource_type: 'image' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
    });
};

// POST /api/payments — tenant submits a multi-bill payment request
exports.submitPayment = async (req, res, next) => {
    try {
        const { bills, paymentType, totalAmount } = req.body;

        // bills arrives as a JSON string when sent via FormData
        let parsedBills;
        try {
            parsedBills = typeof bills === 'string' ? JSON.parse(bills) : bills;
        } catch {
            return res.status(400).json({ success: false, error: 'Invalid bills format' });
        }

        if (!Array.isArray(parsedBills) || parsedBills.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one bill must be selected' });
        }

        if (!paymentType || !['upi', 'cash', 'manual'].includes(paymentType)) {
            return res.status(400).json({
                success: false,
                error: 'Valid paymentType is required: upi, cash, or manual'
            });
        }

        if (paymentType === 'upi' && !req.file) {
            return res.status(400).json({ success: false, error: 'A payment screenshot is required for UPI payments' });
        }

        const tenant = await Tenant.findOne({ userId: req.user._id });
        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant profile not found' });
        }

        // Validate each bill, accumulate server-side total, build enriched array
        let serverTotal = 0;
        const enrichedBills = [];

        for (const entry of parsedBills) {
            const { billType, billId } = entry;

            if (!billType || !billId) {
                return res.status(400).json({ success: false, error: 'Each bill entry must have billType and billId' });
            }

            const BillModel = getBillModel(billType);
            if (!BillModel) {
                return res.status(400).json({ success: false, error: `Invalid bill type: ${billType}` });
            }

            const bill = await BillModel.findById(billId);
            if (!bill) {
                return res.status(404).json({ success: false, error: `Bill not found: ${billId}` });
            }

            if (String(bill.tenantId) !== String(tenant._id)) {
                return res.status(403).json({ success: false, error: 'A selected bill does not belong to you' });
            }

            if (bill.status === 'paid') {
                return res.status(400).json({
                    success: false,
                    error: `${billType} bill for ${bill.month} is already paid`
                });
            }

            if (bill.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    error: `A payment is already pending for the ${billType} bill (${bill.month})`
                });
            }

            serverTotal += bill.totalAmount;
            enrichedBills.push({
                billType,
                billId: bill._id,
                month: bill.month,
                amount: bill.totalAmount
            });
        }

        // Re-validate total amount to prevent tampering
        const clientTotal = Number(totalAmount);
        if (Math.abs(serverTotal - clientTotal) > 0.01) {
            return res.status(400).json({
                success: false,
                error: `Amount mismatch. Expected Rs ${serverTotal.toFixed(2)}`
            });
        }

        // Upload screenshot to Cloudinary (UPI only)
        let screenshotUrl = '';
        if (req.file) {
            screenshotUrl = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
        }

        // Create the payment record
        const payment = await PaymentRecord.create({
            tenantId: tenant._id,
            ownerId: tenant.ownerId,
            bills: enrichedBills,
            totalAmount: serverTotal,
            paymentType,
            screenshotUrl,
            status: 'pending'
        });

        // Mark all selected bills as "pending"
        for (const entry of enrichedBills) {
            const BillModel = getBillModel(entry.billType);
            await BillModel.findByIdAndUpdate(entry.billId, { status: 'pending' });
        }

        return res.status(201).json({
            success: true,
            message: 'Payment submitted for owner approval',
            payment
        });
    } catch (error) {
        return next(error);
    }
};

// GET /api/payments/pending — owner fetches all pending payment requests
exports.getPendingPayments = async (req, res, next) => {
    try {
        const payments = await PaymentRecord.find({ ownerId: req.user._id, status: 'pending' })
            .populate({
                path: 'tenantId',
                populate: { path: 'userId', select: 'name mobileNumber' }
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, payments });
    } catch (error) {
        return next(error);
    }
};

// PATCH /api/payments/:id/approve — owner approves a pending payment
exports.approvePayment = async (req, res, next) => {
    try {
        const payment = await PaymentRecord.findOne({ _id: req.params.id, ownerId: req.user._id });
        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment request not found' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ success: false, error: 'Only pending payments can be approved' });
        }

        // Mark all linked bills as paid
        for (const entry of payment.bills) {
            const BillModel = getBillModel(entry.billType);
            if (BillModel) {
                await BillModel.findByIdAndUpdate(entry.billId, { status: 'paid' });
            }
        }

        payment.status = 'approved';
        payment.approvedAt = new Date();
        await payment.save();

        return res.status(200).json({ success: true, message: 'Payment approved', payment });
    } catch (error) {
        return next(error);
    }
};

// POST /api/payments/manual — owner immediately marks a bill as paid
exports.markManualPayment = async (req, res, next) => {
    try {
        const { billType, billId } = req.body;

        if (!billType || !billId) {
            return res.status(400).json({ success: false, error: 'billType and billId are required' });
        }

        const BillModel = getBillModel(billType);
        if (!BillModel) {
            return res.status(400).json({ success: false, error: 'Invalid bill type' });
        }

        const bill = await BillModel.findById(billId);
        if (!bill) {
            return res.status(404).json({ success: false, error: 'Bill not found' });
        }

        // Verify bill belongs to a tenant this owner manages
        const tenant = await Tenant.findOne({ _id: bill.tenantId, ownerId: req.user._id });
        if (!tenant) {
            return res.status(403).json({ success: false, error: 'Forbidden: bill access denied' });
        }

        if (bill.status === 'paid') {
            return res.status(400).json({ success: false, error: 'Bill is already paid' });
        }

        if (bill.status === 'pending') {
            return res.status(400).json({
                success: false,
                error: 'A tenant payment is pending for this bill. Approve or reject it first.'
            });
        }

        // Create an immediately-approved payment record
        const payment = await PaymentRecord.create({
            tenantId: tenant._id,
            ownerId: req.user._id,
            bills: [{ billType, billId: bill._id, month: bill.month, amount: bill.totalAmount }],
            totalAmount: bill.totalAmount,
            paymentType: 'manual',
            screenshotUrl: '',
            status: 'approved',
            approvedAt: new Date()
        });

        // Mark the bill as paid
        bill.status = 'paid';
        await bill.save();

        return res.status(201).json({
            success: true,
            message: 'Bill marked as paid',
            payment,
            bill
        });
    } catch (error) {
        return next(error);
    }
};

exports.rejectPayment = async (req, res, next) => {
    try {
        const { reviewNote } = req.body;

        const payment = await PaymentRecord.findOne({ _id: req.params.id, ownerId: req.user._id });
        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment request not found' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ success: false, error: 'Only pending payments can be rejected' });
        }

        // Revert all linked bills back to unpaid
        for (const entry of payment.bills) {
            const BillModel = getBillModel(entry.billType);
            if (BillModel) {
                await BillModel.findByIdAndUpdate(entry.billId, { status: 'unpaid' });
            }
        }

        payment.status = 'rejected';
        payment.reviewNote = reviewNote || '';
        await payment.save();

        return res.status(200).json({ success: true, message: 'Payment rejected', payment });
    } catch (error) {
        return next(error);
    }
};
