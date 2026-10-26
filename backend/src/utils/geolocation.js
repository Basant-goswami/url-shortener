// backend/src/utils/geolocation.js

const axios = require("axios");

/**
 * Get country from IP address using free API
 * Uses ip-api.com (free, no API key required)
 */
async function getCountryFromIP(ip) {
  // Skip for localhost
  if (ip === "::1" || ip === "127.0.0.1" || ip === "localhost") {
    return "Localhost";
  }

  try {
    // ip-api.com free API (no key needed, 45 requests/minute limit)
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 3000,
      params: {
        fields: "country,countryCode,city,region,lat,lon",
      },
    });

    if (response.data && response.data.country) {
      return {
        country: response.data.country,
        countryCode: response.data.countryCode,
        city: response.data.city,
        region: response.data.region,
        lat: response.data.lat,
        lon: response.data.lon,
      };
    }

    return null;
  } catch (error) {
    console.error("GeoLocation API error:", error.message);
    return null;
  }
}

/**
 * Get location info (async, with timeout)
 */
async function getLocationInfo(ip) {
  try {
    const location = await getCountryFromIP(ip);
    if (location) {
      return {
        country: location.country || "Unknown",
        countryCode: location.countryCode || "Unknown",
        city: location.city || "Unknown",
        region: location.region || "Unknown",
      };
    }
    return {
      country: "Unknown",
      countryCode: "Unknown",
      city: "Unknown",
      region: "Unknown",
    };
  } catch (error) {
    return {
      country: "Unknown",
      countryCode: "Unknown",
      city: "Unknown",
      region: "Unknown",
    };
  }
}

module.exports = {
  getCountryFromIP,
  getLocationInfo,
};
