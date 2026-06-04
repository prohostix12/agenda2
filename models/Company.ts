import { Schema, Document, Model, Connection } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  slug: string;      // URL-safe identifier, e.g. "iits"
  dbName: string;    // MongoDB database name, e.g. "meeting-manager"
  description?: string;
  color: string;     // Tailwind color key, e.g. "blue"
  createdAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    dbName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    color: { type: String, default: 'blue' },
  },
  { timestamps: true }
);

export function getCompanyModel(conn: Connection): Model<ICompany> {
  return conn.models.Company ?? conn.model<ICompany>('Company', CompanySchema);
}
