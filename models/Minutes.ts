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
}

export interface IMinutes extends Document {
  meetingId: mongoose.Types.ObjectId;
  meetingType?: string;
  meetingReference?: string;
  attendees: IAttendee[];
  items: IMinutesItem[];
  nextMeetingDate?: string;
  nextMeetingLocation?: string;
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
  },
  { _id: false }
);

const MinutesSchema = new Schema<IMinutes>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, unique: true },
    meetingType: { type: String, trim: true },
    meetingReference: { type: String, trim: true },
    attendees: { type: [AttendeeSchema], default: [] },
    items: { type: [MinutesItemSchema], default: [] },
    nextMeetingDate: { type: String },
    nextMeetingLocation: { type: String },
  },
  { timestamps: true }
);

const Minutes: Model<IMinutes> =
  mongoose.models.Minutes ?? mongoose.model<IMinutes>('Minutes', MinutesSchema);

export default Minutes;
