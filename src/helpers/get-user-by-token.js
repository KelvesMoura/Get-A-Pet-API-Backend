const jwt = require("jsonwebtoken");

const User = require("../models/User");

const getUserByToken = async (token) => {
  if (!token) {
    return res.status(401).json({ message: "Acesso Negado" });
  }

  const verified = jwt.verify(token, process.env.JWT_SECRET);
  const userId = verified.id;

  const user = await User.findById(userId);

  return user;
};

module.exports = getUserByToken;
