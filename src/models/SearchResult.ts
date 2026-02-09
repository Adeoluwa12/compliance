import mongoose, { Schema, Document } from 'mongoose';

export interface ISearchResult extends Document {
  uploadId: mongoose.Types.ObjectId;
  name: string;
  platform: 'opensanctions' | 'hhs' | 'tennessee';
  found: boolean;
  pdfPath?: string;
  pdfUrl?: string;
  details?: string;
  searchDate: Date;
  month: number;
  year: number;
}

const searchResultSchema = new Schema<ISearchResult>(
  {
    uploadId: { type: Schema.Types.ObjectId, ref: 'Upload', required: true },
    name: { type: String, required: true },
    platform: {
      type: String,
      enum: ['opensanctions', 'hhs', 'tennessee'],
      required: true,
    },
    found: { type: Boolean, required: true },
    pdfPath: String,
    pdfUrl: String,
    details: String,
    searchDate: { type: Date, default: Date.now },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

searchResultSchema.index({ uploadId: 1, name: 1 });
searchResultSchema.index({ platform: 1, found: 1 });

export default mongoose.model<ISearchResult>('SearchResult', searchResultSchema);