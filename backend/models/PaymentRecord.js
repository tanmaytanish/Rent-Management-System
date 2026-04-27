const mongoose = require('mongoose');

const billEntrySchema = new mongoose.Schema(
    {
        billType: {
            type: String,
            enum: ['rent', 'electricity'],
            required: true
        },
        billId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        month: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        }
    },
    { _id: false }
);

const paymentRecordSchema = new mongoose.Schema(
    {
        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        bills: {
            type: [billEntrySchema],
            required: true,
            validate: {
                validator: (arr) => arr.length > 0,
                message: 'At least one bill is required'
            }
        },
        totalAmount: {
            type: Number,
            required: true,
            min: [0, 'Payment amount cannot be negative']
        },
        paymentType: {
            type: String,
            enum: ['upi', 'cash', 'manual'],
            required: true
        },
        screenshotUrl: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        reviewNote: {
            type: String,
            trim: true,
            default: ''
        },
        approvedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

paymentRecordSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
paymentRecordSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentRecord', paymentRecordSchema);
