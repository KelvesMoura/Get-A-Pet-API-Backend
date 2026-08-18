const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const createUserToken = require("../helpers/create-user-token");
const getToken = require("../helpers/get-token");
const clearToken = require("../helpers/clear-token");
const getUserByToken = require("../helpers/get-user-by-token");

const User = require("../models/User");

module.exports = class HomeController {
  static async create(req, res) {
    try {
      const { name, email, password, phone, confirmPassword } = req.body;

      const fieldValidations = {
        name: "nome",
        email: "email",
        phone: "telefone",
        password: "senha",
        confirmPassword: "confirmação de senha",
      };

      for (const campo in fieldValidations) {
        if (!req.body[campo])
          return res.status(422).json({
            message: `O campo ${fieldValidations[campo]} é obrigatório`,
          });
      }

      if (password !== confirmPassword)
        return res.status(422).json({
          message: "A senha e a confirmação de senha são diferentes",
        });

      if (!email.includes("@")) {
        return res.status(422).json({
          message: "Insira o email corretamente.",
        });
      }

      const userExists = await User.findOne({ email: email });

      if (userExists) {
        return res.status(422).json({
          message: "Por favor, utilize outro email!",
        });
      }

      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(password, salt);

      const user = new User({
        name,
        email,
        password: hash,
        phone,
      });

      const newUser = await user.save();

      await createUserToken(newUser, req, res);
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const fieldValidations = {
        email: "email",
        password: "senha",
      };

      for (const campo in fieldValidations) {
        if (!req.body[campo])
          return res.status(422).json({
            message: `O campo ${fieldValidations[campo]} é obrigatório`,
          });
      }

      if (!email.includes("@")) {
        return res.status(422).json({
          message: "Insira o email corretamente.",
        });
      }

      const userExists = await User.findOne({ email: email });

      if (!userExists) {
        return res.status(422).json({
          message: "Usuário não cadastrado!",
        });
      }

      const checkPassword = await bcrypt.compare(password, userExists.password);

      if (!checkPassword) {
        return res.status(422).json({
          message: "Senha Incorreta!",
        });
      }

      await createUserToken(userExists, req, res);
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async checkUser(req, res) {
    try {
      let currentUser;

      if (req.cookies.access_token) {
        const token = getToken(req);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        currentUser = await User.findById(decoded.id);
      } else {
        currentUser = null;
      }
      res
        .status(200)
        .json({ message: "Usuário Autenticado", id: currentUser._id });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id).select("-password");

      if (!user) {
        return res.status(422).json({
          message: "Usuário não encontrado!",
        });
      }

      res.status(200).json({ user });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async editUser(req, res) {
    try {
      const { id } = req.params;

      const token = getToken(req);
      const user = await getUserByToken(token);

      if (!user) {
        return res.status(422).json({
          message: "Usuário não encontrado!",
        });
      }

      const { name, email, password, phone, confirmPassword } = req.body;

      let image = "";

      if (req.file) {
        user.image = req.file.filename;
      }

      const fieldValidations = {
        name: "nome",
        email: "email",
        phone: "telefone",
        password: "senha",
        confirmPassword: "confirmação de senha",
      };

      for (const campo in fieldValidations) {
        if (!req.body[campo])
          return res.status(422).json({
            message: `O campo ${fieldValidations[campo]} é obrigatório`,
          });
      }

      user.phone = phone;

      if (password !== confirmPassword) {
        return res.status(422).json({
          message: "A senha e a confirmação de senha são diferentes",
        });
      } else if (password === confirmPassword && password != null) {
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(password, salt);
        user.password = hash;
      }

      if (!email.includes("@")) {
        return res.status(422).json({
          message: "Insira o email corretamente.",
        });
      }

      const userExists = await User.findOne({ email: email });

      if (user.email !== email && userExists) {
        return res.status(422).json({
          message: "Por favor, utilze outro e-mail!",
        });
      }

      const updateUser = await User.findByIdAndUpdate(
        { _id: user._id },
        { $set: user },
        { new: true },
      );

      res.status(200).json({ message: "Usuário Atualizado com Sucesso!" });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async logout(req, res) {
    try {
      await clearToken(res);
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }
};
