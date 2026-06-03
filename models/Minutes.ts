import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendee {
  name: string;
  designation: string;
}

export interface IMinutesItem {
  subject: string;
  actionBy: string;
  dateOfAction: string;
  remarks: string;
  followedUp?: boolean;
}

export interface IMinutes extends Document {
  meetingId: mongoose.Types.ObjectId;
  meetingType?: string;
  meetingReference?: string;
  purpose?: string;
  department?: string;       // legacy single-value field (kept for backward compat)
  departments?: string[];    // new multi-value field
  attendees: IAttendee[];
  items: IMinutesItem[];
  nextMeetingDate?: string;
  nextMeetingLocation?: string;
  pdfBase64?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendeeSchema = new Schema<IAttendee>(
  {
    name: { type: String, default: '' },
    designation: { type: String, default: '' },
  },
  { _id: false }
);

const MinutesItemSchema = new Schema<IMinutesItem>(
  {
    subject: { type: String, default: '' },
    actionBy: { type: String, default: '' },
    dateOfAction: { type: String, default: '' },
    remarks: { type: String, default: '' },
    followedUp: { type: Boolean, default: false },
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

// Always delete the cached model so schema changes (like new fields) are always picked up.
// Safe in production (runs once at startup) and fixes Next.js hot-reload schema drift in dev.
delete (mongoose.models as Record<string, unknown>).Minutes;
const Minutes: Model<IMinutes> = mongoose.model<IMinutes>('Minutes', MinutesSchema);

export default Minutes;

