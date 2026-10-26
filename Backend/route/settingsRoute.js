import express from "express";
import { getSettings, updateSettings, getMyPermissions } from "../controller/settingsController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Get current user's effective permissions
router.get("/my-permissions", authMiddleware(["admin", "employee", "intern"]), getMyPermissions);

// Get global settings (accessible to admin and employees)
router.get("/", authMiddleware(["admin", "employee", "intern"]), getSettings);

// Update settings (admin only)
router.put("/", authMiddleware(["admin"]), updateSettings);

export default router;
