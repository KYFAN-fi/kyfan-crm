const express = require("express");

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
  deleteCustomer,
} = require("../controllers/customer.controller");

const router = express.Router();

router.get("/", getCustomers);
router.get("/:id", getCustomerById);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.patch("/:id/status", updateCustomerStatus);
router.delete("/:id", deleteCustomer);

module.exports = router;