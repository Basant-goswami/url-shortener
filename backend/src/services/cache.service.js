const redisClient = require("../config/redis");

exports.cacheUrl = async (shortCode, longUrl) => {
  try {
    const client = redisClient.getClient();
    await client.setex(`url:${shortCode}`, 3600, longUrl);
  } catch (error) {
    // ignore
  }
};

exports.removeFromCache = async (shortCode) => {
  try {
    const client = redisClient.getClient();
    await client.del(`url:${shortCode}`);
  } catch (error) {
    // ignore
  }
};
