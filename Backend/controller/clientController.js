import Client from "../model/clientModel.js";
import Counter from "../model/counterModel.js";
import { generateCustomerId } from "../utils/idGenerator.js";


// Add Client
const Addclients = async (req, res) => {
    try {
        const { clientName, contactNumber, email, address, referenceNo } = req.body;

        if (!clientName || !contactNumber || !email || !address) {
            return res.status(400).json({ message: "All fields are required" });
        }

        let refNo = referenceNo;
        if (!refNo) {
            const counter = await Counter.findOneAndUpdate(
                { id: "clientReference" },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            refNo = `WT-REF-${String(counter.seq).padStart(4, '0')}`;
        }

        const existingClient = await Client.findOne({
            $or: [{ email }, { contactNumber }],
        });

        if (existingClient) {
            return res.status(409).json({ message: "Client already exists!" });
        }

        const autoClientId = await generateCustomerId();

        const newClient = new Client({
            clientName,
            contactNumber,
            email,
            address,
            referenceNo: refNo,
            clientId: autoClientId
        });

        await newClient.save();

        // If an existing lead matches this client's contactNumber or email, automatically remove it from leads
        try {
            const Lead = (await import("../model/leadModel.js")).default;
            const Quotation = (await import("../model/quotationModel.js")).default;
            const matchingLead = await Lead.findOne({
                $or: [
                    { contactNumber },
                    ...(email ? [{ email }] : [])
                ]
            });

            if (matchingLead) {
                const quotationCount = await Quotation.countDocuments({ leadId: matchingLead._id });
                if (quotationCount === 0) {
                    await Lead.findByIdAndDelete(matchingLead._id);
                } else {
                    matchingLead.isConverted = true;
                    matchingLead.status = "Converted";
                    matchingLead.convertedToClientId = newClient._id;
                    matchingLead.convertedAt = new Date();
                    await matchingLead.save();
                }
                console.log(`[Addclients] Matching lead '${matchingLead.leadName}' automatically converted and removed from leads.`);
            }
        } catch (leadSyncErr) {
            console.error('[Addclients Lead Sync Warning]:', leadSyncErr.message);
        }

        res.status(201).json({
            message: "Client created successfully",
            client: newClient
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create client", error: error.message });
    }
};


// Get All Clients with financial summary (newest first)
const getAllClient = async (req, res) => {
    try {
        const clients = await Client.find().sort({ createdAt: -1, _id: -1 });
        const projectModel = (await import("../model/projectModel.js")).default;
        const invoiceModel = (await import("../model/invoiceModel.js")).default;

        const clientsWithFinancials = await Promise.all(clients.map(async (client) => {
            const projects = await projectModel.find({ client: client._id });
            let totalDue = 0;
            // totalDue is the sum of (Project Total - Invoiced Amount) for all client projects
            for (const p of projects) {
                const invoicesForProject = await invoiceModel.find({ 
                    $or: [
                        { projectIds: p._id },
                        { projectId: p._id }
                    ] 
                });
                const totalInvoiced = invoicesForProject.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
                totalDue += (Math.max(0, p.totalAmount - totalInvoiced));
            }

            return {
                ...client.toObject(),
                totalDue
            };
        }));

        res.status(200).json({ clients: clientsWithFinancials });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to get clients", error: error.message });
    }
};


const updatedClient = async (req, res) => {
    try {
        const { id } = req.params;
        let { clientName, contactNumber, email, address, referenceNo } = req.body;

        // Find client first
        const client = await Client.findById(id);
        if (!client) {
            return res.status(404).json({ message: "Client not found!" });
        }

        // Update only provided fields
        client.clientName = clientName || client.clientName;
        client.contactNumber = contactNumber || client.contactNumber;
        client.email = email || client.email;
        client.address = address || client.address;
        client.referenceNo = referenceNo || client.referenceNo;

        // Save updated data
        await client.save();

        res.status(200).json({
            message: "Client updated successfully",
            client: {
                _id: client._id,
                clientName: client.clientName,
                contactNumber: client.contactNumber,
                email: client.email,
                address: client.address,
                referenceNo: client.referenceNo
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to update client",
            error: error.message
        });
    }
};


// Delete Client
const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Client.findByIdAndDelete(id);

        if (!client) {
            return res.status(404).json({ message: "Client not found!" });
        }

        res.status(200).json({ message: "Client deleted successfully", client });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete client", error: error.message });
    }
};


export { Addclients, getAllClient, updatedClient, deleteClient };

