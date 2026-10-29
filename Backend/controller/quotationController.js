import Quotation from "../model/quotationModel.js";
import Lead from "../model/leadModel.js";
import Counter from "../model/counterModel.js";
import { sendQuotationEmail as sendQuotationEmailService } from "../utils/emailService.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, "../../frontend/public/webfloralogo.png");

// Create a new quotation
const createQuotation = async (req, res) => {
    try {
        const {
            leadId, date, validUntil, items, totalAmount, notes, status, quotationNo,
            projectName, projectType, projectOverview, scopeOfWork, websitePages,
            adminPanelFeatures, timeline, deliverables, paymentTerms, additionalServices, termsAndConditions
        } = req.body;
        const adminId = req.user.id;

        let computedTotal = 0;
        if (Array.isArray(items)) {
            computedTotal = items.reduce((sum, item) => sum + ((Number(item.quantity) || 1) * (Number(item.price) || 0)), 0);
        }
        const finalTotal = (totalAmount !== undefined && totalAmount !== null && totalAmount !== "") ? Number(totalAmount) : computedTotal;

        if (!leadId) {
            return res.status(400).json({ success: false, message: "Lead ID is required" });
        }

        let qNo = quotationNo;
        if (!qNo) {
            const year = new Date().getFullYear();
            const counter = await Counter.findOneAndUpdate(
                { id: `quotationNumber-${year}` },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            qNo = `WT-QTN-${year}-${String(counter.seq).padStart(4, '0')}`;
        }

        const existingQuotation = await Quotation.findOne({ quotationNo: qNo });
        if (existingQuotation) {
            return res.status(409).json({ success: false, message: "Quotation number already exists" });
        }

        const newQuotation = new Quotation({
            leadId,
            quotationNo: qNo,
            date,
            validUntil,
            projectName,
            projectType,
            projectOverview,
            scopeOfWork,
            websitePages: websitePages || [],
            adminPanelFeatures: adminPanelFeatures || [],
            items: items || [],
            totalAmount: finalTotal,
            timeline: timeline || [],
            deliverables: deliverables || [],
            paymentTerms: paymentTerms || [],
            additionalServices: additionalServices || [],
            termsAndConditions: termsAndConditions || [],
            notes,
            status: status || "Draft",
            adminId
        });

        await newQuotation.save();
        await newQuotation.populate("leadId", "leadId leadName email contactNumber");
        res.status(201).json({ success: true, message: "Quotation created successfully", quotation: newQuotation });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to create quotation", error: error.message });
    }
};

// Get all quotations
const getAllQuotations = async (req, res) => {
    try {
        const quotations = await Quotation.find()
            .populate("leadId", "leadId leadName email contactNumber")
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, quotations });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch quotations", error: error.message });
    }
};

// Get quotation by ID
const getQuotationById = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id).populate("leadId", "leadId leadName email contactNumber");
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found" });
        }
        res.status(200).json({ success: true, quotation });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch quotation", error: error.message });
    }
};

// Update quotation
const updateQuotation = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (updateData.leadId && typeof updateData.leadId === 'object') {
            updateData.leadId = updateData.leadId._id;
        }

        const quotation = await Quotation.findByIdAndUpdate(req.params.id, updateData, { new: true })
            .populate("leadId", "leadId leadName email contactNumber");
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found" });
        }
        res.status(200).json({ success: true, message: "Quotation updated successfully", quotation });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update quotation", error: error.message });
    }
};

// Delete quotation
const deleteQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findByIdAndDelete(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found" });
        }
        res.status(200).json({ success: true, message: "Quotation deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete quotation", error: error.message });
    }
};

// Send quotation via email
const sendQuotationEmail = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id).populate("leadId", "leadId leadName email contactNumber");
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found" });
        }

        const recipientEmail = req.body.email || quotation.leadId?.email;
        if (!recipientEmail) {
            return res.status(400).json({ success: false, message: "Recipient email address is required" });
        }

        const clientName = quotation.leadId?.leadName || "Valued Client";
        const quotationNo = quotation.quotationNo || "Quotation";
        const projectName = quotation.projectName || "Project Estimation";
        const totalAmount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(quotation.totalAmount || 0);

        const emailResult = await sendQuotationEmailService({
            email: recipientEmail,
            clientName,
            projectName,
            quotationNo,
            projectType: quotation.projectType || "Web Development & IT Services",
            totalAmount,
            subject: req.body.subject,
            message: req.body.message,
            pdfBase64: req.body.pdfBase64
        });

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: "Failed to send quotation email: " + (emailResult.error || "Email service error")
            });
        }

        // Resiliently update status in database
        try {
            await Quotation.findByIdAndUpdate(req.params.id, { status: "Sent" });
            quotation.status = "Sent";
        } catch (dbErr) {
            console.warn(`[sendQuotationEmail] Status update warning: ${dbErr.message}`);
        }

        return res.status(200).json({
            success: true,
            message: `Quotation sent successfully to ${recipientEmail}`,
            quotation
        });
    } catch (error) {
        console.error("[sendQuotationEmail] Error sending email:", error);
        return res.status(500).json({ success: false, message: "Failed to send quotation email", error: error.message });
    }
};

export { createQuotation, getAllQuotations, getQuotationById, updateQuotation, deleteQuotation, sendQuotationEmail };
