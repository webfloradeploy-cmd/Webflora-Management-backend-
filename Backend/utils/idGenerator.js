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
 * Generate next unique Customer / Client ID based on creation year (e.g. 2601, 2602, 2603... in 2026; 2701, 2702... in 2027)
 */
export const generateCustomerId = async (targetDate = new Date()) => {
    try {
        const year = new Date(targetDate).getFullYear();
        const yearPrefix = String(year).slice(-2); // e.g. "26" for 2026, "27" for 2027
        const clients = await Client.find({ clientId: { $exists: true, $ne: "" } }, { clientId: 1 }).lean();
        let maxNum = 0;
        const regex = new RegExp(`^(?:CUST-)?${yearPrefix}(\\d+)`, "i");
        for (const c of clients) {
            if (c.clientId) {
                const match = String(c.clientId).match(regex);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        }
        const nextNum = maxNum + 1;
        return `CUST-${yearPrefix}${String(nextNum).padStart(2, "0")}`;
    } catch (err) {
        console.error("[generateCustomerId] Error:", err);
        const yearPrefix = String(new Date().getFullYear()).slice(-2);
        return `CUST-${yearPrefix}${Date.now().toString().slice(-2)}`;
    }
};

/**
 * Generate next unique Lead ID based on creation year (e.g. LEAD-2601, LEAD-2602... in 2026; LEAD-2701... in 2027)
 */
export const generateLeadId = async (targetDate = new Date()) => {
    try {
        const year = new Date(targetDate).getFullYear();
        const yearPrefix = String(year).slice(-2); // e.g. "26" for 2026, "27" for 2027
        const leads = await Lead.find({ leadId: { $exists: true, $ne: "" } }, { leadId: 1 }).lean();
        let maxNum = 0;
        const regex = new RegExp(`^(?:LEAD-)?${yearPrefix}(\\d+)`, "i");
        for (const lead of leads) {
            if (lead.leadId) {
                const match = String(lead.leadId).match(regex);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        }
        const nextNum = maxNum + 1;
        return `LEAD-${yearPrefix}${String(nextNum).padStart(2, "0")}`;
    } catch (err) {
        console.error("[generateLeadId] Error:", err);
        const yearPrefix = String(new Date().getFullYear()).slice(-2);
        return `LEAD-${yearPrefix}${Date.now().toString().slice(-2)}`;
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

        // 3. Backfill & Standardize Customers / Clients (Year-based: e.g. 2601, 2602... for 2026; 2701, 2702... for 2027)
        const allClients = await Client.find({}).sort({ createdAt: 1, _id: 1 });
        if (allClients.length > 0) {
            const clientsByYear = {};
            for (const client of allClients) {
                const createdYear = client.createdAt ? new Date(client.createdAt).getFullYear() : new Date().getFullYear();
                if (!clientsByYear[createdYear]) {
                    clientsByYear[createdYear] = [];
                }
                clientsByYear[createdYear].push(client);
            }

            for (const [yearStr, clientsForYear] of Object.entries(clientsByYear)) {
                const yearPrefix = String(yearStr).slice(-2);
                const validYearRegex = new RegExp(`^CUST-${yearPrefix}\\d{2,}$`);

                const needsUpdate = clientsForYear.some(c => !c.clientId || !validYearRegex.test(c.clientId));

                if (needsUpdate) {
                    console.log(`[ID Generator] Migrating/Backfilling client IDs for year ${yearStr} (${clientsForYear.length} clients)...`);

                    const usedNumbers = new Set();
                    for (const c of clientsForYear) {
                        if (c.clientId && validYearRegex.test(c.clientId)) {
                            const num = parseInt(c.clientId.replace(`CUST-${yearPrefix}`, ""), 10);
                            if (!isNaN(num)) usedNumbers.add(num);
                        }
                    }

                    const allLegacyOrMissing = clientsForYear.every(c => !c.clientId || !validYearRegex.test(c.clientId));

                    if (allLegacyOrMissing) {
                        let seq = 1;
                        for (const client of clientsForYear) {
                            client.clientId = `CUST-${yearPrefix}${String(seq).padStart(2, "0")}`;
                            await client.save();
                            seq++;
                        }
                    } else {
                        let seq = 1;
                        for (const client of clientsForYear) {
                            if (!client.clientId || !validYearRegex.test(client.clientId)) {
                                while (usedNumbers.has(seq)) {
                                    seq++;
                                }
                                client.clientId = `CUST-${yearPrefix}${String(seq).padStart(2, "0")}`;
                                usedNumbers.add(seq);
                                await client.save();
                            }
                        }
                    }
                    console.log(`[ID Generator] Successfully assigned CUST-IDs to clients for year ${yearStr}.`);
                }
            }
        }

        // 4. Backfill & Standardize Leads (Year-based: e.g. LEAD-2601, LEAD-2602... for 2026; LEAD-2701... for 2027)
        const allLeads = await Lead.find({}).sort({ createdAt: 1, _id: 1 });
        if (allLeads.length > 0) {
            // Group leads by creation year
            const leadsByYear = {};
            for (const lead of allLeads) {
                const createdYear = lead.createdAt ? new Date(lead.createdAt).getFullYear() : new Date().getFullYear();
                if (!leadsByYear[createdYear]) {
                    leadsByYear[createdYear] = [];
                }
                leadsByYear[createdYear].push(lead);
            }

            for (const [yearStr, leadsForYear] of Object.entries(leadsByYear)) {
                const yearPrefix = String(yearStr).slice(-2);
                const validYearRegex = new RegExp(`^LEAD-${yearPrefix}\\d{2,}$`);

                // Check if any leads for this year need migration or assignment
                const needsUpdate = leadsForYear.some(l => !l.leadId || !validYearRegex.test(l.leadId));

                if (needsUpdate) {
                    console.log(`[ID Generator] Migrating/Backfilling lead IDs for year ${yearStr} (${leadsForYear.length} leads)...`);
                    
                    const usedNumbers = new Set();
                    for (const l of leadsForYear) {
                        if (l.leadId && validYearRegex.test(l.leadId)) {
                            const num = parseInt(l.leadId.replace(`LEAD-${yearPrefix}`, ""), 10);
                            if (!isNaN(num)) usedNumbers.add(num);
                        }
                    }

                    const allLegacyOrMissing = leadsForYear.every(l => !l.leadId || !validYearRegex.test(l.leadId));

                    if (allLegacyOrMissing) {
                        let seq = 1;
                        for (const lead of leadsForYear) {
                            lead.leadId = `LEAD-${yearPrefix}${String(seq).padStart(2, "0")}`;
                            await lead.save();
                            seq++;
                        }
                    } else {
                        let seq = 1;
                        for (const lead of leadsForYear) {
                            if (!lead.leadId || !validYearRegex.test(lead.leadId)) {
                                while (usedNumbers.has(seq)) {
                                    seq++;
                                }
                                lead.leadId = `LEAD-${yearPrefix}${String(seq).padStart(2, "0")}`;
                                usedNumbers.add(seq);
                                await lead.save();
                            }
                        }
                    }
                    console.log(`[ID Generator] Successfully assigned LEAD-IDs to leads for year ${yearStr}.`);
                }
            }
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
