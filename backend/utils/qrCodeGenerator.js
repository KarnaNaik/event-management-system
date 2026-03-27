const QRCode = require('qrcode');

// Generate QR code as Data URL
exports.generateQRCode = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(data));
    return qrCodeDataURL;
  } catch (error) {
    throw new Error('QR Code generation failed');
  }
};

// Generate QR code as Buffer
exports.generateQRCodeBuffer = async (data) => {
  try {
    const qrCodeBuffer = await QRCode.toBuffer(JSON.stringify(data));
    return qrCodeBuffer;
  } catch (error) {
    throw new Error('QR Code generation failed');
  }
};

// Verify QR code data
exports.verifyQRData = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    return {
      valid: true,
      data
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid QR code data'
    };
  }
};
