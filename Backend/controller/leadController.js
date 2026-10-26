import Lead from "../model/leadModel.js";

// Create a new lead
const createLead = async (req, res) => {
    try {
        const { leadName, contactNumber, email, address, source, notes, status, interestStatus, followUpDate } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role?.toLowerCase();

        const newLead = new Lead({
            leadName,
            contactNumber,
            email: email ? email.trim() : "",
            address: address || "",
            source: source || "",
            notes: notes || "",
            status: status || "New",
            interestStatus: interestStatus || (status === "Interested" ? "Interested" : "Pending"),
            followUpDate: followUpDate ? new Date(followUpDate) : null,
            adminId: userRole === "admin" ? userId : undefined,
            createdBy: {
                id: userId,
                name: req.user.name || (userRole === "admin" ? "Admin" : "Employee"),
                role: userRole
            }
        });

        await newLead.save();
        res.status(201).json({ success: true, message: "Lead created successfully", lead: newLead });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to create lead", error: error.message });
    }
};

// Get all leads
const getAllLeads = async (req, res) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, leads });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch leads", error: error.message });
    }
};

// Get lead by ID
const getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        res.status(200).json({ success: true, lead });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch lead", error: error.message });
    }
};

// Update lead
const updateLead = async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.followUpDate) {
            data.followUpDate = new Date(data.followUpDate);
        }

        const lead = await Lead.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        res.status(200).json({ success: true, message: "Lead updated successfully", lead });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update lead", error: error.message });
    }
};

// Request quotation for interested lead
const requestQuotation = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const userName = req.user.name || "Employee";

        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        lead.interestStatus = "Interested";
        lead.status = "Quotation Requested";
        lead.quotationRequest = {
            status: "Requested",
            requestedBy: userName,
            requestedAt: new Date(),
            notes: notes || "",
            approvedBy: "",
            approvedAt: null,
            rejectionReason: ""
        };

        await lead.save();
        res.status(200).json({
            success: true,
            message: "Quotation request submitted to Admin for approval",
            lead
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to request quotation", error: error.message });
    }
};

// Admin approves quotation request
const approveQuotationRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminName = req.user.name || "Admin";

        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        lead.interestStatus = "Interested";
        lead.status = "Quotation Approved";
        lead.quotationRequest = {
            ...lead.quotationRequest,
            status: "Approved",
            approvedBy: adminName,
            approvedAt: new Date()
        };

        await lead.save();
        res.status(200).json({
            success: true,
            message: "Quotation request approved! Quotation can now be created.",
            lead
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to approve quotation request", error: error.message });
    }
};

// Admin rejects quotation request
const rejectQuotationRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        lead.status = "Contacted";
        lead.quotationRequest = {
            ...lead.quotationRequest,
            status: "Rejected",
            rejectionReason: reason || "Rejected by admin"
        };

        await lead.save();
        res.status(200).json({
            success: true,
            message: "Quotation request rejected",
            lead
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to reject quotation request", error: error.message });
    }
};

// Add a follow-up record to a lead
const addFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, interestStatus, nextFollowUpDate, followUpDate, conductedByName, conductedById } = req.body;

        const lead = await Lead.findById(id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        const personName = conductedByName || req.user.name || (req.user.role === 'admin' ? 'Admin' : 'Employee');
        const personId = conductedById || req.user.id;
        const personRole = req.user.role || 'employee';

        const newFollowUp = {
            followUpDate: followUpDate ? new Date(followUpDate) : new Date(),
            notes: notes || "",
            interestStatus: interestStatus || lead.interestStatus || "Pending",
            nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
            conductedBy: {
                id: personId,
                name: personName,
                role: personRole
            },
            createdAt: new Date()
        };

        if (!lead.followUps) {
            lead.followUps = [];
        }
        lead.followUps.unshift(newFollowUp);

        lead.lastFollowUp = {
            followUpDate: newFollowUp.followUpDate,
            conductedByName: personName,
            notes: notes || ""
        };

        if (interestStatus) {
            lead.interestStatus = interestStatus;
            if (interestStatus === "Interested" && lead.status !== "Quotation Requested" && lead.status !== "Quotation Approved") {
                lead.status = "Interested";
            } else if (interestStatus === "Not Interested") {
                lead.status = "Not Interested";
            }
        }

        if (nextFollowUpDate) {
            lead.followUpDate = new Date(nextFollowUpDate);
        }

        await lead.save();
        res.status(200).json({
            success: true,
            message: "Follow-up added successfully",
            lead
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to add follow-up", error: error.message });
    }
};

// Delete lead
const deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        res.status(200).json({ success: true, message: "Lead deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete lead", error: error.message });
    }
};

export {
    createLead,
    getAllLeads,
    getLeadById,
    updateLead,
    deleteLead,
    requestQuotation,
    approveQuotationRequest,
    rejectQuotationRequest,
    addFollowUp
};
