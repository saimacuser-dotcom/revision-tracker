const express = require("express");
const Problem        = require("../models/Problem");
const User           = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* ─── ADD PROBLEM ─── */
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { name, link, difficulty } = req.body;

    if (!name)
      return res.status(400).json({ msg: "Problem name required" });

    const today = new Date().toISOString().split("T")[0];

    // Spaced-repetition intervals: 1, 3, 7, 14, 30 days from now
    const intervals = [1, 3, 7, 14, 30];
    const revisionDates = intervals.map(days => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split("T")[0];
    });

    const problem = new Problem({
      userId:         req.user.id,
      name,
      link:           link || "",
      difficulty:     difficulty || "Easy",
      addedDate:      today,
      revisionDates,
      completedDates: []
    });

    await problem.save();
    res.json(problem);

  } catch (err) {
    console.error("ADD ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ─── GET ALL PROBLEMS ─── */
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const problems = await Problem.find({ userId: req.user.id }).sort({ addedDate: -1 });
    res.json(problems);
  } catch (err) {
    console.error("ALL ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ─── GET TODAY'S PROBLEMS ─── */
router.get("/today", authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const problems = await Problem.find({
      userId:       req.user.id,
      revisionDates: today          // matches if today is in the array
    });

    // Only return problems NOT yet completed today
    const pending = problems.filter(p => !p.completedDates.includes(today));

    res.json(pending);

  } catch (err) {
    console.error("TODAY ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ─── COMPLETE PROBLEM ─── */
// Frontend calls POST /api/problem/complete/:id
router.post("/complete/:id", authMiddleware, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ msg: "Problem not found" });

    // Make sure this problem belongs to the requesting user
    if (String(problem.userId) !== String(req.user.id))
      return res.status(403).json({ msg: "Forbidden" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const today = new Date().toISOString().split("T")[0];

    /* ── 1. Mark problem completed today ── */
    if (!problem.completedDates.includes(today)) {
      problem.completedDates.push(today);
      await problem.save();
    }

    /* ── 2. Check if ALL of today's problems are done ── */
    const todayProblems = await Problem.find({
      userId:        req.user.id,
      revisionDates: today
    });

    const allDoneToday =
      todayProblems.length > 0 &&
      todayProblems.every(p => p.completedDates.includes(today));

    /* ── 3. Update streak + heatmap ── */
    if (!user.activity) user.activity = [];

    // Always increment heatmap count for each completion
    const existingActivity = user.activity.find(a => a.date === today);
    if (existingActivity) {
      existingActivity.count += 1;
    } else {
      user.activity.push({ date: today, count: 1 });
    }

    // Only update streak once per day (when all done)
    if (allDoneToday && user.lastCompletedDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];

      if (user.lastCompletedDate === yStr) {
        // Continued streak
        user.streak = (user.streak || 0) + 1;
      } else {
        // Broken streak — restart
        user.streak = 1;
      }

      user.lastCompletedDate = today;
    }

    await user.save();

    res.json({
      msg:         "Marked done",
      streak:      user.streak || 0,
      allDoneToday
    });

  } catch (err) {
    console.error("COMPLETE ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ─── DELETE PROBLEM ─── */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ msg: "Not found" });

    if (String(problem.userId) !== String(req.user.id))
      return res.status(403).json({ msg: "Forbidden" });

    await Problem.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted" });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;