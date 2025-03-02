// const nodemailer = require('nodemailer');
// const nodemailerConfig = require('./nodemailerConfig');

// const sendEmail = async ({ to, subject, html }) => {
//   let testAccount = await nodemailer.createTestAccount();

//   const transporter = nodemailer.createTransport(nodemailerConfig); //In Nodemailer, a transporter is an object that handles sending emails. It defines how emails will be delivered by specifying the email service (like Gmail, Outlook, or SMTP) and authentication details.

//   return transporter.sendMail({//Once the transporter is created, it can send emails using .sendMail().
//     from: '"Ayush Govindwar" <swayush.govindwar@gmail.com>', // sender address
//     to,
//     subject,
//     html,
//   });
// };

// module.exports = sendEmail;
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
