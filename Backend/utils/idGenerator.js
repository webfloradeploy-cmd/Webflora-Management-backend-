import Employee from "../model/employeeModel.js";
import Intern from "../model/internModel.js";
import Handover from "../model/handoverModel.js";
import projectModel from "../model/projectModel.js";

/**
 * Generate next unique employee ID (e.g. EMP-001, EMP-002...)
 */
export const generateEmployeeId = async () => {
    try {
        const employees = await Employee.find({}, { employeeId: 1 }).lean();
        let maxNum = 0;
        for (const emp of employees) {
            if (emp.employeeId) {
                const match = emp.employeeId.match(/^EMP-(\d+)$/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        }
        const nextNum = maxNum + 1;
        return `EMP-${String(nextNum).padStart(3, "0")}`;
    } catch (err) {
        console.error("[generateEmployeeId] Error:", err);
        return `EMP-${Date.now().toString().slice(-4)}`;
    }
};

/**
 * Generate next unique intern ID (e.g. INT-001, INT-002...)
 */
export const generateInternId = async () => {
    try {
        const interns = await Intern.find({}, { employeeId: 1 }).lean();
        let maxNum = 0;
        for (const intern of interns) {
            if (intern.employeeId) {
                const match = intern.employeeId.match(/^INT-(\d+)$/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        }
        const nextNum = maxNum + 1;
        return `INT-${String(nextNum).padStart(3, "0")}`;
    } catch (err) {
        console.error("[generateInternId] Error:", err);
        return `INT-${Date.now().toString().slice(-4)}`;
    }
};

/**
 * Auto-backfill existing employees and interns without an employeeId in MongoDB
 */
export const backfillUniqueIds = async () => {
    try {
        // Backfill employees
        const employeesToBackfill = await Employee.find({
            $or: [
                { employeeId: { $exists: false } },
                { employeeId: null },
                { employeeId: "" }
            ]
        }).sort({ createdAt: 1, _id: 1 });

        if (employeesToBackfill.length > 0) {
            console.log(`[ID Generator] Backfilling unique IDs for ${employeesToBackfill.length} employees...`);
            const existingEmps = await Employee.find({ employeeId: { $exists: true, $ne: "" } }, { employeeId: 1 }).lean();
            let maxNum = 0;
            for (const emp of existingEmps) {
                if (emp.employeeId) {
                    const match = emp.employeeId.match(/^EMP-(\d+)$/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum) maxNum = num;
                    }
                }
            }

            for (const emp of employeesToBackfill) {
                maxNum++;
                emp.employeeId = `EMP-${String(maxNum).padStart(3, "0")}`;
                await emp.save();
            }
            console.log(`[ID Generator] Successfully assigned unique IDs to all employees.`);
        }

        // Backfill interns
        const internsToBackfill = await Intern.find({
            $or: [
                { employeeId: { $exists: false } },
                { employeeId: null },
                { employeeId: "" }
            ]
        }).sort({ createdAt: 1, _id: 1 });

        if (internsToBackfill.length > 0) {
            console.log(`[ID Generator] Backfilling unique IDs for ${internsToBackfill.length} interns...`);
            const existingInterns = await Intern.find({ employeeId: { $exists: true, $ne: "" } }, { employeeId: 1 }).lean();
            let maxNumInt = 0;
            for (const int of existingInterns) {
                if (int.employeeId) {
                    const match = int.employeeId.match(/^INT-(\d+)$/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNumInt) maxNumInt = num;
                    }
                }
            }

            for (const intern of internsToBackfill) {
                maxNumInt++;
                intern.employeeId = `INT-${String(maxNumInt).padStart(3, "0")}`;
                await intern.save();
            }
            console.log(`[ID Generator] Successfully assigned unique IDs to all interns.`);
        }
    } catch (err) {
        console.error("[ID Generator] Error in backfillUniqueIds:", err);
    }
};

/**
 * Harmonize existing handover and project statuses in MongoDB
 */
export const syncProjectAndHandoverStatuses = async () => {
    try {
        const handovers = await Handover.find({ projectId: { $exists: true, $ne: null } })
            .populate("projectId", "projectName status");

        let syncedCount = 0;
        for (const h of handovers) {
            if (h.projectId && h.projectId.status && h.status !== h.projectId.status) {
                console.log(`[Status Harmonizer] Syncing project '${h.projectId.projectName}' status ('${h.projectId.status}') to handover ${h._id} (was '${h.status}')`);
                h.status = h.projectId.status;
                await h.save();
                syncedCount++;
            }
        }
        if (syncedCount > 0) {
            console.log(`[Status Harmonizer] Successfully synced ${syncedCount} handovers to their project status.`);
        }
    } catch (err) {
        console.error("[Status Harmonizer] Error harmonizing statuses:", err.message);
    }
};
