const express        = require("express");
const bcrypt         = require("bcryptjs");
const jwt            = require("jsonwebtoken");
const User           = require("../models/User");
const Problem        = require("../models/Problem");
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
      streak:          0,
      lastCompletedDate: "",
      activity:        []
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

/* ─── COMPLETE PROBLEM ─── */
// POST /api/problem/complete/:id   (called from problem router — see problem.js)
// Also exported so problem.js can use it directly, OR you can keep it here
// and call it via /api/auth/complete/:id — just stay consistent with the frontend.
router.post("/complete/:id", authMiddleware, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ msg: "Problem not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const today = new Date().toISOString().split("T")[0];

    /* ── 1. Mark problem completed ── */
    if (!problem.completedDates.includes(today)) {
      problem.completedDates.push(today);
      await problem.save();
    }

    /* ── 2. Check if ALL today's problems are done ── */
    const todayProblems = await Problem.find({
      userId:        req.user.id,
      revisionDates: today
    });

    const allDoneToday =
      todayProblems.length > 0 &&
      todayProblems.every(p => p.completedDates.includes(today));

    /* ── 3. Update heatmap every time a problem is marked done ── */
    if (!user.activity) user.activity = [];

    const existing = user.activity.find(a => a.date === today);
    if (existing) {
      existing.count += 1;
    } else {
      user.activity.push({ date: today, count: 1 });
    }

    /* ── 4. Streak — only update once all done today ── */
    if (allDoneToday) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];

      if (user.lastCompletedDate === yStr) {
        // continued streak
        user.streak = (user.streak || 0) + 1;
      } else if (user.lastCompletedDate !== today) {
        // streak broken — restart
        user.streak = 1;
      }
      // if lastCompletedDate === today, streak was already counted — don't re-increment

      user.lastCompletedDate = today;
    }

    await user.save();

    res.json({
      msg: "Marked done",
      streak:      user.streak || 0,
      allDoneToday
    });

  } catch (err) {
    console.error("COMPLETE ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ─── HEATMAP ─── */
router.get("/heatmap", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user.activity || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ─── STREAK ─── */
// Handles both GET /api/auth/streak  AND  GET /api/user/streak
// because server.js mounts this router on both prefixes.
router.get("/streak", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ streak: user.streak || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;