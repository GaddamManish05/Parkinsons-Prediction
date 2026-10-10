const axios = require("axios");

/**
 * Sends a transactional email using Brevo's official REST v3 API endpoint.
 * Credentials and sender details are retrieved exclusively from process.env.
 * Dispatches asynchronously with safe exception handling so primary API requests never fail due to email errors.
 */
const sendBrevoEmail = async ({ toEmail, toName, subject, htmlContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "no-reply@parkinson-research.org";
  const fromName = process.env.EMAIL_FROM_NAME || "Parkinson's Assessment Portal";

  if (!apiKey || apiKey.trim() === "" || apiKey === "replace_with_real_brevo_api_key") {
    // Non-blocking log warning when unconfigured
    return { success: false, skipped: true, reason: "BREVO_API_KEY_NOT_CONFIGURED" };
  }

  try {
    const payload = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject: subject,
      htmlContent: htmlContent
    };

    const response = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: {
        "api-key": apiKey.trim(),
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 10000
    });

    const messageId = response.data?.messageId || "sent";
    return { success: true, messageId };
  } catch (err) {
    const statusCode = err.response?.status;
    const errorMsg = err.response?.data?.message || err.message;
    console.error(`Brevo Email Delivery Notice [Status ${statusCode || 500}]: ${errorMsg}`);
    return { success: false, error: errorMsg, statusCode };
  }
};

/**
 * Dispatches a Welcome Email upon successful user registration.
 */
const sendWelcomeEmail = async (user) => {
  if (!user || !user.email) return;

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const userName = user.name || "Participant";
  const subject = "Welcome to Parkinson's Voice Assessment Portal";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background-color: #0f4c81; color: #ffffff; padding: 24px; text-align: center; }
        .content { padding: 24px; line-height: 1.6; }
        .btn { display: inline-block; background-color: #0f4c81; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 16px; }
        .disclaimer { font-size: 12px; color: #64748b; background-color: #f1f5f9; padding: 12px; border-radius: 6px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin:0;">Parkinson's Voice Assessment Portal</h2>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Thank you for registering with the Parkinson's Disease Risk Prediction Portal. Our platform enables non-invasive speech recording and acoustic biomarker pattern analysis.</p>
          <p>You can now log in to your account and perform voice assessments or review historical screening records.</p>
          <p><a href="${baseUrl}/login" class="btn">Access Portal</a></p>
          <div class="disclaimer">
            <strong>Research Notice:</strong> This experimental platform uses machine-learning research algorithms trained on synthetic benchmark acoustic data. It is not a medical device and does not provide a clinical diagnosis.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendBrevoEmail({
    toEmail: user.email,
    toName: userName,
    subject,
    htmlContent
  });
};

/**
 * Dispatches an Assessment Completion Notification Email.
 * NOTE: Health outcome, confidence scores, and acoustic measurements are deliberately EXCLUDED from email body.
 */
const sendAssessmentCompletedEmail = async (user, predictionId) => {
  if (!user || !user.email) return;

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const userName = user.name || "Participant";
  const subject = "Voice Assessment Processing Confirmation";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background-color: #0f4c81; color: #ffffff; padding: 20px; text-align: center; }
        .content { padding: 24px; line-height: 1.6; }
        .btn { display: inline-block; background-color: #0f4c81; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 16px; }
        .footer { font-size: 12px; color: #64748b; margin-top: 24px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h3 style="margin:0;">Assessment Received</h3>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Your recent voice recording sample has been successfully processed and saved to your account history.</p>
          <p>For complete acoustic details and to view your results securely, please log in to your authenticated portal dashboard.</p>
          <p><a href="${baseUrl}/result/${predictionId}" class="btn">View Result Securely</a></p>
          <div class="footer">
            Reference ID: ${predictionId}<br>
            Parkinson's Disease Research Portal
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendBrevoEmail({
    toEmail: user.email,
    toName: userName,
    subject,
    htmlContent
  });
};

/**
 * Dispatches an Email containing a link/notification to access the PDF Report.
 */
const sendReportEmail = async (user, predictionId) => {
  if (!user || !user.email) return;

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const userName = user.name || "Participant";
  const subject = "Your Requested Voice Assessment Report Access";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background-color: #0f4c81; color: #ffffff; padding: 20px; text-align: center; }
        .content { padding: 24px; line-height: 1.6; }
        .btn { display: inline-block; background-color: #0d9488; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 16px; }
        .disclaimer { font-size: 12px; color: #64748b; background-color: #fffaf0; border: 1px solid #feebc8; padding: 12px; border-radius: 6px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h3 style="margin:0;">Voice Assessment Report Access</h3>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>You recently requested access to your Voice Assessment Report (Ref ID: <strong>${predictionId}</strong>).</p>
          <p>To protect your privacy and ensure secure delivery, you can view and download your full PDF report directly within your authenticated portal session.</p>
          <p><a href="${baseUrl}/result/${predictionId}" class="btn">Download Report PDF</a></p>
          <div class="disclaimer">
            <strong>Clinical Disclaimer:</strong> This report contains experimental acoustic pattern measurements from a voice recording. It has not been established as a clinically validated diagnostic test for Parkinson's disease. Please consult a qualified physician regarding any health concerns.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendBrevoEmail({
    toEmail: user.email,
    toName: userName,
    subject,
    htmlContent
  });
};

module.exports = {
  sendBrevoEmail,
  sendWelcomeEmail,
  sendAssessmentCompletedEmail,
  sendReportEmail
};
