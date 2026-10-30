import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "client",
        required: true,
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "project",
    },
    projectIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "project",
        required: true,
    }],
    selectedDues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "project",
    }],
    referenceNo: {
        type: String,
        required: true,
    },
    invoiceNo: {
        type: String,
        required: true,
        default: "",
        unique: true
    },
    amount: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        default: "",
    },
    method: { type: String, enum: ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"], required: true },
    items: {
        type: [{
            service: String,
            units: String,
            price: Number
        }],
        default: []
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["pending", "partial", "paid", "overdue"],
        default: "pending"
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    payments: [{
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        method: { type: String, default: "Bank Transfer" },
        notes: { type: String, default: "" }
    }],
    previousDue: {
        type: Number,
        default: 0
    },
    dueBreakdown: [
        {
            projectName: String,
            amount: Number
        }
    ]

})

export default mongoose.model("invoice", invoiceSchema);