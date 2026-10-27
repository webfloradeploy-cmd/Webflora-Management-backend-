import Expense from "../model/expenseModel.js";
import Employee from "../model/employeeModel.js";
import Intern from "../model/internModel.js";

// Create a new expense
const createExpense = async (req, res) => {
    try {
        const { date, amount, description, category, type, moneySource, recipientId, recipientModel } = req.body;
        const receiptImage = req.file?.path;

        // Validation for photo
        if (!receiptImage) {
            return res.status(400).json({ message: "Receipt photo is compulsory" });
        }

        const newExpense = new Expense({
            date,
            amount: Number(amount),
            description,
            category,
            type,
            moneySource,
            recipientId: recipientId || undefined,
            recipientModel: recipientModel || undefined,
            receiptImage,
            recordedBy: req.user.id,
            recordedByModel: req.user.role.toLowerCase(), 
            status: "approved"
        });

        await newExpense.save();
        res.status(201).json({ message: "Expense recorded successfully", expense: newExpense });
    } catch (error) {
        console.error("CRITICAL ERROR creating expense:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: "Failed to record expense", error: error.message });
    }
};

// Get expenses with filters
const getExpenses = async (req, res) => {
    try {
        let query = {};

        // Filtering: Admin sees all, Others see only their own
        if (req.user?.role?.toLowerCase() !== "admin") {
            query.recordedBy = req.user.id;
        }

        // Optional filters
        if (req.query.startDate && req.query.endDate) {
            query.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }

        if (req.query.type) {
            query.type = req.query.type;
        }

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.returnStatus) {
            query.returnStatus = req.query.returnStatus;
        }

        const expenses = await Expense.find(query)
            .sort({ date: -1, createdAt: -1, _id: -1 })
            .populate("recordedBy", "name email role");

        // Manually populate recipient names
        const enrichedExpenses = await Promise.all(expenses.map(async (exp) => {
            let recipientName = "N/A";
            if (exp.recipientId && exp.recipientModel) {
                let recipient;
                if (exp.recipientModel === "employee") {
                    recipient = await Employee.findById(exp.recipientId).select("name");
                } else if (exp.recipientModel === "intern") {
                    recipient = await Intern.findById(exp.recipientId).select("name");
                }
                recipientName = recipient ? recipient.name : "Unknown";
            }
            return {
                ...exp._doc,
                recipientName
            };
        }));

        res.status(200).json(enrichedExpenses);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch expenses", error: error.message });
    }
};

// Delete an expense
const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await Expense.findByIdAndDelete(id);
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }
        res.status(200).json({ message: "Expense deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete expense", error: error.message });
    }
};

// Update return status (Admin only)
const updateReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { returnStatus } = req.body;

        if (!["Pending", "Returned"].includes(returnStatus)) {
            return res.status(400).json({ message: "Invalid return status" });
        }

        let updateData = { returnStatus };
        if (returnStatus === "Returned") {
            updateData.returnDate = new Date();
        } else {
            updateData.returnDate = null;
        }

        const expense = await Expense.findByIdAndUpdate(id, updateData, { new: true });
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        res.status(200).json({ message: "Return status updated successfully", expense });
    } catch (error) {
        res.status(500).json({ message: "Failed to update return status", error: error.message });
    }
};

export { createExpense, getExpenses, deleteExpense, updateReturnStatus };
