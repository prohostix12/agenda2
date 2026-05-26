import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMeeting extends Document {
  name: string;
  date: Date;
  location?: string;
  chairperson?: string;
  meetLink?: string;
  createdAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    location: { type: String, trim: true },
    chairperson: { type: String, trim: true },
    meetLink: { type: String, trim: true },
  },
  { timestamps: true }
);

const Meeting: Model<IMeeting> =
  mongoose.models.Meeting ?? mongoose.model<IMeeting>('Meeting', MeetingSchema);

export default Meeting;
