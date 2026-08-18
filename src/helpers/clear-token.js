const clearToken = async (res) => {
  res
    .set("Cache-Control", "no-store")
    .clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
    })
    .status(200)
    .json({ message: "Logout realizado com Sucesso!" });
};

module.exports = clearToken;
