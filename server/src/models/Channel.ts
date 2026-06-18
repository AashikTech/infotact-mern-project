import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ChannelDoc extends Document {
  name: string;
  workspaceId: mongoose.Types.ObjectId;
}

const channelSchema = new Schema<ChannelDoc>(
  {
    name: { type: String, required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  },
  { timestamps: true }
);

export const Channel: Model<ChannelDoc> = mongoose.model<ChannelDoc>(
  'Channel',
  channelSchema
);
