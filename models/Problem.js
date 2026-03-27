// models/Problem.js
const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema({
  userId: String,
  name: String,
  link: String,
  difficulty: String,
  createdAt: { type: Date, default: Date.now },
  revisionDates: [Date],
  completedDates: [Date]
});

module.exports = mongoose.model("Problem", problemSchema);