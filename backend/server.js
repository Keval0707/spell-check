const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { LanguageTool } = require("languagetool-node");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/grammar_checker", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model("User", userSchema);

// Document schema
const documentSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  filename: String,
  originalText: String,
  correctedText: String,
  stats: Object,
});
const Document = mongoose.model("Document", documentSchema);

// File upload setup
const upload = multer({ dest: "uploads/" });

// LanguageTool setup
const lt = new LanguageTool("en-US");

// Middleware for authentication
const authenticate = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).send("Access denied.");
  try {
    const decoded = jwt.verify(token, "secretkey");
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    res.status(401).send("Invalid token.");
  }
};

// Routes
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword });
  await user.save();
  res.send("User registered.");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).send("Invalid credentials.");
  }
  const token = jwt.sign({ id: user._id }, "secretkey");
  res.send({ token });
});

app.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  const fileContent = require("fs").readFileSync(req.file.path, "utf8");
  const matches = await lt.check(fileContent);
  const correctedText = matches.reduce((text, match) => {
    return text.replace(match.context.text, match.replacements[0]?.value || match.context.text);
  }, fileContent);

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
  res.send({ correctedText, stats: document.stats });
});

app.get("/documents", authenticate, async (req, res) => {
  const documents = await Document.find({ userId: req.user._id });
  res.send(documents);
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));