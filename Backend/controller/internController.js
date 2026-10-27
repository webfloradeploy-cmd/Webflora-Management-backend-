import Intern from "../model/internModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Salary from "../model/salaryModel.js";
import { sendWelcomeEmail } from "../utils/emailService.js";
import { generateInternId } from "../utils/idGenerator.js";

// -----------------------------------------------
// Admin - Add Intern
// -----------------------------------------------
const Addintern = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      address,
      duration,
      salary,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !address ||
      !duration ||
      !salary
    ) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    // Prevent duplicate email
    const existingIntern = await Intern.findOne({ email });
    if (existingIntern) {
      return res.status(400).json({ message: "Intern already exists!" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Auto-generate unique Intern ID (e.g. INT-001)
    const employeeId = req.body.employeeId || await generateInternId();

    // Create new intern
    const newIntern = new Intern({
      employeeId,
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      duration,
      salary,
      role: "intern",
      status: req.body.status || "active",
      jobRole: req.body.jobRole || "",
      department: req.body.department || "",
      joiningDate: req.body.joiningDate || new Date(),
      fatherName: req.body.fatherName || "",
      motherName: req.body.motherName || "",
      dob: req.body.dob || null,
      gender: req.body.gender || "",
      bloodGroup: req.body.bloodGroup || "",
      emergencyPhone: req.body.emergencyPhone || "",
      aadhaarNumber: req.body.aadhaarNumber || "",
      panNumber: req.body.panNumber || "",
      bio: req.body.bio || "",
      qualification: req.body.qualification || "",
      stream: req.body.stream || "",
      institution: req.body.institution || "",
      passingYear: req.body.passingYear || "",
      gradePercentage: req.body.gradePercentage || "",
      bankName: req.body.bankName || "",
      accountNumber: req.body.accountNumber || "",
      ifscCode: req.body.ifscCode || ""
    });

    await newIntern.save();

    // Send welcome email in background
    console.log(`Attempting to send welcome email to ${email}...`);
    sendWelcomeEmail(email, password, name, "intern")
      .then(emailResult => {
        if (emailResult.success) console.log(`Welcome email delivered to ${email}`);
        else console.error(`Failed to deliver welcome email to ${email}:`, emailResult.error);
      })
      .catch(err => console.error("Email error:", err));

    const internObj = newIntern.toObject();
    delete internObj.password;

    return res.status(201).json({
      message: "Intern created successfully",
      intern: internObj,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// -----------------------------------------------
// Intern Login
// -----------------------------------------------
const LoginIntern = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json("All fields are required!");
    }

    // Find intern by email
    const intern = await Intern.findOne({ email });

    if (!intern) {
      return res.status(404).json("Intern not found!");
    }

    // Check password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      intern.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json("Invalid password");
    }

    // Generate token
    const token = jwt.sign(
      {
        id: intern._id,
        role: intern.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      intern: {
        id: intern._id,
        name: intern.name,
        email: intern.email,
        role: intern.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to login", error: error.message });
  }
};

// Get All Interns
// -----------------------------------------------
const getAllIntern = async (req, res) => {
  try {
    const interns = await Intern.aggregate([
      {
        $lookup: {
          from: "salaries",
          localField: "_id",
          foreignField: "payeeId",
          as: "payments"
        }
      },
      {
        $addFields: {
          totalPaid: { $sum: "$payments.amount" }
        }
      },
      {
        $project: {
          password: 0,
          payments: 0
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);
    res.status(200).json({ interns });
  } catch (error) {
    res.status(500).json({ message: "Failed to get interns", error: error.message });
    console.error(error);
  }
};

// -----------------------------------------------
// Update Intern
// -----------------------------------------------
// -----------------------------------------------
// Update Intern
// -----------------------------------------------
const updateIntern = async (req, res) => {
  try {
    const { id } = req.params;

    let {
      name,
      email,
      password,
      phone,
      address,
      duration,
      salary,
      status,
      jobRole,
      department,
      joiningDate,
      fatherName,
      motherName,
      dob,
      gender,
      bloodGroup,
      emergencyPhone,
      aadhaarNumber,
      panNumber,
      bio,
      qualification,
      stream,
      institution,
      passingYear,
      gradePercentage,
      bankName,
      accountNumber,
      ifscCode
    } = req.body;

    // Find intern by ID
    const intern = await Intern.findById(id);
    if (!intern) {
      return res.status(404).json({ message: "Intern not found!" });
    }

    // If password provided → hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      intern.password = await bcrypt.hash(password, salt);
    }

    // Update only provided fields
    intern.name = name || intern.name;
    intern.email = email || intern.email;
    intern.phone = phone || intern.phone;
    intern.address = address || intern.address;
    intern.duration = duration || intern.duration;
    intern.salary = salary || intern.salary;
    if (req.body.employeeId !== undefined && req.body.employeeId.trim()) intern.employeeId = req.body.employeeId.trim();
    if (status !== undefined) intern.status = status;
    if (jobRole !== undefined) intern.jobRole = jobRole;
    if (department !== undefined) intern.department = department;
    if (joiningDate !== undefined) intern.joiningDate = joiningDate;
    if (fatherName !== undefined) intern.fatherName = fatherName;
    if (motherName !== undefined) intern.motherName = motherName;
    if (dob !== undefined) intern.dob = dob;
    if (gender !== undefined) intern.gender = gender;
    if (bloodGroup !== undefined) intern.bloodGroup = bloodGroup;
    if (emergencyPhone !== undefined) intern.emergencyPhone = emergencyPhone;
    if (aadhaarNumber !== undefined) intern.aadhaarNumber = aadhaarNumber;
    if (panNumber !== undefined) intern.panNumber = panNumber;
    if (bio !== undefined) intern.bio = bio;
    if (qualification !== undefined) intern.qualification = qualification;
    if (stream !== undefined) intern.stream = stream;
    if (institution !== undefined) intern.institution = institution;
    if (passingYear !== undefined) intern.passingYear = passingYear;
    if (gradePercentage !== undefined) intern.gradePercentage = gradePercentage;
    if (bankName !== undefined) intern.bankName = bankName;
    if (accountNumber !== undefined) intern.accountNumber = accountNumber;
    if (ifscCode !== undefined) intern.ifscCode = ifscCode;

    await intern.save();

    const internObj = intern.toObject();
    delete internObj.password;

    res.status(200).json({
      message: "Intern updated successfully",
      intern: internObj,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update intern", error: error.message });
  }
};

// -----------------------------------------------
// Delete Intern
// -----------------------------------------------
const deleteIntern = async (req, res) => {
  try {
    const { id } = req.params;
    const internID = await Intern.findByIdAndDelete(id);
    if (!internID) {
      return res.status(401).json({ message: "Intern not found!" });
    }
    res.status(201).json({ message: "Interns deleted successfully!" })
  } catch (error) {
    res.status(500).json({ message: "Failed to delete intern", error: error.message });
    console.error(error);
  }
}

// Get Intern by ID
const getInternById = async (req, res) => {
  try {
    const { id } = req.params;
    const internData = await Intern.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) }
      },
      {
        $lookup: {
          from: "salaries",
          localField: "_id",
          foreignField: "payeeId",
          as: "payments"
        }
      },
      {
        $addFields: {
          totalPaid: { $sum: "$payments.amount" }
        }
      },
      {
        $project: {
          password: 0,
          payments: 0
        }
      }
    ]);

    if (!internData || internData.length === 0) {
      return res.status(404).json("Intern not found!");
    }
    res.status(200).json({ intern: internData[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to get intern", error: error.message });
  }
};

// Toggle Intern Status (Active / Inactive)
const toggleInternStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const intern = await Intern.findById(id);
        if (!intern) {
            return res.status(404).json({ message: "Intern not found" });
        }

        intern.status = intern.status === 'inactive' ? 'active' : 'inactive';
        await intern.save();

        const internObj = intern.toObject();
        delete internObj.password;

        res.status(200).json({
            message: `Intern status updated to ${intern.status}`,
            intern: internObj
        });
    } catch (error) {
        console.error("Error toggling intern status:", error);
        res.status(500).json({ message: "Failed to update intern status", error: error.message });
    }
};

// List interns (Lightweight for selection - filters out inactive)
const listInterns = async (req, res) => {
    try {
        const interns = await Intern.find({ status: { $ne: 'inactive' } }, 'name role _id').lean();
        res.status(200).json({ interns });
    } catch (error) {
        res.status(500).json({ message: "Failed to list interns", error: error.message });
    }
};

export { Addintern, LoginIntern, getAllIntern, getInternById, updateIntern, deleteIntern, listInterns, toggleInternStatus };
