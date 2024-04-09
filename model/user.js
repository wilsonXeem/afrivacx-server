const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    loggedIn: { type: Boolean, default: false },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      // required: true,
    },
    profileImage: {
      imageUrl: {
        type: String,
        required: true,
      },
      imageId: {
        type: String,
        required: true,
      },
    },
    bannerImage: {
      imageUrl: {
        type: String,
        // required: true,
      },
      imageId: {
        type: String,
        // required: true,
      },
    },
    details: {
      email: {
        type: String,
        lowercase: true,
        required: true,
      },
      position: {
        type: String,
        required: true,
        default: "voluncteer",
      },
      title: {
        type: String,
        required: true,
      },
      gender: {
        type: String,
      },
      state: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      phoneNumber: {
        type: String,
        required: true,
      },
      zone: {
        type: String,
        required: true,
      },
    },
    resetToken: String,
    resetExpiration: Date,
  },
  {
    toJSON: {
      virtuals: true,
    },
  }
);

userSchema
  .virtual("fullName")
  .get(() => `${this.firstName} ${this.lastName}`)
  .set(function (newName) {
    var nameParts = newName.split(" ");
    this.firstName = nameParts[0];
    this.lastName = nameParts[1];
  });

module.exports = mongoose.model("User", userSchema);
