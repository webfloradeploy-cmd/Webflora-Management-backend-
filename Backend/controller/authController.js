import Admin from "../model/adminModel.js";
import Employee from "../model/employeeModel.js";
import Intern from "../model/internModel.js";
import OTP from "../model/otpModel.js";
import bcrypt from "bcrypt";
import { sendPasswordResetOTP } from "../utils/emailService.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

// Unified Global Login
const unifiedLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        let user = null;
        let role = "";
        console.log(`[LOGIN ATTEMPT] Email: "${email}", Role check: Admin/Employee/Intern`);

        // 1. Try Admin
        user = await Admin.findOne({ email: email.toLowerCase().trim() });
        if (user) {
            role = "admin";
            console.log(`[LOGIN ATTEMPT] Found Admin user: ${user.email}`);
        }

        // 2. Try Employee
        if (!user) {
            user = await Employee.findOne({ email: email.toLowerCase().trim() });
            if (user) {
                role = "employee";
                console.log(`[LOGIN ATTEMPT] Found Employee user: ${user.email}`);
            }
        }

        // 3. Try Intern
        if (!user) {
            user = await Intern.findOne({ email: email.toLowerCase().trim() });
            if (user) {
                role = "intern";
                console.log(`[LOGIN ATTEMPT] Found Intern user: ${user.email}`);
            }
        }

        if (!user) {
            console.log(`[LOGIN ATTEMPT] User not found for email: "${email}"`);
            return res.status(404).json({ message: "No account found with this email" });
        }

        // Verify password
        console.log(`[LOGIN ATTEMPT] Comparing received password: "${password}" (length: ${password ? password.length : 0}) with stored hash`);
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        console.log(`[LOGIN ATTEMPT] Password verification for ${email}: ${isPasswordCorrect ? "SUCCESS" : "FAILED"}`);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id, role: user.role || role }, 
            process.env.JWT_SECRET, 
            { expiresIn: "12h" }
        );

        res.status(200).json({ 
            message: "Login successful", 
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role || role 
            }
        });

    } catch (error) {
        console.error("Unified Login Error:", error);
        res.status(500).json({ message: "Internal server error during login", error: error.message });
    }
};

// Forgot Password - Send OTP
const forgotPassword = async (req, res) => {
    console.log("Forgot Password Request Received:", req.body);
    try {
        const { email: rawEmail, role } = req.body;

        if (!rawEmail) {
            return res.status(400).json({ message: "Email is required" });
        }

        const email = rawEmail.toLowerCase().trim();
        let finalRole = (role || "").toLowerCase().trim();

        // 1. Check specified role first
        let user = null;
        if (finalRole === "admin") user = await Admin.findOne({ email });
        else if (finalRole === "employee") user = await Employee.findOne({ email });
        else if (finalRole === "intern") user = await Intern.findOne({ email });

        // 2. Auto-detect fallback across all roles if not found under selected tab
        if (!user) {
            user = await Admin.findOne({ email });
            if (user) finalRole = "admin";
        }
        if (!user) {
            user = await Employee.findOne({ email });
            if (user) finalRole = "employee";
        }
        if (!user) {
            user = await Intern.findOne({ email });
            if (user) finalRole = "intern";
        }

        if (!user) {
            console.log(`User not found: ${email}`);
            return res.status(404).json({ message: "No account found with this email" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Store OTP in database
        try {
            await OTP.findOneAndUpdate(
                { email },
                { otp, role: finalRole, expiresAt, attempts: 0 },
                { upsert: true, new: true }
            );
        } catch (dbError) {
            console.error("Database Error saving OTP:", dbError);
            return res.status(500).json({ message: "Failed to save verification code. Please try again." });
        }

        console.log(`[OTP GENERATED] Code for ${email} (${finalRole}): ${otp}`);

        // Dispatch OTP via centralized Hostinger email service
        const emailResult = await sendPasswordResetOTP(email, otp);
        if (!emailResult.success) {
            return res.status(500).json({
                message: "Failed to send OTP to your email: " + (emailResult.error || "Email service error")
            });
        }

        return res.status(200).json({ 
            message: "OTP sent successfully to your email",
            role: finalRole 
        });
    } catch (error) {
        console.error("Critical Forgot Password Error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { email: rawEmail, otp, role } = req.body;
        if (!rawEmail || !otp) return res.status(400).json({ message: "Email and OTP are required" });

        const email = rawEmail.toLowerCase().trim();

        // Search by email and role or fallback to email
        let otpRecord = await OTP.findOne({ email, ...(role ? { role } : {}) });
        if (!otpRecord) {
            otpRecord = await OTP.findOne({ email });
        }

        if (!otpRecord) return res.status(400).json({ message: "Invalid code or request expired" });

        if (otpRecord.expiresAt < new Date()) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({ message: "Code has expired" });
        }

        if (otpRecord.otp !== otp.trim()) {
            otpRecord.attempts = (otpRecord.attempts || 0) + 1;
            await otpRecord.save();
            if (otpRecord.attempts >= 5) {
                await OTP.deleteOne({ _id: otpRecord._id });
                return res.status(400).json({ message: "Too many failed attempts. Try again later." });
            }
            return res.status(400).json({ message: "Incorrect code" });
        }

        res.status(200).json({ message: "OTP verified successfully", role: otpRecord.role });
    } catch (error) {
        res.status(500).json({ message: "Verification failed", error: error.message });
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { email: rawEmail, role, newPassword, otp } = req.body;
        if (!rawEmail || !newPassword || !otp) return res.status(400).json({ message: "All fields are required" });

        const email = rawEmail.toLowerCase().trim();

        let otpRecord = await OTP.findOne({ email, otp: otp.trim() });
        if (!otpRecord || otpRecord.expiresAt < new Date()) {
            return res.status(400).json({ message: "Invalid session or OTP expired. Please start over." });
        }

        const targetRole = otpRecord.role || (role ? role.toLowerCase() : "");

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        let user = null;
        if (targetRole === "admin") user = await Admin.findOneAndUpdate({ email }, { password: hashedPassword });
        else if (targetRole === "employee") user = await Employee.findOneAndUpdate({ email }, { password: hashedPassword });
        else if (targetRole === "intern") user = await Intern.findOneAndUpdate({ email }, { password: hashedPassword });

        if (!user) {
            // Fallback: search across all roles
            user = await Admin.findOneAndUpdate({ email }, { password: hashedPassword });
            if (!user) user = await Employee.findOneAndUpdate({ email }, { password: hashedPassword });
            if (!user) user = await Intern.findOneAndUpdate({ email }, { password: hashedPassword });
        }

        if (!user) return res.status(404).json({ message: "User not found" });

        await OTP.deleteOne({ _id: otpRecord._id });
        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Reset failed", error: error.message });
    }
};

export { forgotPassword, verifyOTP, resetPassword, unifiedLogin };
