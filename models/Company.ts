import { Schema, Document, Model, Connection } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  slug: string;
  dbName: string;
  description?: string;
  color: string;
  username: string;          // org login username
  passwordHash: string;
  passwordPlain: string;
  adminUsername?: string;    // notification admin login username
  adminPasswordHash?: string;
  adminPasswordPlain?: string;
  createdAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name:              { type: String, required: true, trim: true },
    slug:              { type: String, required: true, unique: true, trim: true, lowercase: true },
    dbName:            { type: String, required: true, trim: true },
    description:       { type: String, trim: true },
    color:             { type: String, default: 'blue' },
    username:          { type: String, required: true, trim: true, lowercase: true },
    passwordHash:      { type: String, required: true },
    passwordPlain:     { type: String, required: true },
    adminUsername:     { type: String, trim: true, lowercase: true, sparse: true },
    adminPasswordHash: { type: String },
    adminPasswordPlain:{ type: String },
  },
  { timestamps: true }
);

export function getCompanyModel(conn: Connection): Model<ICompany> {
  return conn.models.Company ?? conn.model<ICompany>('Company', CompanySchema);
}
