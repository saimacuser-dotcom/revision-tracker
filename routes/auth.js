const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Problem = require("../models/Problem"); // ✅ IMPORTANT
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* ─── REGISTER ─── */
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ msg: "All fields required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashed,
      name,
      streak: 0,
      lastStreakDate: "",
      activity: []
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ─── LOGIN ─── */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "All fields required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ─── COMPLETE PROBLEM (🔥 FIXED) ─── */
router.post("/complete/:id", authMiddleware, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ msg: "Problem not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const today = new Date().toISOString().split("T")[0];

    // ✅ mark completed
    if (!problem.completedDates.includes(today)) {
      problem.completedDates.push(today);
      await problem.save();
    }

    // 🔥 today's problems
    const todayProblems = await Problem.find({
      userId: req.user.id,
      revisionDates: today
    });

    const allDoneToday = todayProblems.every(p =>
      p.completedDates.includes(today)
    );

    // 🔥 STREAK + HEATMAP
    if (allDoneToday && todayProblems.length > 0) {

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];

      // ✅ FIXED FIELD NAME
      if (user.lastStreakDate === yStr) {
        user.streak = (user.streak || 0) + 1;
      } else if (user.lastStreakDate !== today) {
        user.streak = 1;
      }

      user.lastStreakDate = today;

      // 🔥 HEATMAP
      if (!user.activity) user.activity = [];

      const existing = user.activity.find(a => a.date === today);

      if (existing) {
        existing.count += 1;
      } else {
        user.activity.push({ date: today, count: 1 });
      }

      await user.save();
    }

    res.json({
      msg: "Marked done",
      streak: user.streak || 0,
      allDoneToday
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ─── HEATMAP ─── */
router.get("/heatmap", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.activity || []);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

/* ─── STREAK ─── */
router.get("/streak", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ streak: user.streak || 0 });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;