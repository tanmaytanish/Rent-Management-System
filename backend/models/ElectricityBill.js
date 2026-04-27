const mongoose = require('mongoose');

const electricityBillSchema = new mongoose.Schema(
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
        prevReading: {
            type: Number,
            required: true,
            min: [0, 'Previous reading cannot be negative']
        },
        currReading: {
            type: Number,
            required: true,
            min: [0, 'Current reading cannot be negative']
        },
        rate: {
            type: Number,
            required: true,
            min: [0, 'Rate cannot be negative']
        },
        units: {
            type: Number,
            required: true,
            min: [0, 'Units cannot be negative']
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
        }
    },
    {
        timestamps: true
    }
);

electricityBillSchema.index({ tenantId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('ElectricityBill', electricityBillSchema);
