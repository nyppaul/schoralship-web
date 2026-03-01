const nodemailer = require('nodemailer');

// Configure email transporter (using Mailtrap, Gmail, or custom SMTP)
// For development/testing, using Ethereal (temp email service)
// For production, update SMTP_* env vars with your provider

let transporter = null;

async function initializeTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST = 'smtp.mailtrap.io',
    SMTP_PORT = 2525,
    SMTP_USER = process.env.MAILTRAP_USER || 'test',
    SMTP_PASS = process.env.MAILTRAP_PASS || 'test',
    SENDER_EMAIL = 'noreply@scholarlink.com'
  } = process.env;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  // Verify connection
  try {
    await transporter.verify();
    console.log('Email transporter initialized successfully');
  } catch (err) {
    console.warn('Email transporter verification failed:', err.message);
    console.warn('Emails may not send. Configure SMTP_* env vars or MAILTRAP_USER/MAILTRAP_PASS');
  }

  return transporter;
}

async function sendScholarshipLinkEmail(email, scholarshipTitle, accessToken, accessLink) {
  try {
    const transport = await initializeTransporter();

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
        <div style="background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h1 style="color: #22c55e; margin-top: 0;">Payment Confirmed! 🎓</h1>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Thank you for your payment! Your scholarship access has been granted.
          </p>

          <div style="background: #f0f9ff; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #333;">
              <strong>Scholarship:</strong> ${scholarshipTitle}
            </p>
          </div>

          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Click the button below to access your scholarship materials and application links:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${accessLink}" style="background: #22c55e; color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Access Scholarship Link
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            Or copy this link if the button doesn't work:<br/>
            <code style="background: #f5f5f5; padding: 10px; border-radius: 4px; display: block; margin-top: 10px; word-break: break-all; color: #0066cc;">
              ${accessLink}
            </code>
          </p>

          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              This link will expire in 30 days. If you have questions, contact us at support@scholarlink.com
            </p>
            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
              © 2026 ScholarLink. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;

    const result = await transport.sendMail({
      from: process.env.SENDER_EMAIL || 'noreply@scholarlink.com',
      to: email,
      subject: `Your Scholarship Access Link - ${scholarshipTitle}`,
      html: htmlBody
    });

    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('Failed to send email:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  initializeTransporter,
  sendScholarshipLinkEmail
};
