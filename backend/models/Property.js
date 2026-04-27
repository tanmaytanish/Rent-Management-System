const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Property name is required'],
            trim: true
        },
        address: {
            type: String,
            required: [true, 'Property address is required'],
            trim: true
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Property', propertySchema);
