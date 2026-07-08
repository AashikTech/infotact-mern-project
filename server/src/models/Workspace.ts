import mongoose, { Schema, Document, Model } from 'mongoose';

export type MemberRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMember {
  userId: mongoose.Types.ObjectId;
  role: MemberRole;
}

export interface WorkspaceDoc extends Document {
  name: string;
  owner: mongoose.Types.ObjectId;
  members: WorkspaceMember[];
  inviteCode: string;
}

const workspaceMemberSchema = new Schema<WorkspaceMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
  },
  { _id: false }
);

const workspaceSchema = new Schema<WorkspaceDoc>(
  {
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [workspaceMemberSchema], default: [] },
    inviteCode: { type: String, required: true },
  },
  { timestamps: true }
);

export const Workspace: Model<WorkspaceDoc> = mongoose.model<WorkspaceDoc>(
  'Workspace',
  workspaceSchema
);
