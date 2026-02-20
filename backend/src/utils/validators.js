const validator = require("validator");

const validateUrl = (url) => {
  if (!url) return false;

  // Add http:// if no protocol is specified
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "http://" + url;
  }

  return validator.isURL(url, {
    protocols: ["http", "https"],
    require_protocol: true,
    require_valid_protocol: true,
  });
};

const validateCustomAlias = (alias) => {
  if (!alias) return false;

  const aliasRegex = /^[a-zA-Z0-9-]+$/;
  return aliasRegex.test(alias) && alias.length >= 4 && alias.length <= 30;
};

module.exports = {
  validateUrl,
  validateCustomAlias,
};
