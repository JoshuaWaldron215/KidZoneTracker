import { MailService } from '@sendgrid/mail';

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendEmail(to: string, subject: string, text: string) {
  try {
    // Basic validation
    if (!to || !to.includes('@')) {
      throw new Error('Invalid recipient email address');
    }

    const fromEmail = process.env.SENDGRID_FROM;
    if (!fromEmail || !fromEmail.includes('@')) {
      throw new Error('Invalid sender email configuration');
    }

    // Using SendGrid's v3 Node.js Library
    const msg = {
      to,
      from: fromEmail,  // Must be verified sender
      subject,
      text,
      html: `<div>${text}</div>`
    };

    console.log('Attempting to send email:', {
      to,
      subject,
      fromEmail,
      timestamp: new Date().toISOString()
    });

    await mailService.send(msg);
    console.log('Email sent successfully to:', to);
  } catch (error: any) {
    console.error('SendGrid Error:', {
      message: error.message,
      response: error.response?.body,
      code: error.code,
      statusCode: error.statusCode
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export function sendRoomFullNotification(email: string, message: string) {
  return sendEmail(
    email,
    'KidZone Alert: Room is Full',
    message
  );
}

export function sendRoomAvailableNotification(email: string, message: string) {
  return sendEmail(
    email,
    'KidZone Alert: Space Available',
    message
  );
}