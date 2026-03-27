// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ─── MIDDLEWARE ───
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve frontend

// ─── ROUTES ───
app.use("/api/auth", require("./routes/auth"));
app.use("/api/problem", require("./routes/problem"));

// ─── ROOT ROUTE ───
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// ─── DATABASE CONNECTION ───
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1); // Exit process if DB connection fails
});

// ─── START SERVER ───
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));