const express = require("express");
const cors = require("cors");
require("dotenv").config();

const customerRoutes = require("./src/routes/customer.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "KYFAN Financial CRM API is running",
    docs: {
      health: "/api/health",
      customers: "/api/customers",
      dashboard: "/api/dashboard/summary",
    },
  });
});

app.get("/api/health", (req, res) => {
  return res.json({
    success: true,
    message: "API hoạt động bình thường",
    time: new Date().toISOString(),
  });
});

app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Không tìm thấy API endpoint",
    path: req.originalUrl,
  });
});

app.use((error, req, res, next) => {
  console.error("Server Error:", error);

  return res.status(500).json({
    success: false,
    message: "Lỗi server",
    error: error.message,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`KYFAN Financial CRM API đang chạy tại http://localhost:${PORT}`);
});