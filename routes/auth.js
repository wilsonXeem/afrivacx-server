const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const multer = require("multer");
const upload = multer({ dest: "./util/images" });

const authController = require("../controller/auth");

router.post("/signup", upload.single("file"), authController.userSignup);
router.post("/board", upload.single("file"), authController.boardSignup);
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
