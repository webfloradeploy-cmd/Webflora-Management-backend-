import Employee from "../model/employeeModel.js";
import Intern from "../model/internModel.js";
import Client from "../model/clientModel.js";
import Lead from "../model/leadModel.js";
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
 * Generate next unique Customer / Client ID (e.g. CUST-001, CUST-002...)
 */
export const generateCustomerId = async () => {
    try {
        const clients = await Client.find({}, { clientId: 1, referenceNo: 1 }).lean();
        let maxNum = 0;
        for (const c of clients) {
            const idToTest = c.clientId || c.referenceNo;
            if (idToTest) {
                const match = idToTest.match(/(?:CUST|CLI|REF)-?(\d+)/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        }
        const nextNum = maxNum + 1;
        return `CUST-${String(nextNum).padStart(3, "0")}`;
    } catch (err) {
        console.error("[generateCustomerId] Error:", err);
        return `CUST-${Date.now().toString().slice(-4)}`;
    }
};

/**
 * Generate next unique Lead ID (e.g. LEAD-001, LEAD-002...)
 */
export const generateLeadId = async () => {
    try {
        const leads = await Lead.find({}, { leadId: 1 }).lean();
        let maxNum = 0;
        for (const lead of leads) {
            if (lead.leadId) {
                const match = lead.leadId.match(/LEAD-(\d+)/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        }
        const nextNum = maxNum + 1;
        return `LEAD-${String(nextNum).padStart(3, "0")}`;
    } catch (err) {
        console.error("[generateLeadId] Error:", err);
        return `LEAD-${Date.now().toString().slice(-4)}`;
    }
};

/**
 * Auto-backfill existing employees, interns, customers/clients, and leads without a unique ID in MongoDB
 */
export const backfillUniqueIds = async () => {
    try {
        // 1. Backfill employees
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

        // 2. Backfill interns
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

        // 3. Backfill Customers / Clients
        const clientsToBackfill = await Client.find({
            $or: [
                { clientId: { $exists: false } },
                { clientId: null },
                { clientId: "" }
            ]
        }).sort({ createdAt: 1, _id: 1 });

        if (clientsToBackfill.length > 0) {
            console.log(`[ID Generator] Backfilling unique Customer IDs for ${clientsToBackfill.length} customers/clients...`);
            const existingClients = await Client.find({ clientId: { $exists: true, $ne: "" } }, { clientId: 1 }).lean();
            let maxNumCust = 0;
            for (const c of existingClients) {
                if (c.clientId) {
                    const match = c.clientId.match(/^CUST-(\d+)$/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNumCust) maxNumCust = num;
                    }
                }
            }

            for (const client of clientsToBackfill) {
                maxNumCust++;
                client.clientId = `CUST-${String(maxNumCust).padStart(3, "0")}`;
                await client.save();
            }
            console.log(`[ID Generator] Successfully assigned unique Customer IDs (CUST-XXX) to all clients.`);
        }

        // 4. Backfill Leads
        const leadsToBackfill = await Lead.find({
            $or: [
                { leadId: { $exists: false } },
                { leadId: null },
                { leadId: "" }
            ]
        }).sort({ createdAt: 1, _id: 1 });

        if (leadsToBackfill.length > 0) {
            console.log(`[ID Generator] Backfilling unique IDs for ${leadsToBackfill.length} leads...`);
            const existingLeads = await Lead.find({ leadId: { $exists: true, $ne: "" } }, { leadId: 1 }).lean();
            let maxNumLead = 0;
            for (const l of existingLeads) {
                if (l.leadId) {
                    const match = l.leadId.match(/^LEAD-(\d+)$/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNumLead) maxNumLead = num;
                    }
                }
            }

            for (const lead of leadsToBackfill) {
                maxNumLead++;
                lead.leadId = `LEAD-${String(maxNumLead).padStart(3, "0")}`;
                await lead.save();
            }
            console.log(`[ID Generator] Successfully assigned unique IDs (LEAD-XXX) to all leads.`);
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
