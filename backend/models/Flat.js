const mongoose = require('mongoose');

const flatSchema = new mongoose.Schema(
    {
        propertyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Property',
            required: true
        },
        flatNumber: {
            type: String,
            required: [true, 'Flat number is required'],
            trim: true
        },
        rentAmount: {
            type: Number,
            required: [true, 'Rent amount is required'],
            min: [0, 'Rent amount cannot be negative']
        }
    },
    {
        timestamps: true
    }
);

flatSchema.index({ propertyId: 1, flatNumber: 1 }, { unique: true });

module.exports = mongoose.model('Flat', flatSchema);
