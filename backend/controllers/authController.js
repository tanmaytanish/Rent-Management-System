const User = require('../models/User');
const jwt = require('jsonwebtoken');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, mobileNumber, password } = req.body;

        if (!name || !mobileNumber || !password) {
            return res.status(400).json({
                success: false,
                error: 'name, mobileNumber and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ mobileNumber });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'Mobile number already exists' });
        }

        // Create owner user
        const user = await User.create({
            name,
            mobileNumber,
            password,
            role: 'owner'
        });

        if (user) {
            res.status(201).json({
                success: true,
                message: 'Owner registered successfully',
                user: {
                    _id: user._id,
                    name: user.name,
                    mobileNumber: user.mobileNumber,
                    role: user.role
                },
                token: generateToken(user)
            });
        } else {
            res.status(400).json({ success: false, error: 'Invalid user data' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { mobileNumber, password } = req.body;

        if (!mobileNumber || !password) {
            return res.status(400).json({
                success: false,
                error: 'mobileNumber and password are required'
            });
        }

        // Check for user mobile number
        const user = await User.findOne({ mobileNumber }).select('+password');

        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                user: {
                    _id: user._id,
                    name: user.name,
                    mobileNumber: user.mobileNumber,
                    role: user.role
                },
                token: generateToken(user)
            });
        } else {
            res.status(401).json({ success: false, error: 'Invalid mobile number or password' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

// Generate JWT
const generateToken = (user) => {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};
