/**
 * Seed script — creates the ONE permanent admin user.
 * Run once: node seedAdmin.js
 * Safe to re-run (idempotent — skips if admin already exists).
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

dotenv.config();

const dnsServers = process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(',').map(s => s.trim()).filter(Boolean)
    : [];
if (dnsServers.length > 0) dns.setServers(dnsServers);

const User = require('./models/User');
const connectDB = require('./config/db');

const ADMIN_MOBILE = '0000000000';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'System Admin';

const seed = async () => {
    await connectDB();

    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
        console.log(`✓ Admin already exists (mobile: ${existing.mobileNumber}). Skipping.`);
        process.exit(0);
    }

    // Make sure no regular user has claimed the admin mobile number
    const conflict = await User.findOne({ mobileNumber: ADMIN_MOBILE });
    if (conflict) {
        console.log(`✗ Mobile ${ADMIN_MOBILE} is already taken by user "${conflict.name}" (role: ${conflict.role}).`);
        console.log('  Please change ADMIN_MOBILE in this script or remove the conflicting user.');
        process.exit(1);
    }

    const admin = await User.create({
        name: ADMIN_NAME,
        mobileNumber: ADMIN_MOBILE,
        password: ADMIN_PASSWORD,
        role: 'admin',
    });

    console.log('✓ Admin user created successfully!');
    console.log(`  Name:   ${admin.name}`);
    console.log(`  Mobile: ${admin.mobileNumber}`);
    console.log(`  Role:   ${admin.role}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    process.exit(0);
};

seed().catch(err => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
