const express = require("express");
const router = express.Router();

const verifyToken = require("../helpers/verify-token");
const { imageUpload } = require("../helpers/image-upload");

const PetController = require("../controllers/PetController");

router.post(
  "/create",
  verifyToken,
  imageUpload.array("images"),
  PetController.create,
);
router.get("/", PetController.getAll);
router.get("/mypets", verifyToken, PetController.getMyPets);
router.get("/myadoptions", verifyToken, PetController.getPetsAdopted);
router.get("/:id", PetController.getPetById);
router.delete("/delete/:id", verifyToken, PetController.deletePetById);
router.patch(
  "/edit/:id",
  verifyToken,
  imageUpload.array("images"),
  PetController.editPet,
);
router.patch("/schedule/:id", verifyToken, PetController.schedule);
router.patch("/petadopted/:id", verifyToken, PetController.petAdopted);

module.exports = router;
