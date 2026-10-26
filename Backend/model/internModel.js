import mongoose from "mongoose";

const internSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      minlength: [10, "Phone number must be at least 10 digits."],
    },
    address: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "intern",
      enum: ["intern"],
    },
    salary: {
      type: Number,
      required: true,
    },
    duration: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    // Auto-generated Unique Employee/Intern ID (e.g. INT-001)
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
  },
  { timestamps: true }
);

export default mongoose.model("intern", internSchema);
