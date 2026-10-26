import Settings from "../model/settingsModel.js";

// Ensure default settings exist in DB
const getOrCreateDefaultSettings = async () => {
    let settings = await Settings.findOne({ key: "global_settings" }).populate("employeeOverrides.employeeId", "name email employeeId jobRole department");
    if (!settings) {
        settings = new Settings({ key: "global_settings" });
        await settings.save();
    }
    return settings;
};

// GET /api/settings - Fetch system settings (Admin & Employees)
export const getSettings = async (req, res) => {
    try {
        const settings = await getOrCreateDefaultSettings();
        res.status(200).json(settings);
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ message: "Failed to fetch settings", error: error.message });
    }
};

// PUT /api/settings - Update settings (Admin only)
export const updateSettings = async (req, res) => {
    try {
        const { companyInfo, employeePermissions, employeeOverrides } = req.body;
        
        let settings = await Settings.findOne({ key: "global_settings" });
        if (!settings) {
            settings = new Settings({ key: "global_settings" });
        }

        if (companyInfo) {
            settings.companyInfo = { ...settings.companyInfo.toObject(), ...companyInfo };
        }

        if (employeePermissions) {
            settings.employeePermissions = { ...settings.employeePermissions.toObject(), ...employeePermissions };
        }

        if (Array.isArray(employeeOverrides)) {
            settings.employeeOverrides = employeeOverrides;
        }

        await settings.save();

        const populatedSettings = await Settings.findById(settings._id)
            .populate("employeeOverrides.employeeId", "name email employeeId jobRole department");

        res.status(200).json({
            message: "Settings updated successfully",
            settings: populatedSettings
        });
    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ message: "Failed to update settings", error: error.message });
    }
};

// GET /api/settings/my-permissions - Get effective permissions for current user
export const getMyPermissions = async (req, res) => {
    try {
        const user = req.user;
        const allTrue = {
            projects: true,
            invoices: true,
            clients: true,
            leads: true,
            quotations: true,
            agreements: true,
            expenses: true,
            salaries: true,
            handovers: true,
            notices: true,
            communications: true,
            activity: true,
            reports: true
        };

        if (user.role?.toLowerCase() === 'admin') {
            return res.status(200).json({ role: 'admin', permissions: allTrue });
        }

        const settings = await getOrCreateDefaultSettings();
        const basePermissions = settings.employeePermissions ? settings.employeePermissions.toObject() : {};

        // Check if user has specific override
        const override = settings.employeeOverrides.find(
            (o) => o.employeeId && (o.employeeId._id?.toString() === user.id || o.employeeId.toString() === user.id)
        );

        let finalPermissions = { ...basePermissions };

        if (override && override.permissions) {
            const overrideObj = override.permissions.toObject ? override.permissions.toObject() : override.permissions;
            Object.keys(overrideObj).forEach((k) => {
                if (typeof overrideObj[k] === 'boolean') {
                    finalPermissions[k] = overrideObj[k];
                }
            });
        }

        res.status(200).json({
            role: user.role,
            permissions: finalPermissions
        });
    } catch (error) {
        console.error("Error fetching permissions:", error);
        res.status(500).json({ message: "Failed to fetch user permissions", error: error.message });
    }
};
