require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const seedData = require("./config/seedData");
const { assertRequiredEnvVars } = require("./config/requiredEnv");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const procurementRoutes = require("./routes/procurementRoute");
const salesRoutes = require("./routes/saleRoute");
const notificationRoutes = require("./routes/notificationRoute");
const userRoutes = require("./routes/userRoute");

const app = express();
app.use(express.json());
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Karibu Groceries API is running",
    docs: "/api-docs"
  });
});

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Karibu Groceries API",
      version: "1.0.0"
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ["./routes/*.js"]
};

app.get("/api-docs.json", (req, res) => {
  const swaggerSpec = swaggerJsdoc(options);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(null, {
    swaggerOptions: {
      url: "/api-docs.json",
      persistAuthorization: true
    }
  })
);

app.use("/procurement", procurementRoutes);
app.use("/sales", salesRoutes);
app.use("/notifications", notificationRoutes);
app.use("/users", userRoutes);


const startServer = async () => {
  assertRequiredEnvVars();
  await connectDB();
  await seedData();

  app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
  );
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
