const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@event.co.gmail'; // Fallback for safety
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin777'; // Fallback for safety
const ADMIN_NAME = 'System Admin';

const ensureReservedAdmin = async () => {
  const reservedEmail = ADMIN_EMAIL.toLowerCase();

  const existingAdmin = await User.findOne({ email: reservedEmail }).select('+password');

  if (!existingAdmin) {
    await User.create({
      name: ADMIN_NAME,
      email: reservedEmail,
      password: ADMIN_PASSWORD,
      role: 'admin'
    });
    console.log(`[BOOTSTRAP] Created reserved admin account: ${reservedEmail}`);
  } else {
    let changed = false;

    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      changed = true;
    }

    // Keep the reserved admin password fixed for this deployment policy.
    const hasReservedPassword = await existingAdmin.matchPassword(ADMIN_PASSWORD);
    if (!hasReservedPassword) {
      existingAdmin.password = ADMIN_PASSWORD;
      changed = true;
    }

    if (changed) {
      await existingAdmin.save();
      console.log(`[BOOTSTRAP] Updated reserved admin account: ${reservedEmail}`);
    }
  }

  const demotedAdmins = await User.updateMany(
    { role: 'admin', email: { $ne: reservedEmail } },
    { $set: { role: 'user' } }
  );

  if ((demotedAdmins.modifiedCount || 0) > 0) {
    console.log(`[BOOTSTRAP] Demoted ${demotedAdmins.modifiedCount} non-reserved admin account(s) to user`);
  }
};

module.exports = {
  ensureReservedAdmin,
  ADMIN_EMAIL,
  ADMIN_PASSWORD
};
