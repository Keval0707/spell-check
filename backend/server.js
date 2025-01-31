const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { LanguageTool } = require("languagetool-api");
const cors = require("cors");
const { PDFDocument } = require("pdf-lib");
const mammoth = require("mammoth");
const app = express();
app.use(cors());
app.use(express.json());
// Fetch user's document history
app.get("/documents", authenticate, async (req, res) => {
  const documents = await Document.find({ userId: req.user._id });
  res.send(documents);
});

// Download corrected document
app.get("/download/:id", authenticate, async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).send("Document not found.");
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename=${document.filename}`);
  res.send(document.correctedText);
});
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

const extractTextFromPDF = async (filePath) => {
  const pdfBytes = require("fs").readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  let text = "";
  for (const page of pages) {
    text += page.getTextContent().items.map((item) => item.str).join(" ");
  }
  return text;
};// File upload setup
const upload = multer({ dest: "uploads/" });

const extractTextFromDOCX = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
};// LanguageTo setup
const languageTool = require('languagetool-api');

languageTool.check(
  {
    text: 'This is a example text with error.',
    language: 'en',
  },
  function (err, result) {
    if (err) console.error(err);
    else console.log(result);
  }
);


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
app.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const fileExtension = req.file.originalname.split(".").pop().toLowerCase();
  let fileContent;

  try {
    if (fileExtension === "pdf") {
      fileContent = await extractTextFromPDF(filePath);
    } else if (fileExtension === "docx") {
      fileContent = await extractTextFromDOCX(filePath);
    } else {
      fileContent = require("fs").readFileSync(filePath, "utf8");
    }

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
  } catch (err) {
    res.status(500).send("Error processing file.");
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));