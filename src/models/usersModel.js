import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    userId: {
      type: String,
    },
    firstName: {
      type: String,
      maxlength: 50,
    },
    lastName: {
      type: String,
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
          return /^\+\d{10,12}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      enum: ["farmer", "admin", "developer", "client"],
      default: "farmer",
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    terms: {
      type: Boolean,
      required: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "pending", "cancelled"],
      default: "inactive",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    razorpayCustomerId: {
      type: String,
      default: null,
    },
    subscriptionId: {
      type: String,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    firebaseUid: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
