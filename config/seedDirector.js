const bcrypt = require("bcryptjs");
const User = require("../models/user");

const ensureDirectorAccount = async () => {
  const directorUsername = process.env.DIRECTOR_USERNAME || "MrOrban";
  const directorEmail = process.env.DIRECTOR_EMAIL || "orban@kgl.local";
  const directorPassword = process.env.DIRECTOR_PASSWORD;

  if (!directorPassword) {
    console.warn("DIRECTOR_PASSWORD is not set; skipping director seed");
    return;
  }

  const existing = await User.findOne({
    $or: [{ username: directorUsername }, { email: directorEmail }]
  });

  if (existing) {
    if (existing.role !== "Director") {
      existing.role = "Director";
      await existing.save();
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(directorPassword, 10);
  await User.create({
    username: directorUsername,
    email: directorEmail,
    password: hashedPassword,
    role: "Director"
  });
};

module.exports = ensureDirectorAccount;
