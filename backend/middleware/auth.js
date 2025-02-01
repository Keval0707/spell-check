const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).send("Access denied.");
  try {
    const decoded = jwt.verify(token, "secretkey");
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).send("Invalid token.");
    next();
  } catch (err) {
    res.status(401).send("Invalid token.");
  }
};

module.exports = authenticate;