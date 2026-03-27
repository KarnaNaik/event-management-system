const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/profile/organizers/all
// @desc    Get all organizer profiles
// @access  Public
router.get('/organizers/all', async (req, res) => {
  try {
    const organizers = await User.find({ 
      role: { $in: ['organizer', 'admin'] } 
    }).select('-password');
    
    res.json(organizers);
  } catch (error) {
    console.error('Error fetching organizers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/profile/:userId
// @desc    Get user profile
// @access  Public
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', protect, async (req, res) => {
  try {
    const {
      name,
      phone,
      bio,
      company,
      position,
      website,
      avatar,
      socialLinks
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if they are provided in the request body
    if (name) user.name = name;
    if (phone) user.phone = phone;

    // Ensure profile object exists before updating
    user.profile = user.profile || {};
    if (bio !== undefined) user.profile.bio = bio;
    if (company !== undefined) user.profile.company = company;
    if (position !== undefined) user.profile.position = position;
    if (website !== undefined) user.profile.website = website;
    if (avatar !== undefined) user.profile.avatar = avatar;
    
    if (socialLinks) {
      user.profile.socialLinks = { ...(user.profile.socialLinks || {}), ...socialLinks };
    }

    await user.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
