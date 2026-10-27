import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
    leadId: {
        type: String,
        unique: true,
        sparse: true
    },
    leadName: {
        type: String,
        required: true
    },
    contactNumber: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: false,
        lowercase: true,
        trim: true,
        default: ""
    },
    address: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["New", "Contacted", "Interested", "Not Interested", "Quotation Requested", "Quotation Approved", "Closed", "Lost"],
        default: "New"
    },
    interestStatus: {
        type: String,
        enum: ["Interested", "Not Interested", "Under Consideration", "Pending"],
        default: "Pending"
    },
    followUpDate: {
        type: Date,
        default: null
    },
    followUps: [{
        followUpDate: {
            type: Date,
            default: Date.now
        },
        notes: {
            type: String,
            default: ""
        },
        interestStatus: {
            type: String,
            enum: ["Interested", "Not Interested", "Under Consideration", "Pending"],
            default: "Pending"
        },
        nextFollowUpDate: {
            type: Date,
            default: null
        },
        conductedBy: {
            id: { type: mongoose.Schema.Types.ObjectId },
            name: { type: String, default: "" },
            role: { type: String, default: "" }
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    lastFollowUp: {
        followUpDate: { type: Date, default: null },
        conductedByName: { type: String, default: "" },
        notes: { type: String, default: "" }
    },
    quotationRequest: {
        status: {
            type: String,
            enum: ["None", "Requested", "Approved", "Rejected"],
            default: "None"
        },
        requestedBy: {
            type: String,
            default: ""
        },
        requestedAt: {
            type: Date,
            default: null
        },
        notes: {
            type: String,
            default: ""
        },
        approvedBy: {
            type: String,
            default: ""
        },
        approvedAt: {
            type: Date,
            default: null
        },
        rejectionReason: {
            type: String,
            default: ""
        }
    },
    source: {
        type: String,
        default: ""
    },
    notes: {
        type: String,
        default: ""
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "admin",
        required: false
    },
    createdBy: {
        id: { type: mongoose.Schema.Types.ObjectId },
        name: { type: String, default: "" },
        role: { type: String, default: "" }
    }
}, { timestamps: true });

const Lead = mongoose.model("lead", leadSchema);

// Safely drop existing unique email index if it was previously created
Lead.collection.dropIndex("email_1").catch(() => {});

export default Lead;
