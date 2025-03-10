import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, text: string) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@ymca-kidzone.com",
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Email notification failed");
  }
}

export function sendRoomFullNotification(email: string, roomName: string) {
  return sendEmail(
    email,
    `KidZone Alert: ${roomName} is now full`,
    `The ${roomName} has reached maximum capacity. We'll notify you when space becomes available.`
  );
}

export function sendRoomAvailableNotification(email: string, roomName: string) {
  return sendEmail(
    email,
    `KidZone Alert: Space available in ${roomName}`,
    `Space is now available in the ${roomName}. You can now drop off your child.`
  );
}
