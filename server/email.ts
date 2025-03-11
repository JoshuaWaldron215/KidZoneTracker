import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmail(to: string, subject: string, text: string) {
  try {
    console.log('Attempting to send email to:', to);
    console.log('Using sender:', process.env.SENDGRID_FROM);

    const msg = {
      to,
      from: process.env.SENDGRID_FROM || 'noreply@ymca-kidzone.com',
      subject,
      text,
      html: text.replace(/\n/g, '<br>'),
    };

    await sgMail.send(msg);
    console.log('Email sent successfully to:', to);
  } catch (error: any) {
    console.error('Failed to send email:', error.response?.body || error);
    if (error.response) {
      console.error('SendGrid error details:', {
        status: error.response.status,
        body: error.response.body,
      });
    }
    throw new Error("Email notification failed");
  }
}

export function sendRoomFullNotification(email: string, message: string) {
  console.log('Sending room full notification to:', email);
  console.log('Notification message:', message);
  return sendEmail(
    email,
    `KidZone Alert: Room Status Update`,
    message
  );
}

export function sendRoomAvailableNotification(email: string, message: string) {
  console.log('Sending room available notification to:', email);
  console.log('Notification message:', message);
  return sendEmail(
    email,
    `KidZone Alert: Space Available`,
    message
  );
}