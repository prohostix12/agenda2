import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface AgendaItem {
  order: number; title: string; description: string; duration: string; presenters: string[];
}
export interface Meeting {
  _id?: string;
  name: string; date: string; location?: string; chairperson?: string; meetLink?: string;
}
export interface Attendee { name: string; designation: string; }
export interface MinutesItem { subject: string; actionBy: string; dateOfAction: string; remarks: string; }
export interface MinutesData {
  meetingType: string; meetingReference: string;
  purpose?: string; department?: string; departments?: string[];
  attendees: Attendee[]; items: MinutesItem[];
  nextMeetingDate: string; nextMeetingLocation: string;
}

const BLUE: [number, number, number] = [30, 58, 138];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK: [number, number, number] = [17, 24, 39];
const GRAY7: [number, number, number] = [55, 65, 81];
const GRAY5: [number, number, number] = [107, 114, 128];
const GRAY4: [number, number, number] = [156, 163, 175];
const GRAY2: [number, number, number] = [229, 231, 235];
const GRAY1: [number, number, number] = [243, 244, 246];

const PW = 210;
const M = 15;
const CW = PW - 2 * M;

function fmtDate(d: string): string {
  if (!d) return '';
  const s = d.substring(0, 10);
  const [y, mo, day] = s.split('-').map(Number);
  return new Date(y, mo - 1, day).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function fmtShort(d: string): string {
  if (!d) return '';
  const s = d.substring(0, 10);
  const [y, mo, day] = s.split('-').map(Number);
  return `${String(day).padStart(2, '0')}.${String(mo).padStart(2, '0')}.${y}`;
}

function check(pdf: jsPDF, y: number, need = 12): number {
  if (y + need > pdf.internal.pageSize.getHeight() - M) {
    pdf.addPage();
    return M + 5;
  }
  return y;
}

function agendaHeader(pdf: jsPDF, meeting: Meeting): number {
  let y = M;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...BLUE);
  pdf.text('OFFICIAL AGENDA', PW / 2, y, { align: 'center' });
  y += 6;

  pdf.setFontSize(20);
  pdf.setTextColor(...DARK);
  const lines = pdf.splitTextToSize(meeting?.name || 'Meeting', CW);
  pdf.text(lines, PW / 2, y, { align: 'center' });
  y += lines.length * 8 + 3;

  const metas: { label: string; value: string }[] = [
    { label: 'DATE', value: fmtDate(meeting.date) },
    ...(meeting.location ? [{ label: 'VENUE', value: meeting.location }] : []),
    ...(meeting.chairperson ? [{ label: 'CHAIRPERSON', value: meeting.chairperson }] : []),
  ];
  const mw = CW / metas.length;
  metas.forEach(({ label, value }, i) => {
    const x = M + i * mw + mw / 2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...GRAY4);
    pdf.text(label, x, y, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(...GRAY7);
    pdf.text(value, x, y + 4.5, { align: 'center' });
  });
  y += 12;

  pdf.setDrawColor(...BLUE);
  pdf.setLineWidth(0.8);
  pdf.line(M, y, PW - M, y);
  y += 8;
  return y;
}

function footer(pdf: jsPDF) {
  const ph = pdf.internal.pageSize.getHeight();
  const y = ph - 10;
  pdf.setDrawColor(...GRAY2);
  pdf.setLineWidth(0.3);
  pdf.line(M, y - 2, PW - M, y - 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...GRAY4);
  const d = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  pdf.text(`Generated: ${d}`, M, y + 2);
  pdf.text('Confidential', PW - M, y + 2, { align: 'right' });
}

export function downloadAgendaPdf(meeting: Meeting, items: AgendaItem[]) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const filtered = items.filter((i) => i.title.trim());

  const y = agendaHeader(pdf, meeting);

  autoTable(pdf, {
    startY: y,
    head: [['#', 'Agenda Item', 'Presenter(s)', 'Duration']],
    body: filtered.length
      ? filtered.map((item) => [
          String(item.order),
          item.description?.trim() ? `${item.title}\n${item.description}` : item.title,
          item.presenters?.filter((p) => p.trim()).join(', ') || '—',
          item.duration || '—',
        ])
      : [['', 'No agenda items added.', '', '']],
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 100 },
      2: { cellWidth: 45 },
      3: { cellWidth: 25 },
    },
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 10, textColor: DARK },
    alternateRowStyles: { fillColor: GRAY1 },
    margin: { left: M, right: M },
  });

  footer(pdf);
  pdf.save(`Agenda - ${meeting?.name || 'Meeting'}.pdf`);
}

function buildMinutesPdf(meeting: Meeting, data: MinutesData, agendaItems: AgendaItem[] = []): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const LM = 15;
  const LW = 210 - 2 * LM; // 180
  let y = LM;

  // --- Header Table ---
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  
  const leftW = LW * 0.55;
  const rightW = LW - leftW;
  const rowH = 7.5;
  const depts = (data.departments ?? []).filter(d => d.trim());
  const deptText = depts.length
    ? depts.map((d, i) => `${i + 1}. ${d}`).join('\n')
    : data.department || '';
  const deptLineCount = deptText ? deptText.split('\n').length : 0;
  const deptRowH = deptLineCount > 1 ? rowH + (deptLineCount - 1) * 4 : rowH;

  const metaRows: { label: string; value: string; h: number }[] = [
    { label: 'Types of Meeting', value: data.meetingType || '—', h: rowH },
    { label: 'Meeting Reference', value: data.meetingReference || '—', h: rowH },
    ...(deptText ? [{ label: 'Department', value: deptText, h: deptRowH }] : []),
    { label: 'Meeting Venue', value: meeting?.location || '—', h: rowH },
    { label: 'Date & Time', value: fmtShort(meeting?.date), h: rowH },
  ];
  const headerH = metaRows.reduce((sum, r) => sum + r.h, 0);

  pdf.rect(LM, y, leftW, headerH);
  let rowY = y;
  for (const row of metaRows) {
    pdf.rect(LM + leftW, rowY, rightW, row.h);
    rowY += row.h;
  }

  // Left Content
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text(meeting?.name?.toUpperCase() || 'MEETING', LM + leftW / 2, y + headerH / 2 - 4, { align: 'center' });
  pdf.text('MINUTES OF MEETING', LM + leftW / 2, y + headerH / 2 + 4, { align: 'center' });

  // Right Content
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  rowY = y;
  for (const row of metaRows) {
    pdf.text(row.label, LM + leftW + 2, rowY + 5.5);
    const valLines = row.value.split('\n');
    valLines.forEach((line, li) => {
      pdf.text(`: ${li === 0 ? '' : ' '}${line}`, LM + leftW + 32, rowY + 5.5 + li * 4);
    });
    rowY += row.h;
  }

  y += headerH;

  // --- Purpose of Meeting ---
  if (data.purpose) {
    y = check(pdf, y, 14);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);

    const purposeLines = pdf.splitTextToSize(data.purpose, rightW - 6);
    const purposeH = Math.max(rowH, purposeLines.length * 4.5 + 4);

    pdf.rect(LM, y, leftW, purposeH);
    pdf.rect(LM + leftW, y, rightW, purposeH);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Purpose of Meeting', LM + 2, y + 5.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(purposeLines, LM + leftW + 3, y + 5.5);
    y += purposeH;
  }

  // --- Agenda table ---
  const agenda = agendaItems.filter((a) => a.title.trim());
  if (agenda.length > 0) {
    y = check(pdf, y, 20);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(LM, y, LW, 8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Agenda', LM + 2, y + 5.5);
    y += 8;

    autoTable(pdf, {
      startY: y,
      theme: 'grid',
      head: [['SL NO', 'Agenda Item', 'Presenter(s)', 'Duration']],
      body: agenda.map((a) => [
        String(a.order),
        a.description?.trim() ? `${a.title}\n${a.description}` : a.title,
        a.presenters?.filter((p) => p.trim()).join(', ') || '—',
        a.duration || '—',
      ]),
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40 },
        3: { cellWidth: 20, halign: 'center' },
      },
      headStyles: { fillColor: [249, 250, 251], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, lineColor: [0, 0, 0], lineWidth: 0.3, halign: 'center' },
      bodyStyles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, valign: 'top' },
      margin: { left: LM, right: LM },
      tableWidth: LW,
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  // --- Attendees section ---
  pdf.rect(LM, y, LW, 8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Attendees', LM + 2, y + 5.5);
  y += 8;

  const attendees = data.attendees.filter((a) => a.name.trim());
  if (attendees.length > 0) {
    autoTable(pdf, {
      startY: y,
      theme: 'grid',
      head: [['SL NO', 'Name', 'Designation']],
      body: attendees.map((a, i) => [String(i + 1), a.name, a.designation || '']),
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 82.5 },
        2: { cellWidth: 82.5 },
      },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 10, lineColor: [0, 0, 0], lineWidth: 0.3, halign: 'center' },
      bodyStyles: { fontSize: 10, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3 },
      margin: { left: LM, right: LM },
      tableWidth: LW,
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  // --- Discussion table ---
  const items = data.items.filter((i) => i.subject.trim());
  if (items.length > 0) {
    const nextY = check(pdf, y, 25);
    if (nextY === y) {
      // Draw a spacer row to connect the tables if on the same page
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.rect(LM, y, LW, 6);
      y += 6;
    } else {
      y = nextY;
    }

    autoTable(pdf, {
      startY: y,
      theme: 'grid',
      head: [['SN', 'Subject/Discussions', 'Action\nBy', 'Date of\nAction', 'Remarks']],
      body: items.map((item, i) => [
        String(i + 1),
        item.subject,
        item.actionBy || '',
        item.dateOfAction ? fmtShort(item.dateOfAction) : '',
        item.remarks || '',
      ]),
      columnStyles: {
        0: { cellWidth: 10, halign: 'left' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 35 },
      },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, lineColor: [0, 0, 0], lineWidth: 0.3, halign: 'center' },
      bodyStyles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, valign: 'top' },
      margin: { left: LM, right: LM },
      tableWidth: LW,
    });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  // --- Next meeting ---
  if (data.nextMeetingDate || data.nextMeetingLocation) {
    y = check(pdf, y, 15);
    y += 5; // Add a small gap before the next meeting block since it's not part of the main table
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.setLineWidth(0.3);
    pdf.rect(LM, y, LW, 12, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...BLUE);
    pdf.text('NEXT MEETING', LM + 4, y + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...GRAY7);
    const parts: string[] = [];
    if (data.nextMeetingDate) parts.push(`Date: ${fmtDate(data.nextMeetingDate)}`);
    if (data.nextMeetingLocation) parts.push(`Venue: ${data.nextMeetingLocation}`);
    pdf.text(parts.join('        '), LM + 4, y + 9);
    y += 12;
  }

  // --- Signatures ---
  y = check(pdf, y, 30);
  y += 10;
  pdf.setDrawColor(...GRAY2);
  pdf.setLineWidth(0.6);
  pdf.line(LM, y, LM + LW, y);
  y += 14;

  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(LM, y, LM + 60, y);
  pdf.line(LM + 120, y, LM + 180, y);
  y += 4;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...GRAY7);
  pdf.text(`Chairperson${meeting.chairperson ? ' — ' + meeting.chairperson : ''}`, LM, y);
  pdf.text('Secretary / Recorder', LM + 120, y);
  y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...GRAY5);
  pdf.text('Date: _______________', LM, y);
  pdf.text('Date: _______________', LM + 120, y);

  // footer
  const ph = pdf.internal.pageSize.getHeight();
  const fy = ph - 10;
  pdf.setDrawColor(...GRAY2);
  pdf.setLineWidth(0.3);
  pdf.line(LM, fy - 2, 210 - LM, fy - 2);
  pdf.setFontSize(8);
  pdf.setTextColor(...GRAY4);
  const nd = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  pdf.text(`Generated: ${nd}`, LM, fy + 2);
  pdf.text('Confidential — For Internal Use Only', 210 - LM, fy + 2, { align: 'right' });

  return pdf;
}

export function downloadMinutesPdf(meeting: Meeting, data: MinutesData, agendaItems: AgendaItem[] = []) {
  buildMinutesPdf(meeting, data, agendaItems).save(`Minutes - ${meeting?.name || 'Meeting'}.pdf`);
}

export function getMinutesTextSummary(
  meeting: Meeting,
  data: MinutesData,
  isWhatsApp: boolean,
  pdfUrl?: string,
  agendaItems: AgendaItem[] = []
): string {
  const lines: string[] = [];

  if (isWhatsApp) {
    lines.push(`*MINUTES OF MEETING: ${meeting?.name?.toUpperCase() || 'MEETING'}*`);
  } else {
    lines.push(`MINUTES OF MEETING: ${meeting?.name?.toUpperCase() || 'MEETING'}`);
  }

  lines.push(`Date: ${fmtDate(meeting?.date)}`);
  if (meeting?.location) lines.push(`Venue: ${meeting.location}`);
  if (meeting?.chairperson) lines.push(`Chairperson: ${meeting.chairperson}`);
  if (data.meetingType) lines.push(`Meeting Type: ${data.meetingType}`);
  if (data.meetingReference) lines.push(`Reference No: ${data.meetingReference}`);
  const deptList = (data.departments ?? []).filter(d => d.trim());
  if (deptList.length) lines.push(`Department: ${deptList.join(', ')}`);
  else if (data.department) lines.push(`Department: ${data.department}`);
  if (data.purpose) lines.push(`Purpose: ${data.purpose}`);
  lines.push('');

  const agenda = agendaItems.filter((a) => a.title.trim());
  if (agenda.length > 0) {
    if (isWhatsApp) {
      lines.push(`*AGENDA:*`);
    } else {
      lines.push(`AGENDA:`);
    }
    agenda.forEach((a) => {
      lines.push(`${a.order}. ${a.title}${a.duration ? ` (${a.duration})` : ''}`);
      if (a.presenters?.filter(p => p.trim()).length) {
        lines.push(`   Presenter(s): ${a.presenters.filter(p => p.trim()).join(', ')}`);
      }
    });
    lines.push('');
  }

  const attendees = data.attendees.filter((a) => a.name.trim());
  if (attendees.length > 0) {
    if (isWhatsApp) {
      lines.push(`*ATTENDEES:*`);
    } else {
      lines.push(`ATTENDEES:`);
    }
    attendees.forEach((a, i) => {
      lines.push(`${i + 1}. ${a.name}${a.designation ? ` (${a.designation})` : ''}`);
    });
    lines.push('');
  }

  const items = data.items.filter((i) => i.subject.trim());
  if (items.length > 0) {
    if (isWhatsApp) {
      lines.push(`*DISCUSSIONS & ACTION ITEMS:*`);
    } else {
      lines.push(`DISCUSSIONS & ACTION ITEMS:`);
    }
    items.forEach((item, i) => {
      lines.push(`${i + 1}. Subject: ${item.subject}`);
      if (item.actionBy) lines.push(`   Action By: ${item.actionBy}`);
      if (item.dateOfAction) lines.push(`   Date of Action: ${fmtShort(item.dateOfAction)}`);
      if (item.remarks) lines.push(`   Remarks: ${item.remarks}`);
      lines.push('');
    });
  }

  if (data.nextMeetingDate || data.nextMeetingLocation) {
    if (isWhatsApp) {
      lines.push(`*NEXT MEETING:*`);
    } else {
      lines.push(`NEXT MEETING:`);
    }
    if (data.nextMeetingDate) lines.push(`Date: ${fmtDate(data.nextMeetingDate)}`);
    if (data.nextMeetingLocation) lines.push(`Venue: ${data.nextMeetingLocation}`);
    lines.push('');
  }

  if (isWhatsApp) {
    if (pdfUrl) {
      lines.push(`*View/Download PDF:* ${pdfUrl}`);
      lines.push('');
    } else {
      lines.push(`_(Note: The official PDF has been downloaded to your device.)_`);
    }
  } else {
    lines.push(`(Note: The official PDF has been downloaded to your device. You can manually attach it to this email if needed.)`);
  }

  return lines.join('\n');
}

export function getMinutesPdfBase64(meeting: Meeting, data: MinutesData, agendaItems: AgendaItem[] = []): string {
  const pdf = buildMinutesPdf(meeting, data, agendaItems);
  const dataUri = pdf.output('datauristring');
  return dataUri.split(',')[1];
}

export async function shareMinutesPdf(
  meeting: Meeting,
  data: MinutesData,
  via: 'email' | 'whatsapp',
  agendaItems: AgendaItem[] = []
) {
  const pdf = buildMinutesPdf(meeting, data, agendaItems);
  const filename = `Minutes - ${meeting?.name || 'Meeting'}.pdf`;

  // Web Share API works well on mobile, but on Windows Desktop it often creates an empty "no_name" file
  // when trying to share an in-memory File object to the native Mail app.
  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile && navigator.canShare) {
    const blob = pdf.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: filename, files: [file] });
        return;
      } catch {
        // user cancelled or not supported — fall through
      }
    }
  }

  // Fallback for Desktop: download the PDF automatically
  pdf.save(filename);

  const subject = `Minutes of Meeting — ${meeting?.name || 'Meeting'}`;
  const isWhatsApp = via === 'whatsapp';

  const pdfUrl = typeof window !== 'undefined' && meeting._id
    ? `${window.location.origin}/api/share/pdf/${meeting._id}`
    : undefined;

  const bodyText = getMinutesTextSummary(meeting, data, isWhatsApp, pdfUrl, agendaItems);

  if (via === 'email') {
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`);
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(bodyText)}`, '_blank');
  }
}

