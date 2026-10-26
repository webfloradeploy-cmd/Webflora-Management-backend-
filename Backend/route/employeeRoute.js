import express from "express";
import {
  createEmployee,
  loginEmployee,
  getEmployee,
  getEmployeeById,
  deleteEmployee,
  updateEmployee,
  listEmployees,
  toggleEmployeeStatus
} from "../controller/employeeController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Create employee (Admin only)
router.post("/", authMiddleware(['admin']), createEmployee);

// Employee login (public)
router.post("/login", loginEmployee);

// Get employee profile (Personal)
router.get("/me", authMiddleware(['employee']), (req, res, next) => {
  req.params.id = req.user.id;
  next();
}, getEmployeeById);

// Get all employees (Admin only)
router.get("/", authMiddleware(['admin']), getEmployee);

// List employees (All staff)
router.get("/list", authMiddleware(['admin', 'employee', 'intern']), listEmployees);

// Update employee by ID (Admin only)
router.put("/:id", authMiddleware(['admin']), updateEmployee);

// Toggle employee status (Admin only)
router.patch("/:id/status", authMiddleware(['admin']), toggleEmployeeStatus);

// Delete employee by ID (Admin only)
router.delete("/:id", authMiddleware(['admin']), deleteEmployee);

export default router;
