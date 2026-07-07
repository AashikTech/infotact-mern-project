import mongoose, { Schema, Document, Model } from 'mongoose';

export interface AttachmentDoc {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
}

export interface MessageDoc extends Document {
  content: string;
  senderId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  attachments: AttachmentDoc[];
}

const attachmentSchema = new Schema<AttachmentDoc>(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const messageSchema = new Schema<MessageDoc>(
  {
    content: { type: String, required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true }
);

export const Message: Model<MessageDoc> = mongoose.model<MessageDoc>(
  'Message',
  messageSchema
);
