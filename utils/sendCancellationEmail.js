const sendEmail = require('./sendEmail');


const sendCancellationEmail = async ({ name, email, eventTitle }) => {
  const message = `We regret to inform you that the event "${eventTitle}" has been cancelled and will no longer take place.`;

  return sendEmail({
    to: email,
    subject: 'Event Cancellation Notice',
    html: `<h4>Hello, ${name}</h4>
    <p>${message}</p>
    <p>We apologize for any inconvenience this may cause.</p>`,
  });
};

module.exports = sendCancellationEmail