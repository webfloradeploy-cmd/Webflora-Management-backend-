import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
    Addintern,
    LoginIntern,
    getAllIntern,
    getInternById,
    updateIntern,
    deleteIntern,
    listInterns,
    toggleInternStatus
} from "../controller/internController.js";

const router = express.Router();

// Add Intern (Admin Only)
router.post("/", authMiddleware(["admin"]), Addintern);

// Login Intern (No Auth Required)
router.post("/login", LoginIntern);

// Get intern profile (Personal)
router.get("/me", authMiddleware(['intern']), (req, res, next) => {
    req.params.id = req.user.id;
    next();
}, getInternById);

// Get All Interns (Admin Only)
router.get("/", authMiddleware(["admin"]), getAllIntern);

// List interns (All staff)
router.get("/list", authMiddleware(['admin', 'employee', 'intern']), listInterns);

// Update Intern (Admin Only)
router.put("/update/:id", authMiddleware(["admin"]), updateIntern);

// Toggle Intern Status (Admin Only)
router.patch("/:id/status", authMiddleware(["admin"]), toggleInternStatus);

// Delete Intern (Admin Only)
router.delete("/delete/:id", authMiddleware(["admin"]), deleteIntern);

export default router;
