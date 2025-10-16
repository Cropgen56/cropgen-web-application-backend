import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
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
    password: {
      type: String,
    },
    phone: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^\+\d{10,12}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
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
    otpAttemptCount: { type: Number, default: 0 },
    lastOtpSentAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    refreshTokenId: { type: String, default: null },
    firebaseUid: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
