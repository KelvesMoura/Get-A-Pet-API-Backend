const mongoose = require("mongoose");
const Pet = require("../models/Pet");
const fs = require("fs/promises");
const path = require("path");

const getToken = require("../helpers/get-token");
const getUserByToken = require("../helpers/get-user-by-token");
const ObjectId = require("mongoose").Types.ObjectId;

module.exports = class PetController {
  static async create(req, res) {
    try {
      const { name, age, weight, color } = req.body;

      const available = true;

      let images = req.files;

      const fieldValidations = {
        name: "nome",
        age: "idade",
        weight: "peso",
        color: "cor",
      };

      for (const campo in fieldValidations) {
        if (!req.body[campo]) {
          res.status(422).json({
            message: `O campo ${fieldValidations[campo]} é obrigatório`,
          });
        }
      }

      if (images.length === 0)
        return res
          .status(422)
          .json({ message: "O campo de imagem é obrigatória!" });

      const token = getToken(req);
      const user = await getUserByToken(token);

      const pet = new Pet({
        name,
        age,
        weight,
        color,
        available,
        images: [],
        user: {
          _id: user.id,
          name: user.name,
          image: user.image,
          phone: user.phone,
        },
      });

      images.map((image) => pet.images.push(image.filename));

      const newPet = await pet.save();

      res.status(201).json({ message: "Pet criado com sucesso", newPet });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const pets = await Pet.find().sort("-createdAt").skip(skip).limit(limit);

      const totatlPets = await Pet.countDocuments();

      const hasNextPage = totatlPets > page * limit;

      res.status(200).json({ pets, currentPage: page, hasNextPage });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async getMyPets(req, res) {
    try {
      const token = getToken(req);
      const user = await getUserByToken(token);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const pets = await Pet.find({ "user._id": `${user._id}` })
        .sort("-createdAt")
        .skip(skip)
        .limit(limit);

      const totatlPets = await Pet.countDocuments({
        "user._id": `${user._id}`,
      });

      const hasNextPage = totatlPets > page * limit;

      res.status(200).json({ pets, currentPage: page, hasNextPage });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }
  static async getPetsAdopted(req, res) {
    try {
      const token = getToken(req);
      const user = await getUserByToken(token);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const pets = await Pet.find({ "adopter._id": `${user._id}` })
        .sort("-createdAt")
        .skip(skip)
        .limit(limit);

      const totatlPets = await Pet.countDocuments({
        "user._id": `${user._id}`,
      });

      const hasNextPage = totatlPets > page * limit;

      res.status(200).json({ pets, currentPage: page, hasNextPage });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async getPetById(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        res.status(422).json({
          message: `ID inválido`,
        });
        return;
      }

      const pet = await Pet.findById(id);

      if (!pet) {
        res.status(404).json({
          message: "Pet não encontrado",
        });
        return;
      }

      res.status(200).json({ pet: pet });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" + err });
    }
  }

  static async deletePetById(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        res.status(422).json({
          message: `ID inválido`,
        });
        return;
      }
      const pet = await Pet.findById(id);

      if (!pet) {
        res.status(404).json({
          message: "Pet não encontrado",
        });
        return;
      }

      const token = getToken(req);
      const user = await getUserByToken(token);

      if (user._id.toString() !== pet.user._id) {
        res.status(422).json({
          message:
            "Erro ao processar sua solicitação, tente novamente mais tarde",
        });
        return;
      }

      await Pet.findByIdAndDelete(id);

      res.status(200).json({ message: "Pet deletado com sucesso" });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async editPet(req, res) {
    try {
      const { id } = req.params;

      const { name, age, weight, color, available } = req.body;

      const images = req.files;

      const updatedData = {};

      const pet = await Pet.findById(id);

      if (!pet) {
        return res.status(404).json({
          message: "Pet não encontrado",
        });
      }

      const fieldValidations = {
        name: "nome",
        age: "idade",
        weight: "peso",
        color: "cor",
        available: "disponível",
      };

      const token = getToken(req);
      const user = await getUserByToken(token);

      if (user._id.toString() !== pet.user._id) {
        return res.status(422).json({
          message:
            "Erro ao processar sua solicitação, tente novamente mais tarde",
        });
      }

      for (const campo in fieldValidations) {
        if (!req.body[campo]) {
          return res.status(422).json({
            message: `O campo ${fieldValidations[campo]} é obrigatório`,
          });
        }
        updatedData[campo] = req.body[campo];
      }

      if (images.length === 0 && pet.images.length === 0) {
        return res
          .status(422)
          .json({ message: "O campo de imagem é obrigatória!" });
      }

      updatedData.images = pet.images;

      if (images.length > 0) {
        images.forEach((image) => updatedData.images.push(image.filename));
      }

      await Pet.findByIdAndUpdate(id, updatedData);

      res
        .status(200)
        .json({ message: "Pet atualizado com sucesso", pet: updatedData });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async schedule(req, res) {
    try {
      const { id } = req.params;

      const pet = await Pet.findById(id);

      if (!pet) {
        return res.status(404).json({
          message: "Pet não encontrado",
        });
      }

      const token = getToken(req);
      const user = await getUserByToken(token);

      if (user._id.toString() === pet.user._id) {
        return res.status(422).json({
          message: "Você não pode agendar uma visita para o próprio Pet!",
        });
      }

      if (pet.adopter) {
        if (pet.adopter._id === user.id) {
          return res.status(422).json({
            message: "Você já agendou uma visita para este Pet!",
          });
        }
      }
      pet.adopter = {
        _id: user.id,
        name: user.name,
        image: user.image,
      };

      await Pet.findByIdAndUpdate(id, pet);

      res.status(200).json({
        message: `Agendamento realizado com sucesso! Entre em contato com ${pet.user.name} pelo telefone ${pet.user.phone}`,
      });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async cancelSchedule(req, res) {
    try {
      const { id } = req.params;

      const pet = await Pet.findById(id);

      if (!pet) {
        return res.status(404).json({
          message: "Pet não encontrado",
        });
      }

      const token = getToken(req);
      const user = await getUserByToken(token);

      if (pet.adopter) {
        if (pet.adopter._id !== user.id && pet.user._id !== user.id) {
          return res.status(422).json({
            message: "Você não pode cancelar a visita de outro usuário!",
          });
        }
      }

      await Pet.findByIdAndUpdate(
        id,
        { $unset: { adopter: "" } },
        { new: true },
      );

      res.status(200).json({
        message: `Agendamento cancelado com sucesso!`,
      });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async petAdopted(req, res) {
    try {
      const { id } = req.params;
      const { available } = req.body;

      const pet = await Pet.findById(id);

      if (!pet) {
        return res.status(404).json({
          message: "Pet não encontrado",
        });
      }

      const token = getToken(req);
      const user = await getUserByToken(token);

      if (user._id.toString() !== pet.user._id) {
        return res.status(422).json({
          message:
            "Erro ao processar sua solicitação, tente novamente mais tarde",
        });
      }

      let message = "";

      !available
        ? (message = "Parabéns, processo de adoção finalizado com sucesso!")
        : (message = "Pet liberado para adoção!");

      pet.available = available;

      await Pet.findByIdAndUpdate(id, pet);

      res.status(200).json({
        message: message,
      });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" });
    }
  }

  static async deleteImage(req, res) {
    try {
      const { id } = req.params;

      const { id_photo } = req.body;

      const token = getToken(req);
      const user = await getUserByToken(token);

      const pet = await Pet.findById(id);

      if (!pet) {
        return res.status(404).json({
          message: "Pet não encontrado",
        });
      }

      if (user._id.toString() !== pet.user._id) {
        return res.status(422).json({
          message:
            "Erro ao processar sua solicitação, tente novamente mais tarde",
        });
      }

      const imagePath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "images",
        "pets",
        `${id_photo}`,
      );

      await fs.unlink(imagePath);

      await Pet.findByIdAndUpdate(id, { $pull: { images: id_photo } });

      res.status(200).json({
        message: "Imagem removida com sucesso!",
      });
    } catch (err) {
      res.status(500).json({ message: "Erro no servidor" + err });
    }
  }
};
