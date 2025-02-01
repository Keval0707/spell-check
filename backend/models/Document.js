const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename: { type: String, required: true },
  originalText: { type: String, required: true },
  correctedText: { type: String, required: true },
  stats: {
    spellingErrors: { type: Number, default: 0 },
    grammarErrors: { type: Number, default: 0 },
  },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.model("Document", documentSchema);