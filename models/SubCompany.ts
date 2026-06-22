import { Schema, Document, Model, Connection } from 'mongoose';

export interface ISubCompany extends Document {
  orgSlug: string;
  name: string;
  slug: string;
  color: string;
  username: string;
  passwordHash: string;
  passwordPlain: string;
  createdAt: Date;
}

const SubCompanySchema = new Schema<ISubCompany>(
  {
    orgSlug:       { type: String, required: true, trim: true, lowercase: true },
    name:          { type: String, required: true, trim: true },
    slug:          { type: String, required: true, trim: true, lowercase: true },
    color:         { type: String, default: 'blue' },
    username:      { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash:  { type: String, required: true },
    passwordPlain: { type: String, required: true },
  },
  { timestamps: true }
);

SubCompanySchema.index({ orgSlug: 1, slug: 1 }, { unique: true });

export function getSubCompanyModel(conn: Connection): Model<ISubCompany> {
  return conn.models.SubCompany ?? conn.model<ISubCompany>('SubCompany', SubCompanySchema);
}
