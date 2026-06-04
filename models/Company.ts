import { Schema, Document, Model, Connection } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  slug: string;
  dbName: string;
  description?: string;
  color: string;
  username: string;       // login username for this org
  passwordHash: string;   // scrypt hash of the password
  createdAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name:         { type: String, required: true, trim: true },
    slug:         { type: String, required: true, unique: true, trim: true, lowercase: true },
    dbName:       { type: String, required: true, trim: true },
    description:  { type: String, trim: true },
    color:        { type: String, default: 'blue' },
    username:     { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export function getCompanyModel(conn: Connection): Model<ICompany> {
  return conn.models.Company ?? conn.model<ICompany>('Company', CompanySchema);
}
