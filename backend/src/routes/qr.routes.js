const express = require("express");
const router = express.Router();
const qrController = require("../controllers/qr.controller");

// Generate QR code (returns data URL)
router.get("/:shortCode", qrController.generateQR);

// Download QR code
router.get("/:shortCode/download", qrController.downloadQR);

module.exports = router;
