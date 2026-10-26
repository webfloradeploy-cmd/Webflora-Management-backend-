import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
    key: {
        type: String,
        default: "global_settings",
        unique: true
    },
    companyInfo: {
        companyName: { type: String, default: "Webflora Technologies" },
        website: { type: String, default: "https://webfloratechnologies.com" },
        email: { type: String, default: "contact@webfloratechnologies.com" },
        phone: { type: String, default: "+91 8863081255, +91 8540814729" },
        address: { type: String, default: "123 Tech Park, Bengaluru, Karnataka 560001" },
        gstNumber: { type: String, default: "29ABCDE1234F1Z5" }
    },
    // Global permissions for all employees
    employeePermissions: {
        projects: { type: Boolean, default: false },
        invoices: { type: Boolean, default: false },
        clients: { type: Boolean, default: false },
        leads: { type: Boolean, default: false },
        quotations: { type: Boolean, default: false },
        agreements: { type: Boolean, default: false },
        expenses: { type: Boolean, default: true },
        salaries: { type: Boolean, default: true },
        handovers: { type: Boolean, default: true },
        notices: { type: Boolean, default: true },
        communications: { type: Boolean, default: true },
        activity: { type: Boolean, default: true },
        reports: { type: Boolean, default: false }
    },
    // Custom overrides per employee
    employeeOverrides: [{
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "employee",
            required: true
        },
        permissions: {
            projects: { type: Boolean },
            invoices: { type: Boolean },
            clients: { type: Boolean },
            leads: { type: Boolean },
            quotations: { type: Boolean },
            agreements: { type: Boolean },
            expenses: { type: Boolean },
            salaries: { type: Boolean },
            handovers: { type: Boolean },
            notices: { type: Boolean },
            communications: { type: Boolean },
            activity: { type: Boolean },
            reports: { type: Boolean }
        }
    }]
}, { timestamps: true });

const Settings = mongoose.model("settings", settingsSchema);

export default Settings;
