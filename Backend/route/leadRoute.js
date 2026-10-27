import express from "express";
import {
    createLead,
    getAllLeads,
    getLeadById,
    updateLead,
    deleteLead,
    requestQuotation,
    approveQuotationRequest,
    rejectQuotationRequest,
    addFollowUp,
    convertToCustomer
} from "../controller/leadController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/create", authMiddleware(["admin", "employee"]), createLead);
router.get("/all", authMiddleware(["admin", "employee"]), getAllLeads);
router.get("/:id", authMiddleware(["admin", "employee"]), getLeadById);
router.put("/update/:id", authMiddleware(["admin", "employee"]), updateLead);
router.delete("/delete/:id", authMiddleware(["admin"]), deleteLead);

// Quotation Request Workflow
router.put("/:id/request-quotation", authMiddleware(["admin", "employee"]), requestQuotation);
router.put("/:id/approve-quotation", authMiddleware(["admin"]), approveQuotationRequest);
router.put("/:id/reject-quotation", authMiddleware(["admin"]), rejectQuotationRequest);

// Follow-up history and multiple logs
router.post("/:id/follow-up", authMiddleware(["admin", "employee"]), addFollowUp);

// Convert Lead to Customer and remove from leads
router.post("/:id/convert-to-customer", authMiddleware(["admin", "employee"]), convertToCustomer);

export default router;
