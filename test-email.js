import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testEmail() {
  console.log('Testing SMTP with:', process.env.SMTP_USER);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_USER, // send to self
      subject: 'ReliefAid Test Email',
      text: 'This is a test email from the ReliefAid system.'
    });
    console.log('Email sent successfully!', info.response);
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

testEmail();
