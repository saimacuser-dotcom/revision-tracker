// models/Problem.js
const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  name: { type: String, required: true },
  link: String,
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Easy"
  },

  createdAt: { type: Date, default: Date.now },

  // 🔥 store as STRING (VERY IMPORTANT)
  revisionDates: [String],     // ["2026-04-01", "2026-04-07"]
  completedDates: [String]     // ["2026-04-01"]
});

module.exports = mongoose.model("Problem", problemSchema);