import { Schema, Document, Model, Connection, Types } from 'mongoose';

export interface IAttendee {
  name: string;
  designation: string;
}

export interface IDeadlineHistoryEntry {
  previousDeadline: string;
  requestedDeadline: string;
  reason: string;
  status: 'approved' | 'rejected';
  decidedAt: Date;
}

export interface IMinutesItem {
  subject: string;
  actionBy: string;
  dateOfAction: string;
  remarks: string;
  followedUp?: boolean;
  actionByPhone?: string;  // WhatsApp number with country code, e.g. +919876543210
  actionByEmail?: string;  // Email address for reminders
  deadlineHistory?: IDeadlineHistoryEntry[];  // audit trail of extension request decisions
}

export interface IMinutes extends Document {
  meetingId: Types.ObjectId;
  meetingType?: string;
  meetingReference?: string;
  purpose?: string;
  department?: string;
  departments?: string[];
  attendees: IAttendee[];
  items: IMinutesItem[];
  nextMeetingDate?: string;
  nextMeetingLocation?: string;
  pdfBase64?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendeeSchema = new Schema<IAttendee>(
  { name: { type: String, default: '' }, designation: { type: String, default: '' } },
  { _id: false }
);

const DeadlineHistoryEntrySchema = new Schema<IDeadlineHistoryEntry>(
  {
    previousDeadline:  { type: String, required: true },
    requestedDeadline: { type: String, required: true },
    reason:            { type: String, default: '' },
    status:            { type: String, enum: ['approved', 'rejected'], required: true },
    decidedAt:         { type: Date, required: true },
  },
  { _id: false }
);

const MinutesItemSchema = new Schema<IMinutesItem>(
  {
    subject:         { type: String, default: '' },
    actionBy:        { type: String, default: '' },
    dateOfAction:    { type: String, default: '' },
    remarks:         { type: String, default: '' },
    followedUp:      { type: Boolean, default: false },
    actionByPhone:   { type: String, trim: true },
    actionByEmail:   { type: String, trim: true },
    deadlineHistory: { type: [DeadlineHistoryEntrySchema], default: [] },
  },
  { _id: false }
);

const MinutesSchema = new Schema<IMinutes>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, unique: true },
    meetingType: { type: String, trim: true },
    meetingReference: { type: String, trim: true },
    purpose: { type: String, trim: true },
    department: { type: String, trim: true },
    departments: { type: [String], default: [] },
    attendees: { type: [AttendeeSchema], default: [] },
    items: { type: [MinutesItemSchema], default: [] },
    nextMeetingDate: { type: String },
    nextMeetingLocation: { type: String },
    pdfBase64: { type: String },
  },
  { timestamps: true }
);

export function getMinutesModel(conn: Connection): Model<IMinutes> {
  return conn.models.Minutes ?? conn.model<IMinutes>('Minutes', MinutesSchema);
}
