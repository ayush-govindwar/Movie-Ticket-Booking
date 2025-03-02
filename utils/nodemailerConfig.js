// module.exports = {
//   host: 'smtp.ethereal.email',
//   port: 587,
//   auth: {
//     user: 'tommie.schamberger92@ethereal.email',
//     pass: 'ayush123',
//   },
// };
//You create a transporter using nodemailer.createTransport(), passing in an object with SMTP settings.
//the above obj is passed in transporter nodemailer.createtransport(here)
module.exports = {
  host: 'smtp.gmail.com', // Gmail's SMTP server
  port: 465, // Use port 465 for SSL
  secure: true, // Use SSL
  auth: {
    user: 'swayush.govindwar@gmail.com', // Your Gmail address
    pass: 'ouvj syac tjxj gbxp', // Your Gmail password or app-specific password
  },
};