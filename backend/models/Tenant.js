const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true
        },
        flatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Flat',
            required: true,
            unique: true
        },
        joinDate: {
            type: Date,
            required: [true, 'Join date is required']
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        }
    },
    {
        timestamps: true
    }
);

tenantSchema.index({ ownerId: 1, propertyId: 1, flatId: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
