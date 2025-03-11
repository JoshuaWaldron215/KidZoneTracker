import { MailService } from '@sendgrid/mail';

// Initialize the SendGrid mail service
const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendEmail(to: string, subject: string, text: string) {
  try {
    console.log('Attempting to send email via SendGrid to:', to);

    // Validate email addresses
    if (!to || !to.includes('@')) {
      throw new Error('Invalid recipient email address');
    }

    const fromEmail = process.env.SENDGRID_FROM;
    if (!fromEmail || !fromEmail.includes('@')) {
      throw new Error('Invalid sender email configuration');
    }

    const msg = {
      to,
      from: fromEmail, // Use the email address directly without additional formatting
      subject,
      text,
      html: text.replace(/\n/g, '<br>')
    };

    console.log('Sending email with configuration:', {
      to: msg.to,
      from: msg.from,
      subject: msg.subject
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
  console.log('Sending room full notification to:', email);
  return sendEmail(
    email,
    'KidZone Alert: Room is Full',
    message
  );
}

export function sendRoomAvailableNotification(email: string, message: string) {
  console.log('Sending room available notification to:', email);
  return sendEmail(
    email,
    'KidZone Alert: Space Available',
    message
  );
}