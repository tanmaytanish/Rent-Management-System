const mongoose = require('mongoose');

const rentBillSchema = new mongoose.Schema(
    {
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true
        },
        month: {
            type: String,
            required: [true, 'Month is required'],
            match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format']
        },
        rentAmount: {
            type: Number,
            required: true,
            min: [0, 'Rent amount cannot be negative']
        },
        waterAmount: {
            type: Number,
            required: true,
            min: [0, 'Water amount cannot be negative']
        },
        totalAmount: {
            type: Number,
            required: true,
            min: [0, 'Total amount cannot be negative']
        },
        status: {
            type: String,
            enum: ['unpaid', 'pending', 'paid'],
            default: 'unpaid'
        },
        dueDate: {
            type: Date,
            required: [true, 'Due date is required']
        }
    },
    {
        timestamps: true
    }
);

rentBillSchema.index({ tenantId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('RentBill', rentBillSchema);
