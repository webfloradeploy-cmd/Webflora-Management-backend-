import express from "express";
import { createQuotation, getAllQuotations, getQuotationById, updateQuotation, deleteQuotation, sendQuotationEmail } from "../controller/quotationController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/create", authMiddleware(["admin"]), createQuotation);
router.get("/all", authMiddleware(["admin"]), getAllQuotations);
router.get("/:id", authMiddleware(["admin"]), getQuotationById);
router.put("/update/:id", authMiddleware(["admin"]), updateQuotation);
router.delete("/delete/:id", authMiddleware(["admin"]), deleteQuotation);
router.post("/send/:id", authMiddleware(["admin"]), sendQuotationEmail);

export default router;
