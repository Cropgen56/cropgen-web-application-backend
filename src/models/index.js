import sequelize from "..config/db.js";
import User from "./usersModel.js";

// Initialize all models
const models = { User };

export { sequelize };
export default models;
