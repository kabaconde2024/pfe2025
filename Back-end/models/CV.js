// models/CV.js
const mongoose = require("mongoose");

const cvSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("CV", cvSchema);
