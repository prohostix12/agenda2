import { NextResponse } from 'next/server';
import { sendWhatsAppText, sendWhatsAppTemplate } from '@/lib/reminders';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const results: Record<string, unknown>[] = [];

    // Test 1: Session (plain text) message
    const sessionResult = await sendWhatsAppText(
      phone,
      `✅ *MOM — WhatsApp Test*\n\nThis is a test message from your MOM (Minutes of Meeting) system.\n\nIf you received this, your WhatsApp notifications are working!\n\n— _MOM System_`,
    );
    results.push({ type: 'session', ...sessionResult });

    // Test 2: Template message (if configured)
    const tplId = process.env.GUPSHUP_TPL_REMINDER;
    if (tplId) {
      const tplResult = await sendWhatsAppTemplate({
        to: phone,
        templateId: tplId,
        params: ['Test Meeting', 'Test action item', '22 Jun 2026', 'Due Today'],
      });
      results.push({ type: 'template', templateId: tplId, ...tplResult });
    }

    const anyOk = results.some(r => r.ok);

    return NextResponse.json({
      ok: anyOk,
      phone: phone.replace(/\D/g, ''),
      source: process.env.GUPSHUP_SOURCE_NUMBER ?? 'NOT SET',
      appName: process.env.GUPSHUP_APP_NAME ?? 'NOT SET',
      results,
      hint: anyOk
        ? 'API accepted the message. Check the phone for delivery within 1-2 minutes.'
        : 'Both methods failed. Check your Gupshup API key and app name in .env.local.',
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
