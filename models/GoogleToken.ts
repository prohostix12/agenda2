import { Schema, Document, Model, Connection } from 'mongoose';

export interface IGoogleToken extends Document {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

const GoogleTokenSchema = new Schema<IGoogleToken>({
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  expiryDate: { type: Number, required: true },
});

export function getGoogleTokenModel(conn: Connection): Model<IGoogleToken> {
  return conn.models.GoogleToken ?? conn.model<IGoogleToken>('GoogleToken', GoogleTokenSchema);
}
