const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide event title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide event description']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'volunteer', 'viewer', 'co_organizer'],
      default: 'viewer'
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  hosts: [{
    name: String,
    email: String,
    bio: String,
    avatar: String,
    role: String
  }],
  coHosts: [{
    name: String,
    email: String,
    bio: String,
    avatar: String
  }],
  speakers: [{
    name: String,
    email: String,
    bio: String,
    topic: String,
    avatar: String,
    company: String,
    position: String,
    socialLinks: {
      twitter: String,
      linkedin: String
    }
  }],
  category: {
    type: String,
    enum: ['conference', 'workshop', 'seminar', 'concert', 'sports', 'other'],
    default: 'other'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },
  eventFormat: {
    type: String,
    enum: ['offline', 'online', 'hybrid'],
    default: 'offline'
  },
  onlineLink: {
    type: String,
    trim: true
  },
  theme: {
    type: String,
    enum: ['minimal', 'festive', 'corporate', 'dark'],
    default: 'minimal'
  },
  ageRestriction: {
    type: String,
    default: 'All Ages'
  },
  registrationSettings: {
    isClosed: {
      type: Boolean,
      default: false
    },
    closeAt: {
      type: Date
    },
    approvalMode: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto'
    }
  },
  paymentOptions: {
    isFreeEvent: {
      type: Boolean,
      default: false
    },
    upiQrEnabled: {
      type: Boolean,
      default: true
    },
    cardEnabled: {
      type: Boolean,
      default: true
    },
    bankTransferEnabled: {
      type: Boolean,
      default: false
    },
    allowPartialPayment: {
      type: Boolean,
      default: false
    },
    donationEnabled: {
      type: Boolean,
      default: false
    }
  },
  venue: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: String,
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  startDate: {
    type: Date,
    required: [true, 'Please provide start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide end date']
  },
  ticketTypes: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    sold: {
      type: Number,
      default: 0
    },
    description: String
  }],
  image: {
    type: String,
    default: 'default-event.jpg'
  },
  posterUrl: {
    type: String
  },
  posterPublicId: {
    type: String
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  maxAttendees: {
    type: Number,
    required: true
  },
  currentAttendees: {
    type: Number,
    default: 0
  },
  editHistory: [{
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
EventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', EventSchema);
