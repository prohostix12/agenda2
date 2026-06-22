import { Schema, Document, Model, Connection } from 'mongoose';

export interface ISettings extends Document {
  adminName?:  string;
  adminPhone?: string;
  adminEmail?: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    adminName:  { type: String, trim: true, default: '' },
    adminPhone: { type: String, trim: true, default: '' },
    adminEmail: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export function getSettingsModel(conn: Connection): Model<ISettings> {
  return conn.models.Settings ?? conn.model<ISettings>('Settings', SettingsSchema);
}
