const express = require('express');
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const { PDFDocument } = require("pdf-lib");
const mammoth = require("mammoth");
const Document = require("../models/Document");

const router = express.Router();

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

// Upload & Process File
router.post("/upload", upload.single("file"), async (req, res) => {
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
      return res.status(400).send("Invalid or empty text content.");
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
    res.send({ correctedText, stats: document.stats });
  } catch (err) {
    console.error("Error processing file:", err);
    res.status(500).send("Error processing file.");
  } finally {
    // Clean up uploaded file
    fs.unlinkSync(filePath);
  }
});
module.exports = router;