const bcrypt = require("bcryptjs");
const User = require("../models/user");

const ensureDirectorAccount = async () => {
  const directorUsername = process.env.DIRECTOR_USERNAME;
  const directorEmail = process.env.DIRECTOR_EMAIL;
  const directorPassword = process.env.DIRECTOR_PASSWORD;

  if (!directorUsername || !directorEmail || !directorPassword) {
    throw new Error(
      "DIRECTOR_USERNAME, DIRECTOR_EMAIL, and DIRECTOR_PASSWORD must be set for seeding"
    );
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

const seedData = async () => {
  await ensureDirectorAccount();
};

module.exports = seedData;
