import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    firstName: {
      type: DataTypes.STRING,
      len: [1, 50],
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      len: [1, 50],
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isNumeric: true,
        len: [10, 15],
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("farmer", "admin", "developer"),
      defaultValue: "farmer",
    },
    organization: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    terms: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
    ],
  }
);

export default User;
