const express = require("express");
const User = require("../models/User");
const Document = require("../models/Document");

const router = express.Router();

// Fetch all users
router.get("/users", async (req, res) => {
  const users = await User.find({});
  res.send(users);
});

// Fetch all documents
router.get("/documents", async (req, res) => {
  const documents = await Document.find({});
  res.send(documents);
});

module.exports = router;