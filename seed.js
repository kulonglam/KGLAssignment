require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/user");

const REQUIRED_ENV_VARS = ["DATABASE_URI"];
// Baseline workforce required by business rules: 1 director, 1 manager + 2 sales agents per branch.
const SEED_USERS = [
  {
    username: "MrOrban",
    email: "orban@kgl.local",
    password: "Orban@2026!",
    role: "Director"
  },
  {
    username: "manager_maganjo",
    email: "manager.maganjo@kgl.local",
    password: "ManagerMaganjo@2026",
    role: "Manager",
    branch: "Maganjo"
  },
  {
    username: "salesagent_maganjo_1",
    email: "salesagent1.maganjo@kgl.local",
    password: "SalesMaganjo1@2026",
    role: "SalesAgent",
    branch: "Maganjo",
    staffSlot: 1
  },
  {
    username: "salesagent_maganjo_2",
    email: "salesagent2.maganjo@kgl.local",
    password: "SalesMaganjo2@2026",
    role: "SalesAgent",
    branch: "Maganjo",
    staffSlot: 2
  },
  {
    username: "manager_matugga",
    email: "manager.matugga@kgl.local",
    password: "ManagerMatugga@2026",
    role: "Manager",
    branch: "Matugga"
  },
  {
    username: "salesagent_matugga_1",
    email: "salesagent1.matugga@kgl.local",
    password: "SalesMatugga1@2026",
    role: "SalesAgent",
    branch: "Matugga",
    staffSlot: 1
  },
  {
    username: "salesagent_matugga_2",
    email: "salesagent2.matugga@kgl.local",
    password: "SalesMatugga2@2026",
    role: "SalesAgent",
    branch: "Matugga",
    staffSlot: 2
  }
];

const assertRequiredEnvVars = () => {
  const missing = REQUIRED_ENV_VARS.filter(
    (name) => !process.env[name] || !String(process.env[name]).trim()
  );

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

// Idempotent upsert so re-running seed keeps required users in sync.
const upsertUser = async (seedUser) => {
  const existing = await User.findOne({
    $or: [{ username: seedUser.username }, { email: seedUser.email }]
  });

  // Keep credentials deterministic for seeded accounts.
  const hashedPassword = await bcrypt.hash(seedUser.password, 10);

  if (!existing) {
    await User.create({
      username: seedUser.username,
      email: seedUser.email,
      password: hashedPassword,
      role: seedUser.role,
      branch: seedUser.role === "Director" ? undefined : seedUser.branch,
      staffSlot: seedUser.role === "SalesAgent" ? seedUser.staffSlot : undefined
    });
    return "created";
  }

  existing.username = seedUser.username;
  existing.email = seedUser.email;
  existing.password = hashedPassword;
  existing.role = seedUser.role;
  existing.branch = seedUser.role === "Director" ? undefined : seedUser.branch;
  existing.staffSlot = seedUser.role === "SalesAgent" ? seedUser.staffSlot : undefined;
  await existing.save();
  return "updated";
};

const seed = async () => {
  assertRequiredEnvVars();
  await connectDB();

  let created = 0;
  let updated = 0;

  for (const seedUser of SEED_USERS) {
    const action = await upsertUser(seedUser);
    if (action === "created") {
      created += 1;
    } else {
      updated += 1;
    }
  }

  console.log(`Seed complete. created=${created}, updated=${updated}`);
};

seed()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
