const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const conn = require("./src/database/conn");

//Require Routes
const UserRoutes = require("./src/routes/UserRoutes");
const PetRoutes = require("./src/routes/PetRoutes");

const app = express();
const port = process.env.BACK_PORT_HOST;

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

const corsOptions = {
  origin: process.env.URL_FRONT,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-type"],
};

app.use(cors(corsOptions));

//Cookies
app.use(cookieParser());

// Routes
app.use("/users", UserRoutes);
app.use("/pets", PetRoutes);

app.listen(port, () => console.log("Server Online"));
