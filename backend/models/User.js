const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getJwtExpiresIn = () => {
  const rawValue = process.env.JWT_EXPIRE;
  if (!rawValue) {
    return '7d';
  }

  const trimmed = String(rawValue).trim();
  if (!trimmed) {
    return '7d';
  }

  // Accept numeric seconds as either number-like string or number.
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  // Accept ms-style timespan values such as "7d", "12h", "30m".
  if (/^\d+\s*[smhdwy]$/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, '');
  }

  console.warn(`Invalid JWT_EXPIRE value "${trimmed}". Falling back to 7d.`);
  return '7d';
};

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'organizer', 'admin'],
    default: 'user'
  },
  phone: {
    type: String,
    trim: true
  },
  profile: {
    bio: String,
    company: String,
    position: String,
    website: String,
    avatar: String,
    socialLinks: {
      twitter: String,
      linkedin: String,
      facebook: String,
      instagram: String
    }
  },
  paymentDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    upiId: String,
    accountHolderName: String,
    verified: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: getJwtExpiresIn()
  });
};

module.exports = mongoose.model('User', UserSchema);
