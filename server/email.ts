import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmail(to: string, subject: string, text: string) {
  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM || 'noreply@ymca-kidzone.com',
      subject,
      text,
      html: text.replace(/\n/g, '<br>'),
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error("Email notification failed");
  }
}

export function sendRoomFullNotification(email: string, message: string) {
  return sendEmail(
    email,
    `KidZone Alert: Room Status Update`,
    message
  );
}

export function sendRoomAvailableNotification(email: string, message: string) {
  return sendEmail(
    email,
    `KidZone Alert: Space Available`,
    message
  );
}