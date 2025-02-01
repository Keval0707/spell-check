require("dotenv").config(); // Load environment variables
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { PDFDocument } = require("pdf-lib");
const mammoth = require("mammoth");
const fs = require("fs");
const axios = require("axios");
const helmet = require("helmet");
const morgan = require("morgan");
const nodemailer = require("nodemailer");
const { body, validationResult } = require("express-validator");

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet()); // Add security headers
app.use(morgan("combined")); // Log HTTP requests

// Environment variables
const MONGO_URI = process.env.MONGO_URI || "your-default-mongo-url";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const EMAIL_USER = process.env.EMAIL_USER || "your-email@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "your-email-password";

// MongoDB connection
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model("User", userSchema);

// Document Schema
const documentSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  filename: String,
  originalText: String,
  correctedText: String,
  stats: Object,
});
const Document = mongoose.model("Document", documentSchema);

// Middleware for authentication
const authenticate = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).send("Access denied.");
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).send("User not found.");
    next();
  } catch (err) {
    res.status(401).send("Invalid token.");
  }
};

// Extract text from PDF
const extractTextFromPDF = async (filePath) => {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    let text = "";
    for (const page of pdfDoc.getPages()) {
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ");
    }
    return text;
  } catch (err) {
    console.error("Error extracting text from PDF:", err);
    return "";
  }
};

// Extract text from DOCX
const extractTextFromDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (err) {
    console.error("Error extracting text from DOCX:", err);
    return "";
  }
};

// File Upload Setup
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, and TXT files are allowed."));
    }
  },
});

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Fetch User's Document History
app.get("/documents", authenticate, async (req, res) => {
  const documents = await Document.find({ userId: req.user._id });
  res.send(documents);
});

// Download Corrected Document
app.get("/download/:id", authenticate, async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).send("Document not found.");
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename=${document.filename}`);
  res.send(document.correctedText);
});

// Signup Route
app.post(
  "/signup",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.send("User registered.");
  }
);

// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).send("Invalid credentials.");
  }
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
  res.send({ token });
});

// Upload & Process File
app.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const fileExtension = req.file.originalname.split(".").pop().toLowerCase();
  let fileContent = "";

  try {
    // Extract text from the file
    if (fileExtension === "pdf") {
      fileContent = await extractTextFromPDF(filePath);
    } else if (fileExtension === "docx") {
      fileContent = await extractTextFromDOCX(filePath);
    } else {
      fileContent = fs.readFileSync(filePath, "utf8");
    }

    // Validate file content
    if (!fileContent || typeof fileContent !== "string") {
      throw new Error("Invalid or empty text content.");
    }

    // Send request to LanguageTool API
    const response = await axios.post(
      "https://api.languagetool.org/v2/check",
      new URLSearchParams({
        text: fileContent,
        language: "en",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const matches = response.data.matches;
    const correctedText = matches.reduce((text, match) => {
      return text.replace(match.context.text, match.replacements[0]?.value || match.context.text);
    }, fileContent);

    // Save to MongoDB
    const document = new Document({
      userId: req.user._id,
      filename: req.file.originalname,
      originalText: fileContent,
      correctedText,
      stats: {
        spellingErrors: matches.filter((m) => m.rule.category.id === "TYPOS").length,
        grammarErrors: matches.filter((m) => m.rule.category.id !== "TYPOS").length,
      },
    });

    await document.save();

    // Send email notification
    const user = await User.findById(req.user._id);
    const mailOptions = {
      from: EMAIL_USER,
      to: user.email,
      subject: "Document Processing Complete",
      text: `Your document "${req.file.originalname}" has been processed.`,
    };
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error("Error sending email:", err);
      else console.log("Email sent:", info.response);
    });

    res.send({ correctedText, stats: document.stats });
  } catch (err) {
    console.error("Error processing file:", err);
    res.status(500).send("Error processing file.");
  } finally {
    // Clean up uploaded file
    fs.unlinkSync(filePath);
  }
});

// Admin Routes
app.get("/admin/users", async (req, res) => {
  const users = await User.find({});
  res.send(users);
});

app.get("/admin/documents", async (req, res) => {
  const documents = await Document.find({});
  res.send(documents);
});

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));