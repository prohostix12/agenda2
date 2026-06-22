import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(_req: Request, { params }: { params: Promise<{ company: string; subcompany: string }> }) {
  try {
    await params;
    const { to, subject, body, pdfBase64, filename } = await _req.json();
    if (!to) return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    let transporter;
    if (!host || !port || !user || !pass || host.includes('example.com')) {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({ host: testAccount.smtp.host, port: testAccount.smtp.port, secure: testAccount.smtp.secure, auth: { user: testAccount.user, pass: testAccount.pass } });
    } else {
      transporter = nodemailer.createTransport({ host, port: parseInt(port), secure: process.env.SMTP_SECURE === 'true' || port === '465', auth: { user, pass } });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${process.env.SMTP_FROM_NAME || 'Meeting Agenda Manager'}" <${user}>`,
      to, subject: subject || 'Minutes of Meeting',
      text: body || 'Please find the attached Minutes of Meeting PDF.',
      attachments: [{ filename: filename || 'Minutes.pdf', content: pdfBase64, encoding: 'base64', contentType: 'application/pdf' }],
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'FAILED_TO_SEND', message: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
