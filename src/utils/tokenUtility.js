import jwt from "jsonwebtoken";

// Function to create a JWT token (without expiration)
export const createToken = (userId) => {
  const payload = {
    firstName: "Vishal",
    lastName: "Maske",
    phone: "1212121212",
    email: "maheshcropgen1@gmail.com",
    organization: "cropgen",
    role: "farmer",
    terms: "true",
    userId: "Mahesh",
  };
  const token = jwt.sign(payload, "yourSecretKey");
  return token;
};

// Function to decode the JWT token
export const decodeToken = (token) => {
  try {
    const decoded = jwt.verify(token, secretKey);
    return decoded;
  } catch (error) {
    console.error("Invalid token", error);
    return null;
  }
};

// Usage example
const secretKey = "yourSecretKey";
const userId = "12345";

// Create a non-expiring token
const token = createToken(userId, secretKey);
// console.log("Generated Token:", token);

// Decode the token
const decoded = decodeToken(token, secretKey);
// console.log("Decoded Token:", decoded);
