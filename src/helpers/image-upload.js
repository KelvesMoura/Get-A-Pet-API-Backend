const multer = require("multer");
const path = require("path");

const imageStore = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "";

    if (req.baseUrl.includes("users")) {
      folder = "users";
    } else if (req.baseUrl.includes("pets")) {
      folder = "pets";
    }
    cb(null, `public/images/${folder}`);
  },
  filename: function (req, file, cb) {
    //Utilizado para criar um sufix diferente, em caso de subir multiples files
    const sufixUnique = Math.floor(Math.random() * 1e5);

    cb(null, Date.now() + "-" + sufixUnique + path.extname(file.originalname));
  },
});

const imageUpload = multer({
  storage: imageStore,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(png|jpg|webp)$/)) {
      return cb(new Error("Por favor, envie apenas jpg, png ou webp"));
    }
    cb(undefined, true);
  },
});

module.exports = { imageUpload };
