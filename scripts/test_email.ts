import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import nodemailer from 'nodemailer';

async function testEmail() {
  console.log('Testing SMTP connection...');
  const transporter = nodemailer.createTransport({
    host: '64.233.184.109',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { servername: 'smtp.gmail.com' }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // send to self
      subject: 'Test Email from ReliefAid',
      text: 'If you see this, the email system is working perfectly!'
    });
    console.log('✅ Test email sent! Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ SMTP Error:', err);
  }
}

testEmail();
