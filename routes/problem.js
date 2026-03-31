router.post("/complete/:id", auth, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ msg: "Problem not found" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // ✅ STRING DATE (IMPORTANT)
    const today = new Date().toISOString().split("T")[0];

    // ✅ mark completed
    if (!problem.completedDates.includes(today)) {
      problem.completedDates.push(today);
      await problem.save();
    }

    // 🔥 GET TODAY PROBLEMS (STRING MATCH)
    const todayProblems = await Problem.find({
      userId: req.user.id,
      revisionDates: today
    });

    // 🔥 CHECK ALL DONE
    const allDoneToday = todayProblems.every(p =>
      p.completedDates.includes(today)
    );

    // 🔥 UPDATE STREAK + HEATMAP ONLY IF ALL DONE
    if (allDoneToday && todayProblems.length > 0) {

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];

      if (user.lastCompletedDate === yStr) {
        user.streak = (user.streak || 0) + 1;
      } else if (user.lastCompletedDate !== today) {
        user.streak = 1;
      }

      user.lastCompletedDate = today;

      // 🔥 HEATMAP LOGIC
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