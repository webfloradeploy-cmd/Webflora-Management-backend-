import Handover from "../model/handoverModel.js";
import Employee from "../model/employeeModel.js";
import Intern from "../model/internModel.js";
import projectModel from "../model/projectModel.js";
import { sendHandoverEmail } from "../utils/emailService.js";

// Create Handover
export const createHandover = async (req, res) => {
    try {
        const { projectId, assigneeId, assigneeModel, handoverDate, deadline, credentials, instructions, status } = req.body;

        // Validation
        if (!projectId || !assigneeId || !assigneeModel) {
            return res.status(400).json({ message: "Project ID, Assignee ID, and Assignee Model are required" });
        }

        // Prevent assigning handover to completed project
        const project = await projectModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        if (project.status === 'Completed') {
            return res.status(400).json({ message: "Cannot assign a handover for a completed project" });
        }

        // Prevent assigning handover to inactive employee or intern
        if (assigneeModel === 'employee') {
            const emp = await Employee.findById(assigneeId);
            if (!emp) {
                return res.status(404).json({ message: "Employee not found" });
            }
            if (emp.status === 'inactive') {
                return res.status(400).json({ message: "Cannot assign handover to an inactive employee" });
            }
        } else if (assigneeModel === 'intern') {
            const intern = await Intern.findById(assigneeId);
            if (!intern) {
                return res.status(404).json({ message: "Intern not found" });
            }
            if (intern.status === 'inactive') {
                return res.status(400).json({ message: "Cannot assign handover to an inactive intern" });
            }
        }

        const newHandover = new Handover({
            projectId,
            assigneeId,
            assigneeModel,
            handoverDate: handoverDate || undefined,
            deadline: deadline || null,
            credentials: credentials || {},
            instructions: instructions || '',
            status: status || 'In Progress'
        });

        await newHandover.save();

        // Sync project status with handover status
        if (newHandover.status && newHandover.projectId) {
            await projectModel.findByIdAndUpdate(newHandover.projectId, { status: newHandover.status });
        }

        // Send Email Notification
        try {
            const populatedHandover = await Handover.findById(newHandover._id)
                .populate("projectId", "projectName")
                .populate("assigneeId", "name email");

            if (populatedHandover && populatedHandover.assigneeId && populatedHandover.assigneeId.email) {
                await sendHandoverEmail({
                    email: populatedHandover.assigneeId.email,
                    name: populatedHandover.assigneeId.name,
                    projectTitle: populatedHandover.projectId.projectName,
                    deadline: populatedHandover.deadline,
                    instructions: populatedHandover.instructions
                });
            }
        } catch (emailError) {
            console.error("Failed to send handover email:", emailError);
            // We don't want to fail the whole request if only the email fails
        }

        res.status(201).json({ message: "Handover created successfully", handover: newHandover });
    } catch (error) {
        console.error("Error creating handover:", error);
        res.status(500).json({ message: "Error creating handover", error: error.message });
    }
};

// Get All Handovers (Filtered for non-admins)
export const getAllHandovers = async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { assigneeId: req.user.id };
        const handovers = await Handover.find(query)
            .populate("projectId", "projectName status")
            .populate("assigneeId", "name email");

        res.status(200).json(handovers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching handovers", error: error.message });
    }
};

// Get Handover by ID (Restricted for non-admins)
export const getHandoverById = async (req, res) => {
    try {
        const handover = await Handover.findById(req.params.id)
            .populate("projectId", "projectName status")
            .populate("assigneeId", "name email");

        if (!handover) {
            return res.status(404).json({ message: "Handover not found" });
        }

        // Authorization check
        if (req.user.role !== 'admin' && handover.assigneeId.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to view this handover" });
        }

        res.status(200).json(handover);
    } catch (error) {
        res.status(500).json({ message: "Error fetching handover", error: error.message });
    }
};

// Update Handover
export const updateHandover = async (req, res) => {
    try {
        if (req.body.assigneeId) {
            const model = req.body.assigneeModel;
            if (model === 'employee' || !model) {
                const emp = await Employee.findById(req.body.assigneeId);
                if (emp && emp.status === 'inactive') {
                    return res.status(400).json({ message: "Cannot assign handover to an inactive employee" });
                }
            } else if (model === 'intern') {
                const intern = await Intern.findById(req.body.assigneeId);
                if (intern && intern.status === 'inactive') {
                    return res.status(400).json({ message: "Cannot assign handover to an inactive intern" });
                }
            }
        }

        const updatedHandover = await Handover.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedHandover) {
            return res.status(404).json({ message: "Handover not found" });
        }

        // Sync project status with handover status
        if (req.body.status && updatedHandover.projectId) {
            await projectModel.findByIdAndUpdate(updatedHandover.projectId, { status: req.body.status });
        }

        res.status(200).json({ message: "Handover updated successfully", handover: updatedHandover });
    } catch (error) {
        res.status(500).json({ message: "Error updating handover", error: error.message });
    }
};

// Delete Handover
export const deleteHandover = async (req, res) => {
    try {
        const deletedHandover = await Handover.findByIdAndDelete(req.params.id);
        if (!deletedHandover) {
            return res.status(404).json({ message: "Handover not found" });
        }
        res.status(200).json({ message: "Handover deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting handover", error: error.message });
    }
};
