import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Anti-duplicate send cache (keys expire after windowSeconds)
const recentSends = new Map();

/**
 * Checks and locks a send request key to prevent accidental duplicate sends
 * @param {string} key - Unique key (e.g. `${recipient}:${docType}:${docId}`)
 * @param {number} windowSeconds - Lock duration in seconds (default: 10s)
 * @returns {boolean} True if duplicate send detected, False if allowed
 */
export const isDuplicateSend = (key, windowSeconds = 10) => {
    if (!key) return false;
    const now = Date.now();
    const expiresAt = recentSends.get(key);
    if (expiresAt && expiresAt > now) {
        return true;
    }
    recentSends.set(key, now + (windowSeconds * 1000));
    
    // Prune stale keys
    if (recentSends.size > 200) {
        for (const [k, exp] of recentSends.entries()) {
            if (exp <= now) recentSends.delete(k);
        }
    }
    return false;
};

/**
 * Validates recipient email format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

let transporterInstance = null;

/**
 * Returns a pooled, reusable Nodemailer transporter configured for Hostinger SMTP
 * @returns {import('nodemailer').Transporter}
 */
export const getTransporter = () => {
    if (transporterInstance) {
        return transporterInstance;
    }

    const host = process.env.EMAIL_HOST || 'smtp.hostinger.com';
    const port = Number(process.env.EMAIL_PORT || 465);
    const secure = process.env.EMAIL_SECURE !== 'false' && (port === 465 || process.env.EMAIL_SECURE === 'true');
    const user = process.env.EMAIL_USER || 'info@webfloratechnologies.com';
    const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '';

    if (!pass) {
        console.warn('[SMTP Config Warning] EMAIL_PASS is not set in environment variables.');
    }

    transporterInstance = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 10,
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 30000
    });

    return transporterInstance;
};

/**
 * Diagnostic verify check (does NOT send real emails)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const verifyEmailConfig = async () => {
    try {
        const user = process.env.EMAIL_USER || 'info@webfloratechnologies.com';
        const pass = process.env.EMAIL_PASS;
        if (!pass) {
            console.warn('[SMTP] EMAIL_PASS is not configured yet. Skipping SMTP verification check.');
            return { success: false, message: 'EMAIL_PASS missing' };
        }
        const transporter = getTransporter();
        await transporter.verify();
        console.log(`[SMTP] Successfully verified connection to Hostinger SMTP (${process.env.EMAIL_HOST || 'smtp.hostinger.com'}:${process.env.EMAIL_PORT || 465}) for ${user}`);
        return { success: true };
    } catch (error) {
        // Safe logging: Never log credentials or tokens
        console.error(`[SMTP Diagnostic Error] Could not connect to SMTP server: ${error.message}`);
        return { success: false, error: error.message };
    }
};

export const getSenderDetails = () => {
    const email = process.env.EMAIL_USER || 'info@webfloratechnologies.com';
    const name = 'Webflora Technologies';
    return {
        email,
        name,
        from: `"${name}" <${email}>`,
        replyTo: email
    };
};
