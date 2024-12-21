import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET_KEY;

// Middleware function to authenticate requests
const isAuthenticated = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res
      .status(403)
      .json({ message: "Access denied. No token provided." });
  }

  // Verify the JWT token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }

    // Attach the decoded user information to the request object
    req.user = user;

    // Pass control to the next middleware or route handler
    next();
  });
};

export default isAuthenticated;
