const path = require('path');
const fs = require('fs');

// @desc    Upload event poster
// @route   POST /api/upload/poster
// @access  Private (Organizer/Admin)
exports.uploadPoster = async (req, res) => {
  try {
    if (!req.files || !req.files.poster) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a poster image'
      });
    }

    const file = req.files.poster;

    // Check file type
    if (!file.mimetype.startsWith('image')) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Check file size (max 5MB)
    if (file.size > 5000000) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image less than 5MB'
      });
    }

    // Create uploads folder if it doesn't exist
    const uploadDir = path.join(__dirname, '../uploads/posters');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Create custom filename
    const fileName = `poster_${Date.now()}${path.extname(file.name)}`;
    const uploadPath = path.join(uploadDir, fileName);

    // Move file
    await file.mv(uploadPath);

    res.status(200).json({
      success: true,
      data: {
        fileName: fileName,
        filePath: `/uploads/posters/${fileName}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete poster
// @route   DELETE /api/upload/poster/:fileName
// @access  Private
exports.deletePoster = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../uploads/posters', req.params.fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({
        success: true,
        message: 'Poster deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Poster not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
