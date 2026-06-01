const express = require("express");

const {
  getDashboardSummary,
  getByStatus,
  getByService,
  getByProvince,
} = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/summary", getDashboardSummary);
router.get("/by-status", getByStatus);
router.get("/by-service", getByService);
router.get("/by-province", getByProvince);

module.exports = router;