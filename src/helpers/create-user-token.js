const jwt = require("jsonwebtoken");

const createUserToken = async (user, req, res) => {
  const token = await jwt.sign(
    {
      name: user.name,
      id: user._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "production",
    sameSite: "lax",
    maxAge: 3600000,
  });

  res
    .status(200)
    .json({ message: "Você está autenticado", token: token, userId: user._id });
};

module.exports = createUserToken;
