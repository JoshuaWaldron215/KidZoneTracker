import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface SMSParams {
  to: string;
  message: string;
  fromNumber?: string;
}

export async function sendSMS({ to, message, fromNumber }: SMSParams): Promise<boolean> {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('Twilio credentials not configured');
      return false;
    }

    const from = fromNumber || process.env.TWILIO_PHONE_NUMBER;
    
    await client.messages.create({
      body: message,
      to,
      from
    });

    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

export async function validatePhoneNumber(phoneNumber: string): Promise<boolean> {
  try {
    const lookup = await client.lookups.v2.phoneNumbers(phoneNumber).fetch();
    return !!lookup.valid;
  } catch (error) {
    console.error('Phone number validation failed:', error);
    return false;
  }
}
