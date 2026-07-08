import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose';

export interface Doc extends MongooseDocument {
  workspaceId: mongoose.Types.ObjectId;
  content: string;
  updatedAt: Date;
}

const docSchema = new Schema<Doc>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

export const DocModel: Model<Doc> = mongoose.model<Doc>('Document', docSchema);
