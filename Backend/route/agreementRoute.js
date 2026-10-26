import express from "express";
import {
  createAgreement,
  getAllAgreements,
  getAgreementById,
  updateAgreement,
  deleteAgreement,
  duplicateAgreement,
  sendAgreementEmail,
  eSignAgreement,
} from "../controller/agreementController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Apply authMiddleware to protect all agreements routes
router.post("/create", authMiddleware(["admin"]), createAgreement);
router.get("/all", authMiddleware(["admin", "employee"]), getAllAgreements);
router.get("/:id", authMiddleware(["admin", "employee"]), getAgreementById);
router.put("/update/:id", authMiddleware(["admin"]), updateAgreement);
router.delete("/delete/:id", authMiddleware(["admin"]), deleteAgreement);
router.post("/duplicate/:id", authMiddleware(["admin"]), duplicateAgreement);
router.post("/send/:id", authMiddleware(["admin"]), sendAgreementEmail);
router.post("/esign/:id", authMiddleware(["admin"]), eSignAgreement);

export default router;
