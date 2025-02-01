const express = require("express");
const multer = require("multer");
const { LanguageTool } = require("languagetool-node");
const { PDFDocument } = require("pdf-lib");
const mammoth = require("mammoth");
const Document = require("../models/Document");
const authenticate = require("../middleware/auth");

const router = express.Router();
const upload = multer({ dest: "uploads/" });
const lt = new LanguageTool("en-US");

// Upload and process document
router.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  const fileExtension = req.file.originalname.split(".").pop().toLowerCase();
  let fileContent;

  try {
    if (fileExtension === "pdf") {
      const pdfBytes = require("fs").readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      fileContent = pages.map((page) => page.getTextContent().items.map((item) => item.str).join(" ")).join(" ");
    } else if (fileExtension === "docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      fileContent = result.value;
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

// Fetch user's documents
router.get("/documents", authenticate, async (req, res) => {
  const documents = await Document.find({ userId: req.user._id });
  res.send(documents);
});

// Download corrected document
router.get("/download/:id", authenticate, async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).send("Document not found.");
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", `attachment; filename=${document.filename}`);
  res.send(document.correctedText);
});

// Add collaborator to document
router.post("/document/:id/add-collaborator", authenticate, async (req, res) => {
  const { email } = req.body;
  const document = await Document.findById(req.params.id);
  const user = await User.findOne({ email });

  if (!user) return res.status(404).send("User not found.");
  if (!document.collaborators.includes(user._id)) {
    document.collaborators.push(user._id);
    await document.save();
  }
  res.send("Collaborator added.");
});

// Fetch shared documents
router.get("/shared-documents", authenticate, async (req, res) => {
  const documents = await Document.find({ collaborators: req.user._id });
  res.send(documents);
});

module.exports = router;