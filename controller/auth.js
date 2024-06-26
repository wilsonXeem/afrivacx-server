const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const crypto = require("crypto");

dotenv.config();

const User = require("../model/user");
const Board = require("../model/board");

const error = require("../util/error-handling/errorHandler");

const { userExists } = require("../util/user");
const { uploadImage } = require("../util/images/images");

/**************
 * User Signup*
 * ************/
module.exports.userSignup = async (req, res, next) => {
  const email = req.body.email,
    firstName = req.body.firstName,
    lastName = req.body.lastName,
    password = req.body.password,
    phoneNumber = req.body.phoneNumber,
    gender = req.body.gender,
    state = req.body.state,
    address = req.body.address,
    position = req.body.position,
    zone = req.body.zone,
    title = req.body.title, file=req.file;

  try {
    // Check if a email already exist
    const emailExist = await userExists("email", email);
    if (emailExist) {
      error.errorHandler(res, "email already exists", "email");
    } else {
      let imageUrl, imageId;
      if (file) {
        const uploadedImage = await uploadImage(res, file.path);
        imageUrl = uploadedImage.imageUrl;
        imageId = uploadedImage.imageId;
      }
      
      // Continue if there are no errors
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create new user object
      const user = new User({
        firstName,
        lastName,
        details: {
          email,
          phoneNumber,
          state,
          address,
          zone,
          position,
          title,
        },
        password: hashedPassword,
        profileImage: { imageUrl, imageId },
      });

      // Save user in database
      const newUser = await user.save();

      // Send response back to client
      res
        .status(200)
        .json({ message: "Sign up successful", type: "user", newUser });
    }
  } catch (err) {
    error.error(err, next);
  }
};

/****************
 * Board Signup *
 * **************/
module.exports.boardSignup = async (req, res, next) => {
  const email = req.body.email,
    firstName = req.body.firstName,
    lastName = req.body.lastName,
    password = req.body.password,
    phoneNumber = req.body.phoneNumber,
    gender = req.body.gender,
    state = req.body.state,
    address = req.body.address,
    position = req.body.position,
    zone = req.body.zone,
    title = req.body.title;

  try {
    // Check for validation errors
    const validatorErrors = validationResult(req);
    error.validationError(validatorErrors, res);

    // Check if a email already exist
    const emailExist = await Board.findOne({ details: { email: email } });
    if (emailExist) {
      error.errorHandler(res, "email already exists", "email");
    } else {
      // Continue if there are no errors
      const hashedPassword = await bcrypt.hash(password, 12);

      let imageUrl, imageId;
      if (req.file) {
        const uploadedImage = await uploadImage(res, req.file.path);
        imageUrl = uploadedImage.imageUrl;
        imageId = uploadedImage.imageId;
      }

      // Create new user object
      const user = new Board({
        firstName,
        lastName,
        details: {
          email,
          phoneNumber,
          state,
          address,
          zone,
          position,
          title,
        },
        password: hashedPassword,
        profileImage: { imageUrl, imageId },
      });

      // Save user in database
      const newUser = await user.save();

      // Send response back to client
      res
        .status(200)
        .json({ message: "Sign up successful", type: "user", newUser });
    }
  } catch (err) {
    error.error(err, next);
  }
};

/**************
 * User Login *
 **************/
module.exports.userLogin = async (req, res, next) => {
  const email = req.body.email,
    password = req.body.password;

  try {
    // Check for validation errors
    const validatorErrors = validationResult(req);
    error.validationError(validatorErrors);

    // Check if user exists
    const user = await userExists("email", email);

    if (!user) error.errorHandler(res, "incorrect email", "email");

    // Check for password match
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch)
      error.errorHandler(res, "Incorrect password", "password");

    // Continue if there are no errors

    // Create jsonwebtoken
    const token = jwt.sign(
      { user: user, email: user.email },
      process.env.jwtKey,
      { algorithm: "HS256", expiresIn: process.env.jwtExpirySeconds }
    );

    // Send response to client
    res.status(200).json({ token });
  } catch (err) {
    error.error(err, next);
  }
};

/******************
 * Password Reset *
 ******************/
module.exports.passwordReset = async (req, res, next) => {
  const email = req.body.email;

  try {
    // Check if user exists with email
    const user = await User.findOne(
      { "details.email": email },
      "details resetToken resetExpiration"
    );

    // Check for validation errors
    const validatorErrors = validationResult(req);
    error.validationError(validatorErrors, res);

    // Check if user is undefined
    if (!user) error.errorHandler(res, "No user found with email", "email");

    // Continue if there are no errors

    // Generate random reset token
    const resetToken = await crypto.randomBytes(32).toString("hex");

    // Calculate passwordExpiration
    const resetExpiration = Date.now() + 3600000;

    // Update found user object
    user.resetToken = resetToken;
    user.resetExpiration = resetExpiration;

    // Send password reset mail to user

    // Save user updates to database
    await user.save();

    // Send response to client
    res.status(200).json({
      message: "A password reset link has been sent to your email",
      type: "password reset",
      resetToken,
    });
  } catch (err) {
    error.error(err);
  }
};

/***********************
 * Get Password Token *
 ***********************/
module.exports.getPasswordToken = async (req, res, next) => {
  const email = req.params.email;

  try {
    // Check for matching token on a user
    const user = await User.findOne(
      { "details.email": email },
      "resetToken resetExpiration"
    );

    // Check if user is undefined
    if (!user) error.errorHandler(res, "Invalid user", "token");

    // Check if token has expired
    if (user.resetExpiration < Date.now()) {
      // Clear user resetToken and expiration
      user.resetToken = undefined;
      user.resetExpiration = undefined;

      // Save user to database
      await user.save();
      error.errorHandler(res, "password reset session has expired", "message");
    }

    res.status(200).json({ token: user.resetToken });
  } catch (err) {
    error.error(err, next);
  }
};

/******************
 * Password Change *
 ******************/
module.exports.passwordChange = async (req, res, next) => {
  const resetToken = req.params.resetToken,
    password = req.body.password;

  try {
    // Get user
    const user = await User.findOne({ resetToken }, "password resetToken");

    // Check if user is undefined
    if (!user) error.errorHandler(res, "No user found", "user");

    // Continue if there are no errors

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Assign new password to user
    user.password = hashedPassword;

    // Remove resetToken/Expiration
    user.resetToken = undefined;
    user.resetExpiration = undefined;

    //  Save user changes to database
    await user.save();

    // Send response back to client
    res
      .status(201)
      .json({ message: "password successfully changed", type: "password" });
  } catch (err) {
    error.error(err, next);
  }
};

/*****************
 * Get all Users *
 *****************/
module.exports.getUsers = async (req, res, next) => {
  try {
    // Get user
    const users = await User.find();

    // Check if user is undefined
    if (!users) error.errorHandler(res, "No user found", "user");

    // Send response back to client
    res
      .status(201)
      .json({ message: "users fetched", users});
  } catch (err) {
    error.error(err, next);
  }
};

/*****************
 * try something *
 *****************/
module.exports.something = async (req, res, next) => {
  const userId = req.body.userId
  try {
    // Get user
    const user = await User.findById(userId);

    // Check if user is undefined
    if (!user) error.errorHandler(res, "No user found", "user");

    let imageUrl, imageId
    if(req.file){
      console.log(req.file)
    }

    // Send response back to client
    res
      .status(201)
      .json({ message: "image uploaded successfully"});
  } catch (err) {
    error.error(err, next);
  }
};
