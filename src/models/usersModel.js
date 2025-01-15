import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    userId: {
      type: String,
      unique: true,
    },
    firstName: {
      type: String,
      minlength: 1,
      maxlength: 50,
    },
    lastName: {
      type: String,
      minlength: 1,
      maxlength: 50,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      validate: {
        validator: function (v) {
          return /^[0-9]{10,15}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      enum: ["farmer", "admin", "developer"],
      default: "farmer",
    },
    organization: {
      type: String,
      default: null,
    },
    terms: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
