const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const cron = require("node-cron");
const authRoutes = require("./routes/user/auth");
const adminRoutes = require("./routes/admin/admin");
const flexibleWalletRoutes = require("./routes/user/flexibleWallet");
const fixedWalletRoutes = require("./routes/user/fixedWallet");
const settingRoutes = require("./routes/user/setting");
const transcationRoutes = require("./routes/user/transcation");
const referralRoutes = require("./routes/user/referral");
const path = require("path");

const webhookRoutes = require("./routes/user/webhook");
// const corsOptions = {
//   origin: [
//     "http://localhost:3000",
//     "http://localhost:3005",
//     "http://localhost:3001",
//     "https://appearnusdc.m5networkhub.com",
//     "http://appearnusdc.m5networkhub.com",
//     "https://adminearnusdc.m5networkhub.com",
//     "http://adminearnusdc.m5networkhub.com",
//     "https://app.earnusdc.com",
//     "http://app.earnusdc.com",
//     "http://admin.earnusdc.com",
//     "https://admin.earnusdc.com",
//   ],
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: [
//     "Content-Type",
//     "Authorization",
//     "X-Requested-With",
//     "Accept",
//   ],
//   credentials: true, // Allow cookies from this origin
// };
const app = express();
// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use(cors(corsOptions));
app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.use("/public", express.static(path.join(__dirname, "public")));

app.use("/user/api", authRoutes);
app.use("/admin/api", adminRoutes);
app.use("/user/api", flexibleWalletRoutes);
app.use("/user/api", settingRoutes);
app.use("/user/api", fixedWalletRoutes);
app.use("/user/api", transcationRoutes);
app.use("/user/api", referralRoutes);
app.use("/user/api", webhookRoutes);

cron.schedule("0 0 * * *", async () => {
  try {
    await authController.settings();
  } catch (error) {
    console.error("Error running cron job:", error);
  }
});

mongoose.connect(process.env.CONNECTION_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.once("open", () => {
  app.listen(process.env.PORT, () => {});
  console.log("app is running on port : ", process.env.PORT);
});

module.exports = app;
