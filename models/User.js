// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // 🔥 streak system
  streak: { type: Number, default: 0 },

  // store as STRING (IMPORTANT → easier compare)
  lastStreakDate: { type: String, default: "" },

  // 🌱 for GitHub heatmap (optional but powerful)
  activity: [
    {
      date: String,   // "YYYY-MM-DD"
      count: Number
    }
  ]
});

module.exports = mongoose.model("User", userSchema);