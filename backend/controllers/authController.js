const User = require('../models/User');
const { logAdminAction } = require('../utils/auditLog');

const getCookieExpireDays = () => {
  const rawValue = process.env.JWT_COOKIE_EXPIRE;
  if (!rawValue) {
    return 30;
  }

  const trimmed = String(rawValue).trim();
  if (!trimmed) {
    return 30;
  }

  // Accept either plain day values ("30") or values like "30d".
  const numericMatch = trimmed.match(/^(\d+)(d)?$/i);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }

  console.warn(`Invalid JWT_COOKIE_EXPIRE value "${trimmed}". Falling back to 30 days.`);
  return 30;
};

// Load admin credentials from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const isReservedAdmin = (email, password) => {
  return (email || '').toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const normalizedEmail = (email || '').toLowerCase();

    let nextRole = 'user';
    if (role === 'organizer') {
      nextRole = 'organizer';
    }

    // Admin role is reserved for one fixed credential pair only.
    if (role === 'admin' && !isReservedAdmin(normalizedEmail, password)) {
      return res.status(403).json({
        success: false,
        message: 'Admin role is restricted to authorized credentials only'
      });
    }

    if (isReservedAdmin(normalizedEmail, password)) {
      nextRole = 'admin';
    }

    if (normalizedEmail === ADMIN_EMAIL && password !== ADMIN_PASSWORD) {
      return res.status(403).json({
        success: false,
        message: 'Reserved admin email must use the authorized admin password'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: nextRole,
      phone
    });

    sendTokenResponse(user, 201, res, req);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = (email || '').toLowerCase();

    if (normalizedEmail === ADMIN_EMAIL && password !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check for user
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Keep admin account restricted to one known email/password identity.
    if (normalizedEmail === ADMIN_EMAIL && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    if (normalizedEmail !== ADMIN_EMAIL && user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access is reserved for authorized admin account only'
      });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Login role mismatch. Your account role is '${user.role}'.`
      });
    }

    sendTokenResponse(user, 200, res, req);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Forgot password (simple reset by email)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const normalizedEmail = (email || '').toLowerCase();

    if (normalizedEmail === ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: 'Admin password cannot be reset from this endpoint'
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update payment details
// @route   PUT /api/auth/payment-details
// @access  Private (Organizer/Admin)
exports.updatePaymentDetails = async (req, res) => {
  try {
    const { bankName, accountNumber, ifscCode, upiId, accountHolderName } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.paymentDetails = {
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      accountHolderName,
      verified: false // Admin will verify later
    };

    await user.save();

    // Notify admins about the payment details update
    try {
      const admins = await User.find({ role: 'admin' });
      admins.forEach(admin => {
        console.log(`[EMAIL SIMULATION] To: ${admin.email}`);
        console.log(`Subject: Action Required: Organizer Payment Details Updated`);
        console.log(`Body: Organizer ${user.name} (${user.email}) has updated their payment details. Please log in to the admin panel to verify them.\n`);
        
        // TODO: Replace with actual email service (e.g., Nodemailer, SendGrid)
        // sendEmail({
        //   to: admin.email,
        //   subject: 'Action Required: Organizer Payment Details Updated',
        //   text: `Organizer ${user.name} (${user.email}) has updated their payment details. Please log in to the admin panel to verify them.`
        // });
      });
    } catch (notifyError) {
      console.error('Failed to notify admins:', notifyError);
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = async (user, statusCode, res, req = null) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + getCookieExpireDays() * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // Log admin login
  if (user.role === 'admin' && req) {
    await logAdminAction(
      { ...req, user },
      'login',
      { details: { loginTime: new Date() } }
    );
  }

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};
