const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Convert number to Base62 string
 * Example: 123456 -> "w7e"
 */
const encodeBase62 = (num) => {
  if (num === 0) return BASE62[0];

  let result = "";
  while (num > 0) {
    const remainder = num % 62;
    result = BASE62[remainder] + result;
    num = Math.floor(num / 62);
  }
  return result;
};

/**
 * Convert Base62 string back to number
 * Example: "w7e" -> 123456
 */
const decodeBase62 = (str) => {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = BASE62.indexOf(char);
    result = result * 62 + value;
  }
  return result;
};

/**
 * Generate random short code
 * Length = 6 characters (default)
 */
const generateRandomCode = (length = 6) => {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * 62);
    result += BASE62[randomIndex];
  }
  return result;
};

module.exports = {
  BASE62,
  encodeBase62,
  decodeBase62,
  generateRandomCode,
};
