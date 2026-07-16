import { Schema, Document, Model, Connection } from 'mongoose';

export interface IMeeting extends Document {
  name: string;
  date: Date;
  location?: string;
  chairperson?: string;
  meetLink?: string;
  adminPhone?: string;
  adminEmail?: string;
  createdAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    location: { type: String, trim: true },
    chairperson: { type: String, trim: true },
    meetLink: { type: String, trim: true },
    adminPhone: { type: String, trim: true },
    adminEmail: { type: String, trim: true },
  },
  { timestamps: true }
);

export function getMeetingModel(conn: Connection): Model<IMeeting> {
  return conn.models.Meeting ?? conn.model<IMeeting>('Meeting', MeetingSchema);
}
