const sendEmail = require('./sendEmail');

const sendUpdatesEmail = async ({
  name,
  email,
  eventTitle,
  showTime,
  theater
}) => {
  const formattedDate = new Date(showTime).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return sendEmail({
    to: email,
    subject: 'Show Update Notification',
    html: `
      <h3 style="color: #2b2b2b;">Hi ${name},</h3>
      <p>There's been an update to the <strong>${eventTitle}</strong> show you've booked:</p>
      
      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <p> <strong>New Show Time:</strong> ${formattedDate}</p>
        <p> <strong>Theater:</strong> ${theater}</p>
      </div>

      <p>Please review your booking details or contact support if you have any questions.</p>
      <p style="color: #666; margin-top: 20px;">Best regards,<br/>The Movie Team</p>
    `
  });
};

module.exports = sendUpdatesEmail;