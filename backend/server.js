const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { LanguageTool } = require("languagetool-api");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { PDFDocument } = require("pdf-lib");
const mammoth = require("mammoth");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// File upload setup
const upload = multer({ dest: "uploads/" });

// LanguageTool setup
const lt = new LanguageTool("en-US");

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your-email@gmail.com", // Replace with your email
    pass: "your-email-password", // Replace with your email password
  },
});

// Routes
app.use("/api/auth", authRoutes); // Authentication routes
app.use("/api/documents", documentRoutes); // Document-related routes
app.use("/api/admin", adminRoutes); // Admin-related routes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});