import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
const fromEmail = process.env.FROM_EMAIL;

if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !fromEmail) {
  console.warn(
    'SMTP environment variables not fully configured. Email sending will be disabled.'
  );
  // Optionally throw an error if email is critical:
  // throw new Error('Missing SMTP configuration in .env.local');
}

// Create a transporter object using the default SMTP transport
// Ensure your email provider (e.g., Gmail) allows this connection.
// For Gmail, you might need an "App Password".
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: parseInt(smtpPort, 10), // Ensure port is an integer
  secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports like 587
  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },
  // Optional: Add TLS options if needed, e.g., for self-signed certs
  // tls: {
  //   rejectUnauthorized: false // Use only for testing, not production
  // }
});

// Function to send an email
export const sendMail = async ({ to, subject, text, html }) => {
  if (!transporter.options.host) {
    console.error('Email configuration missing, cannot send email.');
    // Simulate success in dev if needed, or throw error
    // return { success: false, message: 'SMTP not configured.' };
    // For now, let's simulate success locally if not configured
    if (process.env.NODE_ENV === 'development') {
        console.log(`Simulated email send to ${to} with subject "${subject}"`);
        console.log(`Text: ${text}`);
        return { success: true, message: 'Email simulated.' };
    } else {
        throw new Error('SMTP not configured.');
    }
  }

  const mailOptions = {
    from: `"Bookkeeper App" <${fromEmail}>`, // sender address
    to: to, // list of receivers (string or array)
    subject: subject, // Subject line
    text: text, // plain text body
    html: html, // html body
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    // Preview URL: %s', nodemailer.getTestMessageUrl(info)); // Only for Ethereal
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Specific function for sending verification code
export const sendVerificationEmail = async (toEmail, code) => {
    const subject = 'Verify Your Email Address for Bookkeeper App';
    const text = `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`;
    const html = `
        <p>Welcome to Bookkeeper App!</p>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
    `;

    return sendMail({ to: toEmail, subject, text, html });
};
