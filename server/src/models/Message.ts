import mongoose, { Schema, Document, Model } from 'mongoose';

export interface MessageDoc extends Document {
  content: string;
  senderId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
}

const messageSchema = new Schema<MessageDoc>(
  {
    content: { type: String, required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
  },
  { timestamps: true }
);

export const Message: Model<MessageDoc> = mongoose.model<MessageDoc>(
  'Message',
  messageSchema
);
