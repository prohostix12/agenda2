import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgendaItem {
  order: number;
  title: string;
  description?: string;
  duration?: string;
  presenters: string[];
}

export interface IAgenda extends Document {
  meetingId: mongoose.Types.ObjectId;
  items: IAgendaItem[];
  updatedAt: Date;
}

const AgendaItemSchema = new Schema<IAgendaItem>(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    duration: { type: String, trim: true },
    presenters: { type: [String], default: [] },
  },
  { _id: false }
);

const AgendaSchema = new Schema<IAgenda>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, unique: true },
    items: { type: [AgendaItemSchema], default: [] },
  },
  { timestamps: true }
);

const Agenda: Model<IAgenda> =
  mongoose.models.Agenda ?? mongoose.model<IAgenda>('Agenda', AgendaSchema);

export default Agenda;
