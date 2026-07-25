const jwt = require("jsonwebtoken");

const getToken = (req) => {
  const token = req.cookies?.access_token;
  return token;
};

module.exports = getToken;
