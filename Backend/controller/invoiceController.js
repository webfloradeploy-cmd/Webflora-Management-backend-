import invoiceModel from "../model/invoiceModel.js";
import projectModel from "../model/projectModel.js";
import Counter from "../model/counterModel.js";


// Add Invoice
const AddInvoice = async (req, res) => {
    try {
        const {
            clientId,
            projectIds, // Array of IDs
            selectedDues, // Array of IDs
            referenceNo,
            invoiceNo,
            amount,
            description,
            method,
            date,
            status,
            items
        } = req.body;

        if (!clientId || !projectIds || !Array.isArray(projectIds) || projectIds.length === 0 || !referenceNo || (!amount && (!items || items.length === 0)) || !method) {
            return res.status(400).json({ message: "Required fields are missing" });
        }

        let calculatedAmount = items && items.length > 0 
            ? items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
            : Number(amount);

        let invNo = invoiceNo;
        if (!invNo) {
            const year = new Date().getFullYear();
            const counter = await Counter.findOneAndUpdate(
                { id: `invoiceNumber-${year}` },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            invNo = `WT-INV-${year}-${String(counter.seq).padStart(4, '0')}`;
        }

        const existingInvoice = await invoiceModel.findOne({ invoiceNo: invNo });
        if (existingInvoice) {
            return res.status(409).json({ message: "Invoice already exists!" });
        }

        // Validate amount against combined project budgets
        const projects = await projectModel.find({ _id: { $in: projectIds } });
        if (projects.length === 0) {
            return res.status(404).json({ message: "No valid projects found" });
        }

        let totalBudget = projects.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        const existingInvoices = await invoiceModel.find({ projectIds: { $in: projectIds } });
        
        // This is complex because one invoice can span multiple projects. 
        // For simplicity, we check if total amount of this invoice + past invoices on ANY of these projects 
        // exceeds the total budget of all these projects combined.
        const totalPaid = existingInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

        if (totalPaid + calculatedAmount > totalBudget) {
            const remaining = totalBudget - totalPaid;
            return res.status(400).json({
                message: `Invoice amount exceeds the combined project budget. Remaining budget: ₹${remaining}`
            });
        }

        // Calculate previous due for the client
        // If selectedDues is provided, use only those projects
        // Otherwise, use all other projects of the client
        let dueQuery = { client: clientId };
        if (selectedDues && Array.isArray(selectedDues)) {
            dueQuery._id = { $in: selectedDues };
        } else {
            // Default to no dues if not explicitly provided as an array
            dueQuery._id = { $in: [] }; 
        }

        const dueProjects = await projectModel.find(dueQuery);
        let totalClientDue = 0;
        let dueBreakdown = [];
        
        for (const p of dueProjects) {
            const projectInvoices = await invoiceModel.find({ projectIds: p._id });
            const totalInvoiced = projectInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
            const remaining = Math.max(0, p.totalAmount - totalInvoiced);
            if (remaining > 0) {
                totalClientDue += remaining;
                dueBreakdown.push({
                    projectName: p.projectName,
                    amount: remaining
                });
            }
        }

        // Merge new projectIds and selectedDues into a single array for proper financial linking
        const allAssociatedProjectIds = [...new Set([...projectIds, ...(selectedDues || [])])];

        const newInvoice = new invoiceModel({
            clientId,
            projectId: projectIds && projectIds.length > 0 ? projectIds[0] : null,
            projectIds: allAssociatedProjectIds,
            selectedDues: selectedDues || [],
            referenceNo,
            invoiceNo: invNo,
            amount: calculatedAmount,
            description,
            method,
            items: items || [],
            date,
            status,
            previousDue: totalClientDue,
            dueBreakdown: dueBreakdown
        });

        await newInvoice.save();

        // Populate and calculate financials for the response
        const populatedInvoice = await invoiceModel.findById(newInvoice._id)
            .populate("clientId")
            .populate("projectId")
            .populate("projectIds");

        const projectNames = (populatedInvoice.projectIds && populatedInvoice.projectIds.length > 0)
            ? populatedInvoice.projectIds.map(p => p.projectName || "Standard Project").join(" & ")
            : (populatedInvoice.projectId?.projectName || "Standard Project");

        res.status(201).json({
            message: "Invoice created successfully",
            invoice: {
                ...populatedInvoice.toObject(),
                id: populatedInvoice._id,
                number: populatedInvoice.invoiceNo,
                projectName: projectNames,
                total: Number(populatedInvoice.amount) || 0,
                grandTotal: (Number(populatedInvoice.amount) || 0) + (Number(populatedInvoice.previousDue) || 0)
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Failed to create invoice", error: error.message });
    }
};


// Get invoices by project ID
const getInvoicesByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const invoices = await invoiceModel
            .find({ $or: [{ projectIds: projectId }, { projectId: projectId }] })
            .populate("clientId")
            .populate("projectId")
            .populate("projectIds");

        const invoicesWithTotals = await Promise.all(invoices.map(async (inv) => {
            const projectNames = (inv.projectIds && inv.projectIds.length > 0)
                ? inv.projectIds.map(p => p.projectName || "Standard Project").join(" & ")
                : (inv.projectId?.projectName || "Standard Project");

            const allLinkedProjects = (inv.projectIds && inv.projectIds.length > 0)
                ? inv.projectIds
                : (inv.projectId ? [inv.projectId] : []);

            let projectTotal = 0;
            let projectDue = 0;

            for (const p of allLinkedProjects) {
                const pBudget = Number(p.totalAmount) || 0;
                projectTotal += pBudget;
                // Calculate all payments on this project
                const pInvoices = await invoiceModel.find({ 
                    $or: [{ projectIds: p._id }, { projectId: p._id }] 
                });
                const pPaid = pInvoices.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                projectDue += Math.max(0, pBudget - pPaid);
            }

            const totalInvoiceObligation = (Number(inv.amount) || 0) + (Number(inv.previousDue) || 0);
            let paidAmount = Number(inv.paidAmount) || 0;
            if (!inv.paidAmount && inv.status === 'paid') {
                paidAmount = totalInvoiceObligation;
            }
            const remainingDue = inv.status === 'paid' ? 0 : Math.max(0, totalInvoiceObligation - paidAmount);

            return {
                ...inv.toObject(),
                clientName: inv.clientId?.clientName || "General Client",
                customerCode: inv.clientId?.clientId || inv.clientId?.referenceNo || "",
                clientAddress: inv.clientId?.address || "",
                projectName: projectNames,
                id: inv._id,
                number: inv.invoiceNo,
                total: Number(inv.amount) || 0,
                grandTotal: totalInvoiceObligation,
                paidAmount: paidAmount,
                remainingDue: remainingDue,
                payments: inv.payments || [],
                projectTotal: projectTotal > 0 ? projectTotal : Number(inv.amount) || 0,
                projectDue: projectDue
            };
        }));

        res.status(200).json({ invoices: invoicesWithTotals });
    } catch (error) {
        res.status(500).json({ message: "Failed to get invoices", error: error.message });
    }
};

// Get invoice by reference number
const getInvoice = async (req, res) => {
    try {
        const { referenceNo } = req.params;

        const invoices = await invoiceModel
            .find({ referenceNo })
            .populate("clientId")
            .populate("projectId")
            .populate("projectIds");

        if (!invoices || invoices.length === 0) {
            return res.status(404).json({ message: "No invoices found!" });
        }

        const invoicesWithTotals = await Promise.all(invoices.map(async (inv) => {
            const projectNames = (inv.projectIds && inv.projectIds.length > 0)
                ? inv.projectIds.map(p => p.projectName || "Standard Project").join(" & ")
                : (inv.projectId?.projectName || "Standard Project");

            const allLinkedProjects = (inv.projectIds && inv.projectIds.length > 0)
                ? inv.projectIds
                : (inv.projectId ? [inv.projectId] : []);

            let projectTotal = 0;
            let projectDue = 0;

            for (const p of allLinkedProjects) {
                const pBudget = Number(p.totalAmount) || 0;
                projectTotal += pBudget;
                const pInvoices = await invoiceModel.find({ 
                    $or: [{ projectIds: p._id }, { projectId: p._id }] 
                });
                const pPaid = pInvoices.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                projectDue += Math.max(0, pBudget - pPaid);
            }

            const totalInvoiceObligation = (Number(inv.amount) || 0) + (Number(inv.previousDue) || 0);
            let paidAmount = Number(inv.paidAmount) || 0;
            if (!inv.paidAmount && inv.status === 'paid') {
                paidAmount = totalInvoiceObligation;
            }
            const remainingDue = inv.status === 'paid' ? 0 : Math.max(0, totalInvoiceObligation - paidAmount);

            return {
                ...inv.toObject(),
                clientName: inv.clientId?.clientName || "General Client",
                customerCode: inv.clientId?.clientId || inv.clientId?.referenceNo || "",
                clientAddress: inv.clientId?.address || "",
                projectName: projectNames,
                id: inv._id,
                number: inv.invoiceNo,
                total: Number(inv.amount) || 0,
                grandTotal: totalInvoiceObligation,
                paidAmount: paidAmount,
                remainingDue: remainingDue,
                payments: inv.payments || [],
                projectTotal: projectTotal > 0 ? projectTotal : Number(inv.amount) || 0,
                projectDue: projectDue
            };
        }));

        res.status(200).json({ invoices: invoicesWithTotals });

    } catch (error) {
        res.status(500).json({ message: "Failed to get invoices", error: error.message });
    }
};


// Get all invoices
const getAllInvoice = async (req, res) => {
    try {
        const invoices = await invoiceModel
            .find()
            .sort({ createdAt: -1, _id: -1 })
            .populate("clientId")
            .populate("projectId")
            .populate("projectIds");

        const invoicesWithTotals = await Promise.all(invoices.map(async (inv) => {
            const projectNames = (inv.projectIds && inv.projectIds.length > 0)
                ? inv.projectIds.map(p => p.projectName || "Standard Project").join(" & ")
                : (inv.projectId?.projectName || "Standard Project");

            const allLinkedProjects = (inv.projectIds && inv.projectIds.length > 0)
                ? inv.projectIds
                : (inv.projectId ? [inv.projectId] : []);

            let projectTotal = 0;
            let projectDue = 0;

            for (const p of allLinkedProjects) {
                const pBudget = Number(p.totalAmount) || 0;
                projectTotal += pBudget;
                const pInvoices = await invoiceModel.find({ 
                    $or: [{ projectIds: p._id }, { projectId: p._id }] 
                });
                const pPaid = pInvoices.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                projectDue += Math.max(0, pBudget - pPaid);
            }

            const totalInvoiceObligation = (Number(inv.amount) || 0) + (Number(inv.previousDue) || 0);
            let paidAmount = Number(inv.paidAmount) || 0;
            if (!inv.paidAmount && inv.status === 'paid') {
                paidAmount = totalInvoiceObligation;
            }
            const remainingDue = inv.status === 'paid' ? 0 : Math.max(0, totalInvoiceObligation - paidAmount);

            return {
                ...inv.toObject(),
                clientName: inv.clientId?.clientName || "General Client",
                customerCode: inv.clientId?.clientId || inv.clientId?.referenceNo || "",
                clientAddress: inv.clientId?.address || "",
                projectName: projectNames,
                id: inv._id,
                number: inv.invoiceNo,
                total: Number(inv.amount) || 0,
                grandTotal: totalInvoiceObligation,
                paidAmount: paidAmount,
                remainingDue: remainingDue,
                payments: inv.payments || [],
                projectTotal: projectTotal > 0 ? projectTotal : Number(inv.amount) || 0,
                projectDue: projectDue
            };
        }));

        res.status(200).json({ invoices: invoicesWithTotals });

    } catch (error) {
        res.status(500).json({ message: "Failed to get invoices", error: error.message });
    }
};


// Update invoice
const updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await invoiceModel.findById(id);

        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found!" });
        }

        const {
            clientId,
            projectIds: newProjectIds,
            selectedDues,
            referenceNo,
            invoiceNo,
            amount: newAmount,
            description,
            method,
            date,
            status,
            items
        } = req.body;

        // Check for duplicate invoice number if it's being changed
        if (invoiceNo && invoiceNo !== invoice.invoiceNo) {
            const existingWithNewNo = await invoiceModel.findOne({ invoiceNo, _id: { $ne: id } });
            if (existingWithNewNo) {
                return res.status(409).json({ message: "Invoice number already exists!" });
            }
        }

        // Validate amount if updated
        const targetProjectIds = newProjectIds || invoice.projectIds;
        const targetItems = items !== undefined ? items : invoice.items;
        const targetAmount = targetItems && targetItems.length > 0
            ? targetItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
            : (newAmount !== undefined ? Number(newAmount) : Number(invoice.amount));

        if (newAmount !== undefined || newProjectIds !== undefined || targetItems !== undefined) {
            const projects = await projectModel.find({ _id: { $in: targetProjectIds } });
            if (projects.length === 0) {
                return res.status(404).json({ message: "Projects not found" });
            }

            let totalBudget = projects.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
            const existingInvoices = await invoiceModel.find({ projectIds: { $in: targetProjectIds }, _id: { $ne: id } });
            const totalPaid = existingInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

            if (totalPaid + targetAmount > totalBudget) {
                const remaining = totalBudget - totalPaid;
                return res.status(400).json({
                    message: `Update failed. Amount exceeds combined project budget. Remaining budget: ₹${remaining}`
                });
            }
        }

        // Calculate previous due for the client if selectedDues is provided
        const targetClientId = clientId || invoice.clientId;
        const targetSelectedDues = selectedDues !== undefined ? selectedDues : (invoice.selectedDues || []);
        
        let totalClientDue = 0;
        let dueBreakdown = [];
        if (targetSelectedDues && Array.isArray(targetSelectedDues) && targetSelectedDues.length > 0) {
            const dueProjects = await projectModel.find({ client: targetClientId, _id: { $in: targetSelectedDues } });
            for (const p of dueProjects) {
                const projectInvoices = await invoiceModel.find({ projectIds: p._id, _id: { $ne: id } });
                const totalInvoiced = projectInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
                const remaining = Math.max(0, p.totalAmount - totalInvoiced);
                if (remaining > 0) {
                    totalClientDue += remaining;
                    dueBreakdown.push({
                        projectName: p.projectName,
                        amount: remaining
                    });
                }
            }
        }

        const targetPaidAmount = req.body.paidAmount !== undefined 
            ? Number(req.body.paidAmount) 
            : (status === 'paid' ? targetAmount + totalClientDue : (invoice.paidAmount || 0));

        let targetPayments = invoice.payments || [];
        if (req.body.payments && Array.isArray(req.body.payments)) {
            targetPayments = req.body.payments;
        } else if (req.body.newPayment) {
            targetPayments.push({
                amount: Number(req.body.newPayment.amount),
                method: req.body.newPayment.method || req.body.method || "Bank Transfer",
                date: req.body.newPayment.date ? new Date(req.body.newPayment.date) : new Date(),
                notes: req.body.newPayment.notes || ""
            });
        }

        const data = {
            clientId: targetClientId,
            selectedDues: targetSelectedDues,
            projectIds: [...new Set([...(newProjectIds || invoice.projectIds), ...targetSelectedDues])],
            referenceNo: referenceNo || invoice.referenceNo,
            invoiceNo: invoiceNo || invoice.invoiceNo,
            amount: targetAmount,
            paidAmount: targetPaidAmount,
            payments: targetPayments,
            description: description !== undefined ? description : invoice.description,
            method: method || invoice.method,
            items: items !== undefined ? items : invoice.items,
            date: date || invoice.date,
            status: status || invoice.status,
            previousDue: totalClientDue,
            dueBreakdown: dueBreakdown
        };

        // Explicitly include all fields for update
        const updateData = {
            ...data,
            projectId: data.projectIds && data.projectIds.length > 0 ? data.projectIds[0] : null
        };

        const updatedInvoice = await invoiceModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        // Populate and calculate financials for the response
        const populatedInvoice = await invoiceModel.findById(updatedInvoice._id)
            .populate("clientId")
            .populate("projectId")
            .populate("projectIds");

        const projectNames = (populatedInvoice.projectIds && populatedInvoice.projectIds.length > 0)
            ? populatedInvoice.projectIds.map(p => p.projectName || "Standard Project").join(" & ")
            : (populatedInvoice.projectId?.projectName || "Standard Project");

        const totalInvoiceObligation = populatedInvoice.amount + (populatedInvoice.previousDue || 0);
        let paidAmt = Number(populatedInvoice.paidAmount) || 0;
        if (!populatedInvoice.paidAmount && populatedInvoice.status === 'paid') {
            paidAmt = totalInvoiceObligation;
        }
        const remainingDue = populatedInvoice.status === 'paid' ? 0 : Math.max(0, totalInvoiceObligation - paidAmt);

        res.status(200).json({
            message: "Invoice updated successfully",
            invoice: {
                ...populatedInvoice.toObject(),
                id: populatedInvoice._id,
                number: populatedInvoice.invoiceNo,
                customerCode: populatedInvoice.clientId?.clientId || populatedInvoice.clientId?.referenceNo || "",
                projectName: projectNames,
                grandTotal: totalInvoiceObligation,
                paidAmount: paidAmt,
                remainingDue: remainingDue,
                payments: populatedInvoice.payments || []
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Failed to update invoice", error: error.message });
    }
};

// Record Partial or Full Payment
const recordPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, method, date, notes } = req.body;

        const paymentAmount = Number(amount);
        if (!paymentAmount || paymentAmount <= 0) {
            return res.status(400).json({ message: "Payment amount must be greater than 0" });
        }

        const invoice = await invoiceModel.findById(id);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found!" });
        }

        const totalObligation = (Number(invoice.amount) || 0) + (Number(invoice.previousDue) || 0);
        const currentPaid = Number(invoice.paidAmount) || (invoice.status === 'paid' ? totalObligation : 0);
        const remainingBefore = Math.max(0, totalObligation - currentPaid);

        if (paymentAmount > remainingBefore) {
            return res.status(400).json({ 
                message: `Payment amount (₹${paymentAmount}) cannot exceed remaining balance (₹${remainingBefore})` 
            });
        }

        const newPaidTotal = currentPaid + paymentAmount;
        const isFullyPaid = newPaidTotal >= totalObligation;

        if (!invoice.payments) {
            invoice.payments = [];
        }

        invoice.payments.push({
            amount: paymentAmount,
            date: date ? new Date(date) : new Date(),
            method: method || invoice.method || "Bank Transfer",
            notes: notes || ""
        });

        invoice.paidAmount = newPaidTotal;
        invoice.method = method || invoice.method;
        invoice.status = isFullyPaid ? "paid" : "partial";

        await invoice.save();

        const populatedInvoice = await invoiceModel.findById(invoice._id)
            .populate("clientId")
            .populate("projectId")
            .populate("projectIds");

        const projectNames = (populatedInvoice.projectIds && populatedInvoice.projectIds.length > 0)
            ? populatedInvoice.projectIds.map(p => p.projectName || "Standard Project").join(" & ")
            : (populatedInvoice.projectId?.projectName || "Standard Project");

        res.status(200).json({
            message: isFullyPaid ? "Invoice fully paid successfully!" : `Partial payment of ₹${paymentAmount} recorded successfully!`,
            invoice: {
                ...populatedInvoice.toObject(),
                id: populatedInvoice._id,
                number: populatedInvoice.invoiceNo,
                projectName: projectNames,
                customerCode: populatedInvoice.clientId?.clientId || populatedInvoice.clientId?.referenceNo || "",
                grandTotal: totalObligation,
                paidAmount: newPaidTotal,
                remainingDue: Math.max(0, totalObligation - newPaidTotal),
                payments: populatedInvoice.payments || []
            }
        });
    } catch (error) {
        console.error("Record payment error:", error);
        res.status(500).json({ message: "Failed to record payment", error: error.message });
    }
};


// Delete Invoice
const deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await invoiceModel.findByIdAndDelete(id);

        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found!" });
        }

        // For delete, return the updated project balance too
        const projects = await projectModel.find({ _id: { $in: invoice.projectIds } });
        let projectsSummary = [];
        for (const project of projects) {
            const projectInvoices = await invoiceModel.find({ projectIds: project._id });
            const totalPaid = projectInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
            projectsSummary.push({
                ...project.toObject(),
                totalPaid,
                dueAmount: project.totalAmount - totalPaid
            });
        }

        // Calculate totalDue for the client (Sum of all projects' remaining budget)
        let clientTotalDue = 0;
        if (invoice.clientId) {
            const allClientProjects = await projectModel.find({ client: invoice.clientId });
            for (const p of allClientProjects) {
                const projectInvoices = await invoiceModel.find({ projectId: p._id });
                const totalInvoiced = projectInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
                clientTotalDue += (Math.max(0, p.totalAmount - totalInvoiced));
            }
        }

        res.status(200).json({
            message: "Invoice deleted successfully",
            invoice,
            projects: projectsSummary
        });

    } catch (error) {
        res.status(500).json({ message: "Failed to delete invoice", error: error.message });
    }
};


export {
    AddInvoice,
    getInvoice,
    getAllInvoice,
    updateInvoice,
    recordPayment,
    deleteInvoice,
    getInvoicesByProject
};
