const nodemailer = require('nodemailer');
const emailConfig = require('./nodemailerConfig'); // Your updated email configuration

const transporter = nodemailer.createTransport(emailConfig);

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: '"Your App Name" <your-email@gmail.com>', // Sender address
    to, // Recipient address
    subject, // Email subject
    html, // Email body (HTML)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = sendEmail;
