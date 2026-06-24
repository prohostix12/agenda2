import { NextResponse } from 'next/server';
import { sendWhatsAppTemplate } from '@/lib/reminders';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const tplId = process.env.GUPSHUP_TPL_REMINDER ?? 'mom_reminder';

    const result = await sendWhatsAppTemplate({
      to: phone,
      templateId: tplId,
      params: ['Test Meeting', 'Test action item', '24 Jun 2026', 'Due Today'],
    });

    return NextResponse.json({
      ok: result.ok,
      phone: phone.replace(/\D/g, ''),
      source: process.env.GUPSHUP_SOURCE_NUMBER ?? 'NOT SET',
      appName: process.env.GUPSHUP_APP_NAME ?? 'NOT SET',
      templateId: tplId,
      messageId: result.messageId,
      error: result.error,
      hint: result.ok
        ? 'Template message submitted. Check the phone for delivery within 1-2 minutes.'
        : 'Failed to send. Check your Gupshup API key and template approval status.',
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
