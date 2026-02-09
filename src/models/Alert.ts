import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  uploadId: mongoose.Types.ObjectId;
  name: string;
  platforms: string[];
  details: string;
  emailSent: boolean;
  sentDate?: Date;
  alertDate: Date;
  month: number;
  year: number;
}

const alertSchema = new Schema<IAlert>(
  {
    uploadId: { type: Schema.Types.ObjectId, ref: 'Upload', required: true },
    name: { type: String, required: true },
    platforms: [{ type: String }],
    details: { type: String, required: true },
    emailSent: { type: Boolean, default: false },
    sentDate: Date,
    alertDate: { type: Date, default: Date.now },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

alertSchema.index({ uploadId: 1, name: 1 });
alertSchema.index({ emailSent: 1 });

export default mongoose.model<IAlert>('Alert', alertSchema);