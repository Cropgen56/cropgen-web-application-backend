import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Create MongoDB connection
export const connectToDatabase = async () => {
  try {
    console.log(process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Successfully connected to the database");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

export default mongoose;
