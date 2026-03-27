// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/problem", require("./routes/problem"));

// DB Connect
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));
app.get("/", (req, res) => {
  res.send("Backend is working");
});

// Start Server
app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);