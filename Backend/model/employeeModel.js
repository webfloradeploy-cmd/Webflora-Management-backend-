import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        required: [true, "Email is required"],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be at least 8 characters long"],
    },
    role: {
        type: String,
        required: [true, "Role is required"],
    },
    phone: {
        type: String,
        required: [true, "Phone is required"],
        minlength: [10, "Phone number must be 10 digit."]
    },
    address: {
        type: String,
        required: [true, "Address is required"],
    },
    salary: {
        type: Number,
        required: [true, "Salary is required"],
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
    },
    // Auto-generated Unique Employee ID (e.g. EMP-001)
    employeeId: {
        type: String,
        trim: true,
        default: "",
    },
    // Job Role & Department
    jobRole: {
        type: String,
        default: "",
    },
    department: {
        type: String,
        default: "",
    },
    joiningDate: {
        type: Date,
        default: Date.now,
    },
    // Bio Data / Personal Info
    fatherName: {
        type: String,
        default: "",
    },
    motherName: {
        type: String,
        default: "",
    },
    dob: {
        type: Date,
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other", ""],
        default: "",
    },
    bloodGroup: {
        type: String,
        default: "",
    },
    emergencyPhone: {
        type: String,
        default: "",
    },
    aadhaarNumber: {
        type: String,
        default: "",
    },
    panNumber: {
        type: String,
        default: "",
    },
    bio: {
        type: String,
        default: "",
    },
    // Education Details
    qualification: {
        type: String,
        default: "",
    },
    stream: {
        type: String,
        default: "",
    },
    institution: {
        type: String,
        default: "",
    },
    passingYear: {
        type: String,
        default: "",
    },
    gradePercentage: {
        type: String,
        default: "",
    },
    // Bank Details
    bankName: {
        type: String,
        default: "",
    },
    accountNumber: {
        type: String,
        default: "",
    },
    ifscCode: {
        type: String,
        default: "",
    },
}, { timestamps: true });

const Employee = mongoose.model("employee", employeeSchema);

export default Employee;