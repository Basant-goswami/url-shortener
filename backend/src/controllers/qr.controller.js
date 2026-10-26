const QRCode = require("qrcode");
const { Url } = require("../models");
const { sendResponse, sendError } = require("../utils/apiResponse");
const { catchAsync } = require("../utils/errorHandler");

// ============ GENERATE QR CODE (Data URL) ============
exports.generateQR = catchAsync(async (req, res) => {
  const { shortCode } = req.params;
  const { size = 300, color = "#0ea5e9", bgColor = "#ffffff" } = req.query;

  // console.log(`📱 Generating QR for: ${shortCode}`);

  const url = await Url.findOne({ shortCode });
  if (!url) {
    return sendError(res, 404, "URL not found");
  }

  const shortUrl = `${process.env.BASE_URL || "http://localhost:5000"}/${shortCode}`;

  const qrOptions = {
    width: parseInt(size) || 300,
    margin: 2,
    color: {
      dark: color || "#0ea5e9",
      light: bgColor || "#ffffff",
    },
    errorCorrectionLevel: "H",
  };

  try {
    // Generate QR as data URL
    const qrDataUrl = await QRCode.toDataURL(shortUrl, qrOptions);

    // console.log(`✅ QR generated for: ${shortCode}`);

    sendResponse(
      res,
      200,
      {
        qrCode: qrDataUrl,
        shortCode,
        shortUrl,
        size: parseInt(size) || 300,
      },
      "QR Code generated successfully",
    );
  } catch (qrError) {
    console.error("QR Generation error:", qrError);
    return sendError(res, 500, "Failed to generate QR code");
  }
});

// ============ DOWNLOAD QR CODE ============
exports.downloadQR = catchAsync(async (req, res) => {
  const { shortCode } = req.params;
  const {
    size = 300,
    color = "#0ea5e9",
    bgColor = "#ffffff",
    format = "png",
  } = req.query;

  const url = await Url.findOne({ shortCode });
  if (!url) {
    return sendError(res, 404, "URL not found");
  }

  const shortUrl = `${process.env.BASE_URL || "http://localhost:5000"}/${shortCode}`;

  const qrOptions = {
    width: parseInt(size) || 300,
    margin: 2,
    color: {
      dark: color || "#0ea5e9",
      light: bgColor || "#ffffff",
    },
    errorCorrectionLevel: "H",
  };

  try {
    if (format === "svg") {
      const svgString = await QRCode.toString(shortUrl, {
        ...qrOptions,
        type: "svg",
      });
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=qrcode-${shortCode}.svg`,
      );
      return res.send(svgString);
    }

    // Default PNG
    const buffer = await QRCode.toBuffer(shortUrl, qrOptions);
    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=qrcode-${shortCode}.png`,
    );
    res.send(buffer);
  } catch (qrError) {
    console.error("QR Download error:", qrError);
    return sendError(res, 500, "Failed to download QR code");
  }
});
