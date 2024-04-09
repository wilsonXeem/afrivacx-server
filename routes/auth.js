const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const multer = require("multer");

const authController = require("../controller/auth");

const upload = multer({ dest: "./util/images" });

router.get("/", authController.getUsers);
router.post("/", upload.single("image"), authController.something);
router.post("/signup", upload.single("image"), authController.userSignup);
router.post("/board", upload.single("image"), authController.boardSignup);
router.post(
  "/signin",
  [
    body("email", "email is invalid").isEmail().not().isEmpty(),
    body("password", "password should not be less than 8 characters long")
      .isLength({ min: 8 })
      .not()
      .isEmpty(),
  ],
  authController.userLogin
);
router.post(
  "/password-reset",
  [body("email", "Please input a valid email").isEmail().not().isEmpty()],
  authController.passwordReset
);
router.get("/password-reset/:email", authController.getPasswordToken);
router.post("/password-reset/:resetToken", authController.passwordChange);

module.exports = router;
