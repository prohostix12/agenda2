import { Schema, Document, Model, Connection, Types } from 'mongoose';

export interface IExtensionRequest extends Document {
  company: string;
  meetingId: Types.ObjectId;
  itemIndex: number;
  subject: string;
  actionBy: string;
  meetingName: string;
  originalDeadline: string;
  reason: string;
  requestedDeadline: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

const ExtensionRequestSchema = new Schema<IExtensionRequest>(
  {
    company:           { type: String, required: true, trim: true },
    meetingId:         { type: Schema.Types.ObjectId, required: true },
    itemIndex:         { type: Number, required: true },
    subject:           { type: String, required: true },
    actionBy:          { type: String, default: '' },
    meetingName:       { type: String, default: '' },
    originalDeadline:  { type: String, required: true },
    reason:            { type: String, required: true },
    requestedDeadline: { type: String, required: true },
    status:            { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

export function getExtensionRequestModel(conn: Connection): Model<IExtensionRequest> {
  return conn.models.ExtensionRequest ?? conn.model<IExtensionRequest>('ExtensionRequest', ExtensionRequestSchema);
}
