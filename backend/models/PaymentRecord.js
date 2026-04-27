const mongoose = require('mongoose');

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
        billType: {
            type: String,
            enum: ['rent', 'electricity'],
            required: true
        },
        billId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'Payment amount cannot be negative']
        },
        status: {
            type: String,
            enum: ['submitted', 'approved', 'rejected'],
            default: 'submitted'
        },
        reference: {
            type: String,
            trim: true,
            default: ''
        },
        submittedAt: {
            type: Date,
            default: Date.now
        },
        reviewedAt: {
            type: Date
        },
        reviewNote: {
            type: String,
            trim: true,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

paymentRecordSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
paymentRecordSchema.index({ tenantId: 1, billType: 1, billId: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentRecord', paymentRecordSchema);
