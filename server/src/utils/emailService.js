const nodemailer = require('nodemailer');

const sendVerificationEmail = async (email, token, firstName) => {
  // ADD THIS LOG HERE:
  console.log(`DEBUG: Attempting to send email to ${email} for user ${firstName}...`);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"Citadel Art Atelier" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Citadel Account',
      html: `<h1>Welcome ${firstName}</h1><p>Link: ${verificationUrl}</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Success! Email accepted by provider:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ SMTP ERROR:', error.message); // Log the specific error message
    throw error;
  }
};

module.exports = { sendVerificationEmail };