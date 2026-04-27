const User = require('../models/User');
const Property = require('../models/Property');
const Flat = require('../models/Flat');
const Tenant = require('../models/Tenant');

exports.createProperty = async (req, res, next) => {
    try {
        const { name, address } = req.body;

        if (!name || !address) {
            return res.status(400).json({ success: false, error: 'name and address are required' });
        }

        const property = await Property.create({
            name,
            address,
            ownerId: req.user._id
        });

        return res.status(201).json({ success: true, property });
    } catch (error) {
        return next(error);
    }
};

exports.getOwnerProperties = async (req, res, next) => {
    try {
        const properties = await Property.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, properties });
    } catch (error) {
        return next(error);
    }
};

exports.createFlat = async (req, res, next) => {
    try {
        const { propertyId, flatNumber, rentAmount } = req.body;

        if (!propertyId || !flatNumber || rentAmount === undefined) {
            return res.status(400).json({
                success: false,
                error: 'propertyId, flatNumber and rentAmount are required'
            });
        }

        const property = await Property.findOne({ _id: propertyId, ownerId: req.user._id });

        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        const flat = await Flat.create({ propertyId, flatNumber, rentAmount });

        return res.status(201).json({ success: true, flat });
    } catch (error) {
        return next(error);
    }
};

exports.getFlatsByProperty = async (req, res, next) => {
    try {
        const { id } = req.params;

        const property = await Property.findOne({ _id: id, ownerId: req.user._id });

        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        const flats = await Flat.find({ propertyId: id }).sort({ flatNumber: 1 });

        return res.status(200).json({ success: true, flats });
    } catch (error) {
        return next(error);
    }
};

exports.createTenant = async (req, res, next) => {
    try {
        const { name, mobileNumber, propertyId, flatId, joinDate } = req.body;

        if (!name || !mobileNumber || !propertyId || !flatId || !joinDate) {
            return res.status(400).json({
                success: false,
                error: 'name, mobileNumber, propertyId, flatId and joinDate are required'
            });
        }

        const property = await Property.findOne({ _id: propertyId, ownerId: req.user._id });

        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        const flat = await Flat.findOne({ _id: flatId, propertyId });

        if (!flat) {
            return res.status(404).json({ success: false, error: 'Flat not found in selected property' });
        }

        const existingUser = await User.findOne({ mobileNumber });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Mobile number already in use' });
        }

        const occupiedFlat = await Tenant.findOne({ flatId, status: 'active' });
        if (occupiedFlat) {
            return res.status(400).json({ success: false, error: 'Flat already has an active tenant' });
        }

        const defaultPassword = process.env.DEFAULT_TENANT_PASSWORD || 'tenant@123';

        const user = await User.create({
            name,
            mobileNumber,
            password: defaultPassword,
            role: 'tenant'
        });

        const tenant = await Tenant.create({
            userId: user._id,
            ownerId: req.user._id,
            propertyId,
            flatId,
            joinDate,
            status: 'active'
        });

        const tenantData = await Tenant.findById(tenant._id)
            .populate('userId', 'name mobileNumber role')
            .populate('propertyId', 'name address')
            .populate('flatId', 'flatNumber rentAmount');

        return res.status(201).json({
            success: true,
            message: 'Tenant created successfully',
            defaultPassword,
            tenant: tenantData
        });
    } catch (error) {
        return next(error);
    }
};

exports.getOwnerTenants = async (req, res, next) => {
    try {
        const tenants = await Tenant.find({ ownerId: req.user._id })
            .populate('userId', 'name mobileNumber role')
            .populate('propertyId', 'name address')
            .populate('flatId', 'flatNumber rentAmount')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, tenants });
    } catch (error) {
        return next(error);
    }
};
