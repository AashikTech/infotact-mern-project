import mongoose, { Schema, Document, Model } from 'mongoose';

export interface WorkspaceDoc extends Document {
  name: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  inviteCode: string;
}

const workspaceSchema = new Schema<WorkspaceDoc>(
  {
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    inviteCode: { type: String, required: true },
  },
  { timestamps: true }
);

export const Workspace: Model<WorkspaceDoc> = mongoose.model<WorkspaceDoc>(
  'Workspace',
  workspaceSchema
);
