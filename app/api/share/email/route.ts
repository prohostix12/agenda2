import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { to, subject, body, pdfBase64, filename } = await req.json();

    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // If SMTP vars are missing or still point to the placeholder example.com,
    // fall back to a free Ethereal test account (good for development only).
    let transporter;
    if (!host || !port || !user || !pass || host.includes('example.com')) {
      // Create a temporary Ethereal account
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.info('Using Ethereal test SMTP account for email sending (dev mode)');
    } else {
      transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: process.env.SMTP_SECURE === 'true' || port === '465',
        auth: { user, pass },
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || `"${process.env.SMTP_FROM_NAME || 'Meeting Agenda Manager'}" <${user}>`,
      to,
      subject: subject || 'Minutes of Meeting',
      text: body || 'Please find the attached Minutes of Meeting PDF.',
      attachments: [
        {
          filename: filename || 'Minutes.pdf',
          content: pdfBase64,
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error sending email:', e);
    return NextResponse.json(
      { error: 'FAILED_TO_SEND', message: e instanceof Error ? e.message : 'Unknown error occurred while sending email.' },
      { status: 500 }
    );
  }
}
