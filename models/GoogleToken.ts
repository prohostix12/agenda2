import mongoose, { Schema, Document, Model } from 'mongoose';

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

const GoogleToken: Model<IGoogleToken> =
  mongoose.models.GoogleToken ?? mongoose.model<IGoogleToken>('GoogleToken', GoogleTokenSchema);

export default GoogleToken;
