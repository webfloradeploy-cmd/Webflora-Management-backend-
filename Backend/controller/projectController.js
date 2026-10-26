import projectModel from '../model/projectModel.js';
import invoiceModel from '../model/invoiceModel.js';
import Employee from '../model/employeeModel.js';
import Handover from '../model/handoverModel.js';

// Add Project
const Addproject = async (req, res) => {
    try {
        const { projectName, client, description, techStack, status, assignedTeam, startDate, endDate, totalAmount } = req.body;

        if (!projectName || !client) {
            return res.status(400).json({ message: "Project Name and Client are required" });
        }

        // Prevent assigning project to inactive employees
        if (assignedTeam && Array.isArray(assignedTeam) && assignedTeam.length > 0) {
            const inactive = await Employee.find({ _id: { $in: assignedTeam }, status: 'inactive' });
            if (inactive.length > 0) {
                return res.status(400).json({ 
                    message: `Cannot assign project to inactive employee(s): ${inactive.map(e => e.name).join(', ')}` 
                });
            }
        }

        const newProject = new projectModel({
            projectName,
            client,
            description,
            techStack,
            status,
            assignedTeam,
            startDate,
            endDate,
            totalAmount
        });

        await newProject.save();

        res.status(201).json({
            message: "Project created successfully",
            project: {
                ...newProject.toObject(),
                totalPaid: 0,
                dueAmount: newProject.totalAmount
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Failed to create project", error: error.message });
    }
};

// Get all projects with financial summary
const getAllProjects = async (req, res) => {
    try {
        const projects = await projectModel.find()
            .populate('client')
            .populate('assignedTeam');

        // Calculate paid and due amounts for each project
        const projectsWithFinancials = await Promise.all(projects.map(async (project) => {
            const invoices = await invoiceModel.find({ 
                $or: [
                    { projectIds: project._id },
                    { projectId: project._id }
                ] 
            });
            const totalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

            return {
                ...project.toObject(),
                totalPaid,
                dueAmount: project.totalAmount - totalPaid
            };
        }));

        res.status(200).json({ projects: projectsWithFinancials });
    } catch (error) {
        res.status(500).json({ message: "Failed to get projects", error: error.message });
    }
};

// Get project by ID with financial summary
const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await projectModel.findById(id)
            .populate('client')
            .populate('assignedTeam');

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const invoices = await invoiceModel.find({ projectId: project._id });
        const totalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

        res.status(200).json({
            project: {
                ...project.toObject(),
                totalPaid,
                dueAmount: project.totalAmount - totalPaid,
                invoices // Transaction history included here
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to get project", error: error.message });
    }
};

// Update project
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Prevent assigning project to inactive employees
        if (updateData.assignedTeam && Array.isArray(updateData.assignedTeam) && updateData.assignedTeam.length > 0) {
            const inactive = await Employee.find({ _id: { $in: updateData.assignedTeam }, status: 'inactive' });
            if (inactive.length > 0) {
                return res.status(400).json({ 
                    message: `Cannot assign project to inactive employee(s): ${inactive.map(e => e.name).join(', ')}` 
                });
            }
        }

        const project = await projectModel.findByIdAndUpdate(id, updateData, { new: true });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Sync status to all handovers of this project
        if (updateData.status) {
            await Handover.updateMany({ projectId: project._id }, { status: updateData.status });
        }

        const invoices = await invoiceModel.find({ projectId: project._id });
        const totalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

        res.status(200).json({
            message: "Project updated successfully",
            project: {
                ...project.toObject(),
                totalPaid,
                dueAmount: project.totalAmount - totalPaid
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to update project", error: error.message });
    }
};

// Delete project
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await projectModel.findByIdAndDelete(id);

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete project", error: error.message });
    }
};

export {
    Addproject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject
};