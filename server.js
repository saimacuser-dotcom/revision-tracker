const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
require("dotenv").config();

const app = express();

/* ─── MIDDLEWARE ─── */
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ─── ROUTES ─── */
app.use("/api/auth",    require("./routes/auth"));
app.use("/api/problem", require("./routes/problem"));
app.use("/api/user",    require("./routes/auth"));   // /api/user/streak → auth router handles /streak

/* ─── ROOT ─── */
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

/* ─── DATABASE ─── */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

/* ─── START ─── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));