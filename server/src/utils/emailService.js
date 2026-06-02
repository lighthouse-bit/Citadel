// server/src/services/emailService.js
const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT == 465,
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
    const transporter     = createTransporter();
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from:    `"Highmarc" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Verify Your Highmarc Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">CITADEL</h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Highmarc
              </p>
            </div>
            <div style="padding:48px 40px;">
              <h2 style="color:#1c1917;font-size:24px;font-weight:400;margin:0 0 16px;">
                Welcome, ${firstName}
              </h2>
              <p style="color:#57534e;font-size:16px;line-height:1.6;margin:0 0 32px;">
                Thank you for joining Highmarc. Please verify your email address
                to complete your registration and access your account.
              </p>
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
            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Highmarc. All rights reserved.
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
      from:    `"Highmarc" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Commission Request Received — ${commissionNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">CITADEL</h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Highmarc
              </p>
            </div>
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
                <a href="mailto:${process.env.EMAIL_USER}" style="color:#d97706;">
                  ${process.env.EMAIL_USER}
                </a>
              </p>
            </div>
            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Highmarc. All rights reserved.
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
      from:    `"Highmarc" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Order Confirmed — ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">CITADEL</h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Highmarc
              </p>
            </div>
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
            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Highmarc. All rights reserved.
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

// ── Contact Form Email ────────────────────────────────────────────────────────
const sendContactEmail = async ({ name, email, subject, message }) => {
  console.log(`📧 Sending contact email from ${email}...`);

  try {
    const transporter = createTransporter();

    // ✅ Email to YOU (admin) — notification of new message
    const adminMailOptions = {
      from:    `"Citadel Contact Form" <${process.env.EMAIL_USER}>`,
      to:      process.env.EMAIL_USER,
      replyTo: email, // ✅ Reply goes directly to the visitor
      subject: `New Contact Message: ${subject || 'No Subject'} — from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">CITADEL</h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                New Contact Message
              </p>
            </div>
            <div style="padding:48px 40px;">
              <h2 style="color:#1c1917;font-size:20px;font-weight:400;margin:0 0 24px;">
                You have a new message from your website
              </h2>
              <div style="background:#f5f5f4;padding:24px;border-radius:8px;margin:0 0 24px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;color:#78716c;font-size:14px;width:80px;">
                      Name
                    </td>
                    <td style="padding:8px 0;color:#1c1917;font-size:14px;font-weight:bold;">
                      ${name}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#78716c;font-size:14px;">Email</td>
                    <td style="padding:8px 0;">
                      <a href="mailto:${email}" style="color:#d97706;font-size:14px;">
                        ${email}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#78716c;font-size:14px;">Subject</td>
                    <td style="padding:8px 0;color:#1c1917;font-size:14px;">
                      ${subject || 'No subject'}
                    </td>
                  </tr>
                </table>
              </div>
              <h3 style="color:#1c1917;font-size:16px;font-weight:600;margin:0 0 12px;">
                Message:
              </h3>
              <div style="background:#fffbeb;border-left:3px solid #d97706;
                          padding:20px;border-radius:0 8px 8px 0;">
                <p style="color:#57534e;font-size:15px;line-height:1.7;margin:0;
                           white-space:pre-wrap;">
                  ${message}
                </p>
              </div>
              <p style="color:#a8a29e;font-size:13px;margin:32px 0 0;">
                💡 To reply, simply reply to this email —
                it will go directly to ${name} at ${email}
              </p>
            </div>
            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Highmarc. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // ✅ Auto-reply to the visitor
    const visitorMailOptions = {
      from:    `"Highmarc" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'We received your message — Highmarc',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">CITADEL</h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Highmarc
              </p>
            </div>
            <div style="padding:48px 40px;">
              <h2 style="color:#1c1917;font-size:24px;font-weight:400;margin:0 0 16px;">
                Thank you, ${name}
              </h2>
              <p style="color:#57534e;font-size:16px;line-height:1.6;margin:0 0 24px;">
                We have received your message and will get back to you
                within 24-48 hours.
              </p>
              <div style="background:#f5f5f4;padding:24px;border-radius:8px;margin:24px 0;">
                <p style="color:#78716c;font-size:12px;text-transform:uppercase;
                           letter-spacing:1px;margin:0 0 12px;">
                  Your Message
                </p>
                <p style="color:#57534e;font-size:14px;line-height:1.6;margin:0;
                           white-space:pre-wrap;">
                  ${message}
                </p>
              </div>
              <p style="color:#78716c;font-size:14px;line-height:1.6;margin:24px 0 0;">
                In the meantime, feel free to browse our collection at
                <a href="${process.env.CLIENT_URL}" style="color:#d97706;">
                  ${process.env.CLIENT_URL}
                </a>
              </p>
            </div>
            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Highmarc. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // ✅ Send both emails simultaneously
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(visitorMailOptions),
    ]);

    console.log('✅ Contact emails sent successfully');
  } catch (error) {
    console.error('❌ Contact email error:', error.message);
    throw error;
  }
};


// ── Order Invoice Email ───────────────────────────────────────────────────────
const sendOrderInvoiceEmail = async ({
  email, firstName, orderNumber, items,
  subtotal, shipping, tax, total, createdAt,
}) => {
  console.log(`📧 Sending order invoice to ${email}...`);

  try {
    const transporter = createTransporter();

    // Build items rows
    const itemRows = items.map(item => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;
                   color:#57534e;font-size:14px;">
          ${item.title || item.artwork?.title || 'Artwork'}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;
                   color:#1c1917;font-size:14px;text-align:right;font-weight:bold;">
          $${Number(item.price).toLocaleString()}
        </td>
      </tr>
    `).join('');

    const mailOptions = {
      from:    `"Highmarc" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Invoice — Order #${orderNumber} | Highmarc`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">

            <!-- Header -->
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">CITADEL</h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Highmarc
              </p>
            </div>

            <!-- Invoice Header -->
            <div style="padding:40px 40px 0;display:flex;justify-content:space-between;
                        align-items:flex-start;">
              <div>
                <h2 style="color:#1c1917;font-size:28px;font-weight:400;margin:0 0 8px;">
                  Invoice
                </h2>
                <p style="color:#78716c;font-size:14px;margin:0;">
                  Thank you for your purchase, ${firstName}!
                </p>
              </div>
              <div style="text-align:right;">
                <p style="color:#78716c;font-size:12px;margin:0 0 4px;">Order Number</p>
                <p style="color:#1c1917;font-size:16px;font-weight:bold;margin:0;">
                  #${orderNumber}
                </p>
                <p style="color:#78716c;font-size:12px;margin:8px 0 0;">
                  ${new Date(createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <!-- Divider -->
            <div style="margin:24px 40px;border-top:2px solid #d97706;"></div>

            <!-- Items -->
            <div style="padding:0 40px;">
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:0 0 12px;color:#78716c;
                               font-size:11px;text-transform:uppercase;
                               letter-spacing:1px;font-weight:600;">
                      Artwork
                    </th>
                    <th style="text-align:right;padding:0 0 12px;color:#78716c;
                               font-size:11px;text-transform:uppercase;
                               letter-spacing:1px;font-weight:600;">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </div>

            <!-- Totals -->
            <div style="padding:24px 40px;">
              <div style="background:#f5f5f4;padding:24px;border-radius:8px;">
                <div style="display:flex;justify-content:space-between;
                            margin-bottom:8px;">
                  <span style="color:#78716c;font-size:14px;">Subtotal</span>
                  <span style="color:#1c1917;font-size:14px;">
                    $${subtotal.toLocaleString()}
                  </span>
                </div>
                ${shipping > 0 ? `
                <div style="display:flex;justify-content:space-between;
                            margin-bottom:8px;">
                  <span style="color:#78716c;font-size:14px;">Shipping</span>
                  <span style="color:#1c1917;font-size:14px;">
                    $${shipping.toLocaleString()}
                  </span>
                </div>` : `
                <div style="display:flex;justify-content:space-between;
                            margin-bottom:8px;">
                  <span style="color:#78716c;font-size:14px;">Shipping</span>
                  <span style="color:#22c55e;font-size:14px;">Free</span>
                </div>`}
                ${tax > 0 ? `
                <div style="display:flex;justify-content:space-between;
                            margin-bottom:8px;">
                  <span style="color:#78716c;font-size:14px;">Tax</span>
                  <span style="color:#1c1917;font-size:14px;">
                    $${tax.toLocaleString()}
                  </span>
                </div>` : ''}
                <div style="border-top:1px solid #e7e5e4;margin:16px 0;
                            padding-top:16px;display:flex;
                            justify-content:space-between;">
                  <span style="color:#1c1917;font-size:16px;font-weight:bold;">
                    Total Paid
                  </span>
                  <span style="color:#d97706;font-size:20px;font-weight:bold;">
                    $${total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <!-- Message -->
            <div style="padding:0 40px 40px;">
              <p style="color:#57534e;font-size:14px;line-height:1.6;">
                Your artwork will be carefully packaged and shipped to you.
                You will receive a tracking notification once dispatched.
              </p>
              <p style="color:#57534e;font-size:14px;line-height:1.6;">
                Questions? Contact us at
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
                © ${new Date().getFullYear()} Highmarc. All rights reserved.
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
    console.log('✅ Order invoice sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Order invoice email error:', error.message);
    throw error;
  }
};

// ── Commission Deposit Invoice Email ─────────────────────────────────────────
const sendCommissionDepositInvoiceEmail = async ({
  email, firstName, commissionNumber, artStyle, size,
  finalPrice, depositAmount, balanceAmount, depositPercent, paidAt,
}) => {
  console.log(`📧 Sending commission deposit invoice to ${email}...`);

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from:    `"Highmarc" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Deposit Receipt — Commission #${commissionNumber} | Highmarc`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">

            <!-- Header -->
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">CITADEL</h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Highmarc
              </p>
            </div>

            <!-- Invoice Header -->
            <div style="padding:40px 40px 0;">
              <div style="display:flex;justify-content:space-between;
                          align-items:flex-start;">
                <div>
                  <h2 style="color:#1c1917;font-size:28px;font-weight:400;margin:0 0 8px;">
                    Deposit Receipt
                  </h2>
                  <p style="color:#78716c;font-size:14px;margin:0;">
                    Thank you, ${firstName}! Your deposit has been received.
                  </p>
                </div>
                <div style="text-align:right;">
                  <p style="color:#78716c;font-size:12px;margin:0 0 4px;">
                    Commission
                  </p>
                  <p style="color:#1c1917;font-size:16px;font-weight:bold;margin:0;">
                    #${commissionNumber}
                  </p>
                  <p style="color:#78716c;font-size:12px;margin:8px 0 0;">
                    ${new Date(paidAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            <!-- Divider -->
            <div style="margin:24px 40px;border-top:2px solid #d97706;"></div>

            <!-- Commission Details -->
            <div style="padding:0 40px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;
                             color:#78716c;font-size:14px;">
                    Art Style
                  </td>
                  <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;
                             color:#1c1917;font-size:14px;text-align:right;">
                    ${artStyle}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;
                             color:#78716c;font-size:14px;">
                    Size
                  </td>
                  <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;
                             color:#1c1917;font-size:14px;text-align:right;">
                    ${size}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Payment Breakdown -->
            <div style="padding:24px 40px;">
              <div style="background:#f5f5f4;padding:24px;border-radius:8px;">
                <p style="color:#78716c;font-size:12px;text-transform:uppercase;
                           letter-spacing:1px;margin:0 0 16px;font-weight:600;">
                  Payment Breakdown
                </p>
                <div style="display:flex;justify-content:space-between;
                            margin-bottom:8px;">
                  <span style="color:#78716c;font-size:14px;">Total Commission</span>
                  <span style="color:#1c1917;font-size:14px;">
                    $${finalPrice.toLocaleString()}
                  </span>
                </div>
                <div style="display:flex;justify-content:space-between;
                            margin-bottom:8px;">
                  <span style="color:#78716c;font-size:14px;">
                    Deposit Paid (${depositPercent}%)
                  </span>
                  <span style="color:#22c55e;font-size:14px;font-weight:bold;">
                    $${depositAmount.toLocaleString()} ✓ PAID
                  </span>
                </div>
                <div style="border-top:1px solid #e7e5e4;margin:16px 0;
                            padding-top:16px;display:flex;
                            justify-content:space-between;">
                  <span style="color:#1c1917;font-size:14px;font-weight:bold;">
                    Remaining Balance
                  </span>
                  <span style="color:#d97706;font-size:16px;font-weight:bold;">
                    $${balanceAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <!-- Status Banner -->
            <div style="margin:0 40px 40px;background:#fffbeb;border:1px solid #fde68a;
                        border-radius:8px;padding:20px;">
              <p style="color:#92400e;font-size:14px;margin:0;font-weight:bold;">
                🎨 Work has begun on your commission!
              </p>
              <p style="color:#92400e;font-size:13px;margin:8px 0 0;line-height:1.5;">
                We will keep you updated with progress images. The remaining balance
                of <strong>$${balanceAmount.toLocaleString()}</strong> will be due
                upon completion.
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Highmarc. All rights reserved.
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
    console.log('✅ Deposit invoice sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Deposit invoice email error:', error.message);
    throw error;
  }
};

// ── Commission Final Invoice Email ────────────────────────────────────────────
const sendCommissionBalanceInvoiceEmail = async ({
  email, firstName, commissionNumber, artStyle, size,
  finalPrice, depositAmount, balanceAmount, paidAt,
}) => {
  console.log(`📧 Sending commission final invoice to ${email}...`);

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from:    `"Highmarc" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Final Invoice — Commission #${commissionNumber} | Highmarc`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">

            <!-- Header -->
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">CITADEL</h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Highmarc
              </p>
            </div>

            <!-- Invoice Header -->
            <div style="padding:40px 40px 0;">
              <div style="display:flex;justify-content:space-between;">
                <div>
                  <h2 style="color:#1c1917;font-size:28px;font-weight:400;margin:0 0 8px;">
                    Final Invoice
                  </h2>
                  <p style="color:#78716c;font-size:14px;margin:0;">
                    Commission complete, ${firstName}! Thank you.
                  </p>
                </div>
                <div style="text-align:right;">
                  <p style="color:#78716c;font-size:12px;margin:0 0 4px;">Commission</p>
                  <p style="color:#1c1917;font-size:16px;font-weight:bold;margin:0;">
                    #${commissionNumber}
                  </p>
                  <p style="color:#78716c;font-size:12px;margin:8px 0 0;">
                    ${new Date(paidAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            <!-- Divider -->
            <div style="margin:24px 40px;border-top:2px solid #d97706;"></div>

            <!-- Commission Details -->
            <div style="padding:0 40px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;
                             color:#78716c;font-size:14px;">Art Style</td>
                  <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;
                             color:#1c1917;font-size:14px;text-align:right;">
                    ${artStyle}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;
                             color:#78716c;font-size:14px;">Size</td>
                  <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;
                             color:#1c1917;font-size:14px;text-align:right;">
                    ${size}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Payment Summary -->
            <div style="padding:24px 40px;">
              <div style="background:#f5f5f4;padding:24px;border-radius:8px;">
                <p style="color:#78716c;font-size:12px;text-transform:uppercase;
                           letter-spacing:1px;margin:0 0 16px;font-weight:600;">
                  Full Payment Summary
                </p>
                <div style="display:flex;justify-content:space-between;
                            margin-bottom:8px;">
                  <span style="color:#78716c;font-size:14px;">Deposit Paid</span>
                  <span style="color:#57534e;font-size:14px;">
                    $${depositAmount.toLocaleString()}
                  </span>
                </div>
                <div style="display:flex;justify-content:space-between;
                            margin-bottom:8px;">
                  <span style="color:#78716c;font-size:14px;">Balance Paid</span>
                  <span style="color:#57534e;font-size:14px;">
                    $${balanceAmount.toLocaleString()}
                  </span>
                </div>
                <div style="border-top:2px solid #d97706;margin:16px 0;
                            padding-top:16px;display:flex;
                            justify-content:space-between;">
                  <span style="color:#1c1917;font-size:16px;font-weight:bold;">
                    Total Paid
                  </span>
                  <span style="color:#d97706;font-size:20px;font-weight:bold;">
                    $${finalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <!-- Completion Banner -->
            <div style="margin:0 40px 40px;background:#f0fdf4;border:1px solid #bbf7d0;
                        border-radius:8px;padding:20px;text-align:center;">
              <p style="color:#166534;font-size:18px;margin:0;font-weight:bold;">
                🎉 Your commission is complete!
              </p>
              <p style="color:#166534;font-size:14px;margin:12px 0 0;line-height:1.5;">
                Your artwork has been completed and fully paid.
                We will be in touch regarding delivery and shipping details.
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Highmarc. All rights reserved.
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
    console.log('✅ Final invoice sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Final invoice email error:', error.message);
    throw error;
  }
};


// ── Order Shipped Email ──────────────────────────────────────────────────────
const sendOrderShippedEmail = async ({
  email,
  firstName,
  orderNumber,
  trackingNumber,
  trackingUrl,
  carrier,
  estimatedDelivery,
  shippingAddress,
}) => {
  console.log(`📧 Sending shipped notification to ${email}...`);

  try {
    const transporter = createTransporter();

    const estDate = estimatedDelivery
      ? new Date(estimatedDelivery).toLocaleDateString('en-US', {
          weekday: 'long',
          year:    'numeric',
          month:   'long',
          day:     'numeric',
        })
      : null;

    const mailOptions = {
      from:    `"Highmarc Art Atelier" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Your Order is on the Way — ${orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">

            <!-- Header -->
            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">HIGHMARC</h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Fine Art Atelier
              </p>
            </div>

            <!-- Big Truck Banner -->
            <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);
                        padding:48px 40px;text-align:center;">
              <div style="font-size:64px;line-height:1;margin-bottom:16px;">🚚</div>
              <h2 style="color:#1c1917;font-size:28px;font-weight:400;margin:0 0 8px;">
                Your Artwork is on its Way!
              </h2>
              <p style="color:#78716c;font-size:16px;margin:0;">
                Hi ${firstName}, your order has shipped.
              </p>
            </div>

            <!-- Tracking Info -->
            <div style="padding:40px;">
              <div style="background:#f5f5f4;padding:24px;border-radius:12px;
                          margin-bottom:24px;">
                <p style="color:#78716c;font-size:11px;text-transform:uppercase;
                          letter-spacing:1.5px;margin:0 0 8px;font-weight:600;">
                  Order Number
                </p>
                <p style="color:#1c1917;font-size:20px;font-weight:bold;margin:0 0 20px;">
                  ${orderNumber}
                </p>

                ${carrier ? `
                <p style="color:#78716c;font-size:11px;text-transform:uppercase;
                          letter-spacing:1.5px;margin:16px 0 4px;font-weight:600;">
                  Carrier
                </p>
                <p style="color:#1c1917;font-size:16px;margin:0 0 16px;">
                  ${carrier}
                </p>
                ` : ''}

                ${trackingNumber ? `
                <p style="color:#78716c;font-size:11px;text-transform:uppercase;
                          letter-spacing:1.5px;margin:16px 0 4px;font-weight:600;">
                  Tracking Number
                </p>
                <p style="color:#1c1917;font-size:18px;font-family:monospace;
                          font-weight:bold;margin:0 0 16px;
                          background:#ffffff;padding:12px;border-radius:8px;
                          border:1px solid #e7e5e4;">
                  ${trackingNumber}
                </p>
                ` : ''}

                ${estDate ? `
                <p style="color:#78716c;font-size:11px;text-transform:uppercase;
                          letter-spacing:1.5px;margin:16px 0 4px;font-weight:600;">
                  Estimated Delivery
                </p>
                <p style="color:#d97706;font-size:16px;font-weight:bold;margin:0;">
                  ${estDate}
                </p>
                ` : ''}
              </div>

              ${trackingUrl ? `
              <div style="text-align:center;margin:32px 0;">
                <a href="${trackingUrl}"
                   style="display:inline-block;background:#1c1917;color:#ffffff;
                          padding:16px 40px;text-decoration:none;font-size:13px;
                          letter-spacing:2px;text-transform:uppercase;
                          border-radius:8px;">
                  Track Your Package
                </a>
              </div>
              ` : ''}

              ${shippingAddress ? `
              <div style="background:#fffbeb;border-left:3px solid #d97706;
                          padding:20px;border-radius:0 8px 8px 0;margin:24px 0;">
                <p style="color:#92400e;font-size:11px;text-transform:uppercase;
                          letter-spacing:1.5px;margin:0 0 8px;font-weight:600;">
                  Shipping To
                </p>
                <p style="color:#78716c;font-size:14px;line-height:1.6;margin:0;">
                  ${shippingAddress.line1 || ''}<br/>
                  ${shippingAddress.city || ''}${shippingAddress.state ? ', ' + shippingAddress.state : ''}
                  ${shippingAddress.postalCode || ''}<br/>
                  ${shippingAddress.country || ''}
                </p>
              </div>
              ` : ''}

              <p style="color:#78716c;font-size:14px;line-height:1.6;
                        margin:32px 0 0;">
                Your artwork has been carefully packaged and insured. 
                We'll send another notification once it's delivered.
              </p>

              <p style="color:#78716c;font-size:14px;line-height:1.6;">
                Questions? Reply to this email or contact us at 
                <a href="mailto:${process.env.EMAIL_USER}" style="color:#d97706;">
                  ${process.env.EMAIL_USER}
                </a>
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Highmarc Art Atelier. All rights reserved.
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
    console.log('✅ Shipped email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Shipped email error:', error.message);
    throw error;
  }
};

// ── Order Delivered Email ─────────────────────────────────────────────────────
const sendOrderDeliveredEmail = async ({
  email,
  firstName,
  orderNumber,
}) => {
  console.log(`📧 Sending delivered notification to ${email}...`);

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from:    `"Highmarc Art Atelier" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Delivered — ${orderNumber} 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f5f5f4;font-family:Georgia,serif;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;
                      border:1px solid #e7e5e4;">

            <div style="background:#1c1917;padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:4px;
                         font-weight:400;">HIGHMARC</h1>
              <p style="color:#d97706;margin:8px 0 0;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;">
                Fine Art Atelier
              </p>
            </div>

            <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);
                        padding:48px 40px;text-align:center;">
              <div style="font-size:64px;line-height:1;margin-bottom:16px;">🎨</div>
              <h2 style="color:#1c1917;font-size:28px;font-weight:400;margin:0 0 8px;">
                Your Artwork Has Arrived!
              </h2>
              <p style="color:#78716c;font-size:16px;margin:0;">
                Hi ${firstName}, we hope you love your new piece.
              </p>
            </div>

            <div style="padding:40px;text-align:center;">
              <p style="color:#57534e;font-size:16px;line-height:1.7;margin:0 0 24px;">
                Order <strong>${orderNumber}</strong> has been delivered.
              </p>

              <p style="color:#57534e;font-size:14px;line-height:1.6;margin:0 0 32px;">
                Thank you for choosing Highmarc. We'd love to hear what you 
                think — your feedback means the world to us.
              </p>

              <div style="background:#fffbeb;border:1px solid #fde68a;
                          padding:24px;border-radius:12px;margin:24px 0;">
                <p style="color:#92400e;font-size:14px;margin:0;line-height:1.6;">
                  📸 <strong>Share your artwork with us!</strong><br/>
                  Tag us on Instagram or send us a photo of your piece in 
                  its new home. We love seeing where our art ends up.
                </p>
              </div>

              <p style="color:#78716c;font-size:13px;margin:32px 0 0;">
                Interested in another piece? Browse our latest collection at 
                <a href="${process.env.CLIENT_URL}/gallery" style="color:#d97706;">
                  highmarc.com
                </a>
              </p>
            </div>

            <div style="background:#f5f5f4;padding:24px 40px;
                        border-top:1px solid #e7e5e4;text-align:center;">
              <p style="color:#a8a29e;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Highmarc Art Atelier. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Delivered email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Delivered email error:', error.message);
    throw error;
  }
};

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  sendVerificationEmail,
  sendCommissionConfirmationEmail,
  sendOrderConfirmationEmail,
  sendContactEmail,   
  sendOrderInvoiceEmail,               
  sendCommissionDepositInvoiceEmail,  
  sendCommissionBalanceInvoiceEmail,
   sendOrderShippedEmail,      
  sendOrderDeliveredEmail,          
};