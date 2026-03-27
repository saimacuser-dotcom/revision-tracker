// routes/problem.js
const express = require("express");
const Problem = require("../models/Problem");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// ➕ Add Problem
router.post("/add", auth, async (req, res) => {
  try {
    const { name, link, difficulty } = req.body;
    if (!name || !link || !difficulty) {
      return res.status(400).json({ msg: "All fields required" });
    }

    const days = [0, 2, 4, 7, 14, 20];
    const revisionDates = days.map(d => {
      const date = new Date();
      date.setDate(date.getDate() + d);
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const problem = new Problem({
      userId: req.user.id,
      name,
      link,
      difficulty,
      revisionDates,
      completedDates: []
    });

    await problem.save();
    res.json(problem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// 📄 Get All Problems
router.get("/all", auth, async (req, res) => {
  try {
    const problems = await Problem.find({ userId: req.user.id }).sort({ _id: -1 });
    res.json(problems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// 📅 Get Today's Revision
router.get("/today", auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const problems = await Problem.find({
      userId: req.user.id,
      revisionDates: { $elemMatch: { $gte: today, $lt: tomorrow } }
    });

    res.json(problems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ✅ Mark as Done
router.post("/complete/:id", auth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ msg: "Problem not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only push if not already marked today
    if (!problem.completedDates.some(d => d.getTime() === today.getTime())) {
      problem.completedDates.push(today);
      await problem.save();
    }

    // 🔥 Streak logic
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (user.lastCompletedDate && new Date(user.lastCompletedDate).getTime() === yesterday.getTime()) {
      user.streak = (user.streak || 0) + 1;
    } else {
      user.streak = 1;
    }

    user.lastCompletedDate = today;
    await user.save();

    res.json({ msg: "Marked done", streak: user.streak });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;