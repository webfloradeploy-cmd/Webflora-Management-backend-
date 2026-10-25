import { getTransporter, getSenderDetails, isDuplicateSend, isValidEmail, verifyEmailConfig } from '../config/emailConfig.js';

export { verifyEmailConfig };

/**
 * Common HTML email wrapper
 */
const buildEmailTemplate = ({ title, subtitle, contentHtml, footerText }) => {
    return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <!-- Brand Header -->
            <div style="background-color: #ffffff; padding: 28px 24px 20px 24px; text-align: center; border-bottom: 2px solid #ff4e1b;">
                <div style="font-size: 14px; font-weight: 800; color: #ff4e1b; letter-spacing: 0.1em; text-transform: uppercase;">WEBFLORA TECHNOLOGIES</div>
                <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; color: #0f172a;">${title}</h1>
                ${subtitle ? `<p style="margin: 6px 0 0 0; opacity: 0.85; font-size: 14px; color: #64748b;">${subtitle}</p>` : ''}
            </div>
            <!-- Body Content -->
            <div style="padding: 36px 32px;">
                ${contentHtml}
            </div>
            <!-- Footer -->
            <div style="background-color: #f9fafb; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #f1f5f9;">
                &copy; ${new Date().getFullYear()} Webflora Technologies &bull; ${footerText || 'Delivering Innovation'}
            </div>
        </div>
    `;
};

/**
 * Sends a welcome email to newly registered users (employees/interns)
 */
export const sendWelcomeEmail = async (email, password, name, role) => {
    try {
        if (!isValidEmail(email)) {
            return { success: false, error: 'Invalid recipient email address' };
        }

        const lockKey = `welcome:${email}`;
        if (isDuplicateSend(lockKey, 15)) {
            return { success: true, message: 'Welcome email was already sent recently.', duplicate: true };
        }

        const transporter = getTransporter();
        const sender = getSenderDetails();
        const frontendUrl = 'https://webflora-management-frontend.vercel.app';

        const contentHtml = `
            <p style="font-size: 18px; margin: 0 0 16px 0;">Hi <strong>${name}</strong>,</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">
                You have been officially onboarded as an <strong>${role}</strong> at Webflora Technologies. Welcome to our team!
            </p>
            
            <div style="background-color: #fef2f2; padding: 24px; border-radius: 14px; margin: 24px 0; border: 1px solid #fee2e2;">
                <p style="margin: 0 0 12px 0; font-weight: 800; color: #991b1b; text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em;">Your Login Credentials</p>
                <p style="margin: 6px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 6px 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: white; padding: 3px 8px; border-radius: 4px; border: 1px solid #fca5a5; font-size: 14px;">${password}</code></p>
            </div>

            <div style="background-color: #fffbeb; padding: 14px 18px; border-radius: 10px; margin-bottom: 26px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">Security Reminder: Please change your temporary password immediately upon your first login.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="${frontendUrl}/login" style="background-color: #ff4e1b; color: white; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block;">Access Dashboard</a>
            </div>

            <p style="font-size: 13px; text-align: center; color: #6b7280; margin: 20px 0 0 0;">If you experience any issues logging in, please contact the IT team at ${sender.email}.</p>
        `;

        const mailOptions = {
            from: sender.from,
            to: email,
            replyTo: sender.replyTo,
            subject: 'Welcome to Webflora Management System',
            text: `Hi ${name},\n\nYou've been onboarded as an ${role} at Webflora Technologies.\nLogin Email: ${email}\nTemporary Password: ${password}\nLogin URL: ${frontendUrl}/login\n\nPlease change your password after your first login.\n\nWebflora Technologies`,
            html: buildEmailTemplate({
                title: 'Welcome to the Team!',
                subtitle: 'Your staff account has been created.',
                contentHtml,
                footerText: 'Better Work, Better Life.'
            })
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[sendWelcomeEmail] Successfully sent to ${email} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[sendWelcomeEmail Error]:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Sends a project handover notification to a staff member
 */
export const sendHandoverEmail = async (data) => {
    try {
        const { email, name, projectTitle, deadline, instructions } = data;

        if (!isValidEmail(email)) {
            return { success: false, error: 'Invalid recipient email address' };
        }

        const lockKey = `handover:${email}:${projectTitle}`;
        if (isDuplicateSend(lockKey, 15)) {
            return { success: true, message: 'Handover notification was already sent recently.', duplicate: true };
        }

        const transporter = getTransporter();
        const sender = getSenderDetails();
        const frontendUrl = 'https://webflora-management-frontend.vercel.app';
        const formattedDeadline = deadline ? new Date(deadline).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Flexible';

        const contentHtml = `
            <p style="font-size: 18px; margin: 0 0 16px 0;">Hello <strong>${name}</strong>,</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">
                You have been assigned as the lead for the following project. Please review the details below:
            </p>
            
            <div style="background-color: #fff7ed; padding: 24px; border-radius: 14px; margin: 24px 0; border: 1px solid #ffedd5;">
                <div style="margin-bottom: 18px;">
                    <span style="display: block; text-transform: uppercase; font-size: 10px; font-weight: 800; color: #c2410c; letter-spacing: 0.1em; margin-bottom: 4px;">Project Title</span>
                    <strong style="font-size: 20px; color: #0f172a;">${projectTitle}</strong>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <span style="display: block; text-transform: uppercase; font-size: 10px; font-weight: 800; color: #c2410c; letter-spacing: 0.1em; margin-bottom: 4px;">Deadline</span>
                    <span style="font-size: 15px; color: #ea580c; font-weight: 700;">${formattedDeadline}</span>
                </div>

                ${instructions ? `
                <div>
                    <span style="display: block; text-transform: uppercase; font-size: 10px; font-weight: 800; color: #c2410c; letter-spacing: 0.1em; margin-bottom: 4px;">Instructions</span>
                    <p style="margin: 0; font-size: 14px; color: #431407; font-style: italic;">"${instructions}"</p>
                </div>
                ` : ''}
            </div>

            <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="${frontendUrl}/handovers" style="background-color: #ff4e1b; color: white; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block;">Explore Project</a>
            </div>

            <p style="color: #64748b; font-size: 13px; text-align: center; margin: 20px 0 0 0;">Please keep your daily activity logs updated for this project in the CRM dashboard.</p>
        `;

        const mailOptions = {
            from: sender.from,
            to: email,
            replyTo: sender.replyTo,
            subject: `New Project Assigned: ${projectTitle}`,
            text: `Hello ${name},\n\nYou have been assigned as lead for project "${projectTitle}".\nDeadline: ${formattedDeadline}\n${instructions ? `Instructions: ${instructions}\n` : ''}\nLogin to explore: ${frontendUrl}/handovers\n\nWebflora Technologies`,
            html: buildEmailTemplate({
                title: 'New Assignment',
                subtitle: 'A project has been assigned to you.',
                contentHtml
            })
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[sendHandoverEmail] Successfully sent to ${email} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[sendHandoverEmail Error]:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Sends an official project quotation to a client/lead
 */
export const sendQuotationEmail = async (data) => {
    try {
        const {
            email,
            clientName = "Valued Client",
            projectName = "Project Estimation",
            quotationNo = "Quotation",
            projectType = "Web Development & IT Services",
            totalAmount = "₹0",
            subject,
            message,
            pdfBase64
        } = data;

        if (!isValidEmail(email)) {
            return { success: false, error: 'Invalid recipient email address' };
        }

        const lockKey = `quotation:${email}:${quotationNo}`;
        if (isDuplicateSend(lockKey, 10)) {
            return { success: true, message: 'Quotation email was already sent recently.', duplicate: true };
        }

        const transporter = getTransporter();
        const sender = getSenderDetails();

        const cleanSubject = (subject || `Project Quotation: ${projectName} - Webflora Technologies`)
            .replace(/\[Ref:[^\]]*\]/gi, '')
            .trim();

        const customMessage = message || `We are pleased to present the official quotation for "${projectName}". Please review the project scope and pricing below along with the attached document.`;

        const cleanFilename = `Quotation_${quotationNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        const attachments = [];
        if (pdfBase64) {
            attachments.push({
                filename: cleanFilename,
                content: Buffer.from(pdfBase64, 'base64'),
                contentType: 'application/pdf'
            });
        }

        const startsWithGreeting = /^(dear|hello|hi)\s/i.test(customMessage.trim());
        const displayGreeting = startsWithGreeting ? '' : `<p style="font-size: 18px; margin: 0 0 16px 0;">Hello <strong>${clientName}</strong>,</p>`;

        const contentHtml = `
            ${displayGreeting}
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                ${customMessage.replace(/\n/g, '<br/>')}
            </p>
            
            <div style="background-color: #fff7ed; padding: 24px; border-radius: 14px; margin: 24px 0; border: 1px solid #ffedd5;">
                <div style="margin-bottom: 16px;">
                    <span style="display: block; text-transform: uppercase; font-size: 10px; font-weight: 800; color: #c2410c; letter-spacing: 0.1em; margin-bottom: 4px;">Project Title</span>
                    <strong style="font-size: 20px; color: #0f172a;">${projectName}</strong>
                </div>
                
                <div style="margin-bottom: 14px;">
                    <span style="display: block; text-transform: uppercase; font-size: 10px; font-weight: 800; color: #c2410c; letter-spacing: 0.1em; margin-bottom: 4px;">Quotation Reference</span>
                    <span style="font-size: 15px; color: #334155; font-weight: 700;">${quotationNo}</span>
                </div>

                <div style="margin-bottom: 14px;">
                    <span style="display: block; text-transform: uppercase; font-size: 10px; font-weight: 800; color: #c2410c; letter-spacing: 0.1em; margin-bottom: 4px;">Scope / Category</span>
                    <span style="font-size: 14px; color: #475569; font-weight: 600;">${projectType}</span>
                </div>

                <div>
                    <span style="display: block; text-transform: uppercase; font-size: 10px; font-weight: 800; color: #c2410c; letter-spacing: 0.1em; margin-bottom: 4px;">Estimated Total</span>
                    <span style="font-size: 22px; color: #ea580c; font-weight: 800;">${totalAmount}</span>
                </div>
            </div>

            ${pdfBase64 ? `
            <div style="background-color: #f0fdf4; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
                <p style="margin: 0; color: #166534; font-size: 13px; font-weight: 600;">
                    📎 <strong>Official Document Attached:</strong> Please review <strong>${cleanFilename}</strong> attached to this email for full itemized scope, deliverables timeline, and terms.
                </p>
            </div>
            ` : ''}

            <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px;">
                <p style="color: #64748b; font-size: 13px; font-weight: 500; margin: 0;">
                    If you have any questions or require revisions, feel free to reply directly to this email or reach us at ${sender.email}.
                </p>
            </div>
        `;

        const plainTextMessage = 
            (startsWithGreeting ? '' : `Hello ${clientName},\n\n`) +
            `${customMessage}\n\n` +
            `PROJECT DETAILS:\n` +
            `- Project Title: ${projectName}\n` +
            `- Quotation Reference: ${quotationNo}\n` +
            `- Scope: ${projectType}\n` +
            `- Estimated Total: ${totalAmount}\n\n` +
            (pdfBase64 ? `The official quotation document (${cleanFilename}) is attached with this email.\n\n` : '') +
            `Best regards,\n` +
            `Webflora Technologies\n` +
            `Email: ${sender.email}\n` +
            `https://www.webfloratechnologies.com`;

        const mailOptions = {
            from: sender.from,
            to: email,
            replyTo: sender.replyTo,
            subject: cleanSubject,
            text: plainTextMessage,
            html: buildEmailTemplate({
                title: 'Project Quotation',
                subtitle: 'Formal estimation prepared for your review.',
                contentHtml
            }),
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[sendQuotationEmail] Successfully sent quotation ${quotationNo} to ${email} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[sendQuotationEmail Error]:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Sends an IT Service Agreement email to a client for review & digital signature
 */
export const sendAgreementEmail = async (data) => {
    try {
        const {
            email,
            clientName = "Valued Client",
            clientCompanyName = "",
            projectTitle = "IT Services",
            agreementId = "WT-AGR",
            projectType = "Web Development",
            totalCost = 0
        } = data;

        if (!isValidEmail(email)) {
            return { success: false, error: 'Invalid recipient email address' };
        }

        const lockKey = `agreement:${email}:${agreementId}`;
        if (isDuplicateSend(lockKey, 10)) {
            return { success: true, message: 'Agreement email was already sent recently.', duplicate: true };
        }

        const transporter = getTransporter();
        const sender = getSenderDetails();
        const frontendUrl = 'https://webflora-management-frontend.vercel.app';
        const formattedAmount = Number(totalCost).toLocaleString("en-IN");

        const contentHtml = `
            <p style="font-size: 16px; margin: 0 0 16px 0;">Dear <strong>${clientName}</strong>,</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">
                We are excited to partner with you on <strong>"${projectTitle}"</strong>. We have generated the official IT Service Agreement for your review and digital signature.
            </p>
            
            <div style="background-color: #fff7ed; padding: 24px; border-radius: 14px; margin: 24px 0; border: 1px solid #ffedd5;">
                <p style="margin: 0 0 12px 0; font-weight: 800; color: #c2410c; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Agreement Highlights</p>
                <p style="margin: 6px 0; font-size: 14px;"><strong>Company:</strong> Webflora Technologies</p>
                <p style="margin: 6px 0; font-size: 14px;"><strong>Client:</strong> ${clientCompanyName || clientName}</p>
                <p style="margin: 6px 0; font-size: 14px;"><strong>Project Type:</strong> ${projectType}</p>
                <p style="margin: 6px 0; font-size: 14px;"><strong>Contract Value:</strong> INR ${formattedAmount}</p>
            </div>

            <p style="font-size: 14px; color: #475569; margin: 20px 0;">
                Please review the contract terms, payment schedules, and deliverables. You can review and digitally sign the agreement online below:
            </p>
            
            <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="${frontendUrl}/agreements" style="background-color: #ff4e1b; color: white; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block;">Review & E-Sign Contract</a>
            </div>

            <p style="font-size: 13px; color: #6b7280; text-align: center; margin: 18px 0 0 0;">This link directs you to the secure Webflora Client Portal for digital signing.</p>
        `;

        const plainTextMessage = 
            `Dear ${clientName},\n\n` +
            `We are excited to partner with you on "${projectTitle}".\n` +
            `Document Ref: ${agreementId}\n` +
            `Project Type: ${projectType}\n` +
            `Contract Value: INR ${formattedAmount}\n\n` +
            `Please review and sign the agreement at: ${frontendUrl}/agreements\n\n` +
            `Best regards,\nWebflora Technologies\nEmail: ${sender.email}`;

        const mailOptions = {
            from: sender.from,
            to: email,
            replyTo: sender.replyTo,
            subject: `Action Required: IT Service Agreement - ${projectTitle} (${agreementId})`,
            text: plainTextMessage,
            html: buildEmailTemplate({
                title: 'IT Service Agreement',
                subtitle: `Document Ref: ${agreementId}`,
                contentHtml
            })
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[sendAgreementEmail] Successfully sent agreement ${agreementId} to ${email} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[sendAgreementEmail Error]:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Sends a password reset OTP verification code
 */
export const sendPasswordResetOTP = async (email, otp) => {
    try {
        if (!isValidEmail(email)) {
            return { success: false, error: 'Invalid recipient email address' };
        }

        const lockKey = `otp:${email}`;
        if (isDuplicateSend(lockKey, 15)) {
            return { success: true, message: 'OTP was already sent recently.', duplicate: true };
        }

        const transporter = getTransporter();
        const sender = getSenderDetails();

        const contentHtml = `
            <div style="text-align: center;">
                <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
                    We received a request to reset your password. Use the verification code below to proceed.<br>
                    <strong>This code is valid for 10 minutes.</strong>
                </p>
                <div style="background-color: #f1f5f9; padding: 20px 32px; border-radius: 12px; display: inline-block; margin-bottom: 24px; border: 1px dashed #cbd5e1;">
                    <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #ff4e1b;">${otp}</span>
                </div>
                <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0;">
                    If you did not request a password reset, you can safely ignore this email. Your account remains secure.
                </p>
            </div>
        `;

        const mailOptions = {
            from: sender.from,
            to: email,
            replyTo: sender.replyTo,
            subject: 'Password Reset Verification Code - Webflora Technologies',
            text: `Your password reset verification code is: ${otp}\nThis code is valid for 10 minutes.\n\nWebflora Technologies`,
            html: buildEmailTemplate({
                title: 'Password Reset',
                subtitle: 'Verification code for your account.',
                contentHtml
            })
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[sendPasswordResetOTP] Successfully sent OTP to ${email} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[sendPasswordResetOTP Error]:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Generic document sender for Invoices, Purchase Orders, QC reports, and general business documents
 */
export const sendDocumentEmail = async ({
    email,
    documentType = "Document",
    documentNo = "DOC-001",
    clientName = "Valued Client",
    subject,
    message,
    amount,
    pdfBase64,
    pdfBuffer
}) => {
    try {
        if (!isValidEmail(email)) {
            return { success: false, error: 'Invalid recipient email address' };
        }

        const lockKey = `doc:${email}:${documentType}:${documentNo}`;
        if (isDuplicateSend(lockKey, 10)) {
            return { success: true, message: `${documentType} email was already dispatched recently.`, duplicate: true };
        }

        const transporter = getTransporter();
        const sender = getSenderDetails();

        const cleanSubject = subject || `${documentType}: ${documentNo} - Webflora Technologies`;
        const customMessage = message || `Please find attached the official ${documentType} (${documentNo}) from Webflora Technologies.`;

        const attachments = [];
        if (pdfBuffer) {
            attachments.push({
                filename: `${documentType}_${documentNo}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            });
        } else if (pdfBase64) {
            attachments.push({
                filename: `${documentType}_${documentNo}.pdf`,
                content: Buffer.from(pdfBase64, 'base64'),
                contentType: 'application/pdf'
            });
        }

        const contentHtml = `
            <p style="font-size: 16px; margin: 0 0 16px 0;">Hello <strong>${clientName}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                ${customMessage.replace(/\n/g, '<br/>')}
            </p>
            
            <div style="background-color: #fff7ed; padding: 22px; border-radius: 14px; margin: 20px 0; border: 1px solid #ffedd5;">
                <p style="margin: 0 0 10px 0; font-weight: 800; color: #c2410c; text-transform: uppercase; font-size: 11px;">${documentType} Details</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Reference No:</strong> ${documentNo}</p>
                ${amount ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Amount:</strong> ${amount}</p>` : ''}
            </div>

            ${attachments.length > 0 ? `
            <div style="background-color: #f0fdf4; padding: 14px 18px; border-radius: 10px; margin: 20px 0; border: 1px solid #bbf7d0;">
                <p style="margin: 0; color: #166534; font-size: 13px; font-weight: 600;">
                    📎 <strong>Attached Document:</strong> The official ${documentType} PDF is attached for your records.
                </p>
            </div>
            ` : ''}

            <p style="color: #64748b; font-size: 13px; margin: 20px 0 0 0;">
                If you have any questions, please reply directly to this email or reach us at ${sender.email}.
            </p>
        `;

        const mailOptions = {
            from: sender.from,
            to: email,
            replyTo: sender.replyTo,
            subject: cleanSubject,
            text: `Hello ${clientName},\n\n${customMessage}\n\nDocument Reference: ${documentNo}\n\nWebflora Technologies`,
            html: buildEmailTemplate({
                title: documentType,
                subtitle: `Reference: ${documentNo}`,
                contentHtml
            }),
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[sendDocumentEmail] Successfully sent ${documentType} ${documentNo} to ${email} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[sendDocumentEmail Error]:', error.message);
        return { success: false, error: error.message };
    }
};
