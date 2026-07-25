const jwt = require("jsonwebtoken");
const getToken = require("./get-token");

const verifyToken = async (req, res, next) => {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ message: "Acesso Negado" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(400).json({ message: "Token Inválido" });
  }
};

module.exports = verifyToken;
