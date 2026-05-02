const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ── Verification Email ────────────────────────────────────────────────────────
const sendVerificationEmail = async (email, token, firstName) => {
  console.log(`📧 Sending verification email to ${email}...`);

  try {
    const transporter    = createTransporter();
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from:    `"Citadel Art Atelier" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Verify Your Citadel Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;border:1px solid #e7e5e4;">
            
            <!-- Header -->
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">
                CITADEL
              </h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Fine Art Atelier
              </p>
            </div>

            <!-- Body -->
            <div style="padding:48px 40px;">
              <h2 style="color:#1c1917;font-size:24px;font-weight:400;margin:0 0 16px;">
                Welcome, ${firstName}
              </h2>
              <p style="color:#57534e;font-size:16px;line-height:1.6;margin:0 0 32px;">
                Thank you for joining Citadel. Please verify your email address 
                to complete your registration and access your account.
              </p>

              <!-- Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${verificationUrl}"
                   style="display:inline-block;background:#1c1917;color:#ffffff;
                          padding:16px 40px;text-decoration:none;font-size:12px;
                          letter-spacing:2px;text-transform:uppercase;">
                  Verify My Account
                </a>
              </div>

              <p style="color:#78716c;font-size:13px;line-height:1.6;margin:32px 0 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color:#d97706;font-size:13px;word-break:break-all;margin:8px 0 0;">
                ${verificationUrl}
              </p>

              <p style="color:#a8a29e;font-size:12px;margin:32px 0 0;">
                This link expires in 24 hours. If you did not create an account, 
                you can safely ignore this email.
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#f5f5f4;padding:24px 40px;border-top:1px solid #e7e5e4;
                        text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Citadel Art Atelier. All rights reserved.
              </p>
              <p style="color:#a8a29e;font-size:12px;margin:8px 0 0;">
                ${process.env.CLIENT_URL}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw error;
  }
};

// ── Commission Confirmation Email ─────────────────────────────────────────────
const sendCommissionConfirmationEmail = async (email, firstName, commissionNumber) => {
  console.log(`📧 Sending commission confirmation to ${email}...`);

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from:    `"Citadel Art Atelier" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Commission Request Received — ${commissionNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">

            <!-- Header -->
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">
                CITADEL
              </h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Fine Art Atelier
              </p>
            </div>

            <!-- Body -->
            <div style="padding:48px 40px;">
              <h2 style="color:#1c1917;font-size:24px;font-weight:400;margin:0 0 16px;">
                Thank you, ${firstName}
              </h2>
              <p style="color:#57534e;font-size:16px;line-height:1.6;margin:0 0 24px;">
                Your commission request <strong>${commissionNumber}</strong> has been 
                received. We will review your request and get back to you within 48 hours.
              </p>

              <div style="background:#f5f5f4;padding:24px;border-left:3px solid #d97706;
                          margin:24px 0;">
                <p style="color:#57534e;font-size:14px;margin:0;">
                  <strong>What happens next?</strong>
                </p>
                <ol style="color:#57534e;font-size:14px;line-height:2;
                           margin:12px 0 0;padding-left:20px;">
                  <li>We review your commission request</li>
                  <li>We contact you with a final price quote</li>
                  <li>You pay a 70% deposit to begin</li>
                  <li>We create your artwork with progress updates</li>
                  <li>You pay the remaining 30% on completion</li>
                </ol>
              </div>

              <p style="color:#78716c;font-size:14px;line-height:1.6;">
                Questions? Reply to this email or contact us at 
                <a href="mailto:${process.env.EMAIL_USER}" 
                   style="color:#d97706;">
                  ${process.env.EMAIL_USER}
                </a>
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Citadel Art Atelier. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Commission confirmation sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw error;
  }
};

// ── Order Confirmation Email ───────────────────────────────────────────────────
const sendOrderConfirmationEmail = async (email, firstName, orderNumber, total) => {
  console.log(`📧 Sending order confirmation to ${email}...`);

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from:    `"Citadel Art Atelier" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Order Confirmed — ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">

            <!-- Header -->
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">
                CITADEL
              </h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Fine Art Atelier
              </p>
            </div>

            <!-- Body -->
            <div style="padding:48px 40px;">
              <h2 style="color:#1c1917;font-size:24px;font-weight:400;margin:0 0 16px;">
                Order Confirmed, ${firstName}
              </h2>
              <p style="color:#57534e;font-size:16px;line-height:1.6;margin:0 0 24px;">
                Your order <strong>${orderNumber}</strong> has been confirmed. 
                Your artwork will be carefully packaged and shipped to you.
              </p>

              <div style="background:#f5f5f4;padding:24px;margin:24px 0;">
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:#57534e;font-size:14px;">Order Number</span>
                  <span style="color:#1c1917;font-size:14px;font-weight:bold;">
                    ${orderNumber}
                  </span>
                </div>
                <div style="border-top:1px solid #e7e5e4;margin:12px 0;
                            padding-top:12px;display:flex;justify-content:space-between;">
                  <span style="color:#57534e;font-size:14px;">Total Paid</span>
                  <span style="color:#d97706;font-size:18px;font-weight:bold;">
                    $${Number(total).toLocaleString()}
                  </span>
                </div>
              </div>

              <p style="color:#78716c;font-size:14px;line-height:1.6;">
                You will receive a shipping notification with tracking information 
                once your artwork is dispatched.
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Citadel Art Atelier. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Order confirmation sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendCommissionConfirmationEmail,
  sendOrderConfirmationEmail,
};