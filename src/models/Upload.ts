// import mongoose, { Schema, Document } from 'mongoose';

// export interface IUpload extends Document {
//   filename: string;
//   month: number;
//   year: number;
//   uploadDate: Date;
//   totalNames: number;
//   processedNames: number;
//   extractedNames?: string[];
//   status: 'pending' | 'processing' | 'completed' | 'failed';
//   errorMessage?: string;
//   platform: string;
//   results: Array<{
//     name: string;
//     found: boolean;
//     pdfUrl: string | null;
//     checkedAt: Date;
//   }>;
// }

// const uploadSchema = new Schema<IUpload>(
//   {
//     filename: { type: String, required: true },
//     platform: { type: String },
//     month: { type: Number, required: true, min: 1, max: 12 },
//     year: { type: Number, required: true },
//     uploadDate: { type: Date, default: Date.now },
//     totalNames: { type: Number, default: 0 },
//     processedNames: { type: Number, default: 0 },
//     extractedNames: [{ type: String }],
//     status: {
//       type: String,
//       enum: ['pending', 'processing', 'completed', 'failed'],
//       default: 'pending',
//     },
//     errorMessage: String,
//     results: [
//       {
//         name: String,
//         found: Boolean,
//         pdfUrl: String,
//         checkedAt: Date,
//       },
//     ],
//   },
//   { timestamps: true }
// );

// export default mongoose.model<IUpload>('Upload', uploadSchema);


import mongoose, { Schema, Document } from 'mongoose';

export interface IResult {
  name: string;
  platform: string;
  found: boolean;
  pdfUrl: string | null;
  checkedAt: Date;
}

export interface IUpload extends Document {
  filename: string;
  month: number;
  year: number;
  uploadDate: Date;
  totalNames: number;
  processedNames: number;
  extractedNames?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  results: IResult[];
}

const ResultSchema = new Schema<IResult>({
  name: { type: String, required: true },
  platform: { type: String, required: true },
  found: { type: Boolean, required: true },
  pdfUrl: { type: String, default: null },
  checkedAt: { type: Date, default: Date.now }
});

const uploadSchema = new Schema<IUpload>(
  {
    filename: { type: String, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now },
    totalNames: { type: Number, default: 0 },
    processedNames: { type: Number, default: 0 },
    extractedNames: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    errorMessage: { type: String },
    results: [ResultSchema]
  },
  { timestamps: true }
);

export default mongoose.model<IUpload>('Upload', uploadSchema);