const { Resend } = require('resend');
const { RESEND_API_KEY, FROM_EMAIL } = process.env;

const resend = new Resend(RESEND_API_KEY);

/**
 * ✅ Send email using Resend API (works on Render)
 */
async function sendMail({ to, subject, html, text }) {
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    console.log('✅ Email sent successfully:', data.id || data);
    return data;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
}


function otpEmailTemplate({ code }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Email Verification</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Verify Your Email</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for registering with Gnet E-commerce. Use the following OTP code to complete your verification:
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <div style="display: inline-block; background-color: #f8f9fa; padding: 15px 30px; border: 2px dashed #4facfe; border-radius: 8px;">
                      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333333;">${code}</div>
                    </div>
                  </div>
                  <p style="color: #ff6b6b; text-align: center; font-size: 14px;">
                    This code will expire in ${process.env.OTP_EXPIRES_MIN || 10} minutes.
                  </p>
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    If you didn't request this code, please ignore this email or contact support if you have concerns.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function welcomeForUserTemplate({ name, email, phone, password, customId }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Gnet E-commerce</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #5ee7df 0%, #b490ca 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Gnet E-commerce</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for joining Gnet E-commerce! Your account has been successfully verified and is now active.
                  </p>
                  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0;">
                    <h3 style="color: #333333; margin-top: 0;">Your Account Details:</h3>
                    <table cellpadding="8" cellspacing="0" width="100%">
                      <tr style="background-color: #f1f1f1;">
                        <td width="30%" style="font-weight: bold; color: #555;">ID:</td>
                        <td style="color: #333;">${customId}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold; color: #555;">Email:</td>
                        <td style="color: #333;">${email}</td>
                      </tr>
                      <tr style="background-color: #f1f1f1;">
                        <td style="font-weight: bold; color: #555;">Phone:</td>
                        <td style="color: #333;">${phone}</td>
                      </tr>
                    </table>
                  </div>
                  <p style="color: #666666; line-height: 1.6;">
                    For your security, we recommend changing your password after your first login.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #5ee7df 0%, #b490ca 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Start Shopping</a>
                  </div>
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    Happy shopping! If you need any assistance, our support team is here to help.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function welcomeForAdminTemplate({ name, email, phone, password, customId }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Gnet E-commerce</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Gnet E-commerce</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    You have been added as an administrative staff to Gnet E-commerce. We're excited to have you on board!
                  </p>
                  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 25px 0;">
                    <h3 style="color: #333333; margin-top: 0;">Your Login Credentials:</h3>
                    <table cellpadding="8" cellspacing="0" width="100%">
                      <tr style="background-color: #f1f1f1;">
                        <td width="30%" style="font-weight: bold; color: #555;">ID:</td>
                        <td style="color: #333;">${customId}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold; color: #555;">Email:</td>
                        <td style="color: #333;">${email}</td>
                      </tr>
                      <tr style="background-color: #f1f1f1;">
                        <td style="font-weight: bold; color: #555;">Phone:</td>
                        <td style="color: #333;">${phone}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold; color: #555;">Password:</td>
                        <td style="color: #333;">${password}</td>
                      </tr>
                    </table>
                  </div>
                  <p style="color: #666666; line-height: 1.6;">
                    For security reasons, please login and change your password immediately.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to Dashboard</a>
                  </div>
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    If you have any questions, please contact our support team.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function kycSubmissionTemplate({ name, email, phone, businessName }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KYC Submission Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">KYC Submission Received</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for submitting your KYC documents for your business <strong>${businessName}</strong>! We have received your application and our team will review it shortly.
                  </p>
                  <div style="background-color: #e8f4fd; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #2196F3;">
                    <h3 style="color: #1976D2; margin-top: 0;">What's Next?</h3>
                    <p style="color: #666666; line-height: 1.6; margin-bottom: 10px;">
                      Our admin team will carefully review your submitted documents and verify all the information. 
                      This process typically takes 24-48 business hours.
                    </p>
                    <p style="color: #666666; line-height: 1.6;">
                      You will receive an email notification once your KYC is approved or if any additional information is required.
                    </p>
                  </div>
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    If you have any questions or need to update any information, please contact our support team.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function kycApprovalTemplate({ name, email, businessName, customId }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KYC Approved - Welcome Vendor</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🎉 KYC Approved!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Congratulations ${name}!</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Great news! Your KYC verification has been successfully completed and approved. 
                    You are now officially a verified vendor on Gnet E-commerce platform.
                  </p>
                  <div style="background-color: #e8f5e8; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #4CAF50;">
                    <h3 style="color: #2E7D32; margin-top: 0;">Your Business Details:</h3>
                    <p style="color: #666666; line-height: 1.6; margin: 5px 0;"><strong>Business Name:</strong> ${businessName}</p>
                    <p style="color: #666666; line-height: 1.6; margin: 5px 0;"><strong>Vendor ID:</strong> ${customId}</p>
                    <p style="color: #666666; line-height: 1.6; margin: 5px 0;"><strong>Status:</strong> <span style="color: #4CAF50; font-weight: bold;">Verified ✅</span></p>
                  </div>
                  <div style="background-color: #e8f4fd; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #2196F3;">
                    <h3 style="color: #1976D2; margin-top: 0;">🚀 What You Can Do Now:</h3>
                    <ul style="color: #666666; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Access your vendor dashboard</li>
                      <li>List your products and services</li>
                      <li>Manage orders and inventory</li>
                      <li>Track sales and analytics</li>
                      <li>Communicate with customers</li>
                    </ul>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Access Your Dashboard</a>
                  </div>
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    If you have any questions or need assistance, our support team is here to help.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function kycRejectionTemplate({ name, email, businessName, rejectionReason }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KYC Review Required</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="margin: 40px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">KYC Review Required</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333333; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for submitting your KYC documents for <strong>${businessName}</strong>. After careful review, we need some additional information 
                    or clarification before we can approve your vendor account.
                  </p>
                  <div style="background-color: #ffeaea; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #ff6b6b;">
                    <h3 style="color: #d32f2f; margin-top: 0;">Review Notes:</h3>
                    <p style="color: #666666; line-height: 1.6; margin-bottom: 0; white-space: pre-wrap;">
                      ${rejectionReason || 'Please review your submitted documents and ensure all information is accurate and complete.'}
                    </p>
                  </div>
                  <div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #2196F3;">
                    <h3 style="color: #1976D2; margin-top: 0;">Next Steps:</h3>
                    <ol style="color: #666666; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>Review the feedback provided above</li>
                      <li>Update your KYC information as needed</li>
                      <li>Resubmit your application</li>
                      <li>Our team will review it again within 24-48 business hours</li>
                    </ol>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">Update KYC Information</a>
                  </div>
                  <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                    If you have any questions about the review process or need assistance, please contact our support team.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; margin: 0; font-size: 14px;">
                    &copy; ${new Date().getFullYear()} Gnet E-commerce. All rights reserved.
                  </p>
                  <p style="color: #bbbbbb; margin: 10px 0 0 0; font-size: 12px;">
                    This is an automated message, please do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

module.exports = {
  sendMail,
  otpEmailTemplate,
  welcomeForUserTemplate,
  welcomeForAdminTemplate,
  kycSubmissionTemplate,
  kycApprovalTemplate,
  kycRejectionTemplate,
};

