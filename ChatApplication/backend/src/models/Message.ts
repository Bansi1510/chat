import { Schema, model } from 'mongoose';

export const MESSAGE_TYPES = [
  'text',
  'image',
  'video',
  'document',
  'audio',
  'voice',
  'location',
  'system',
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientMsgId: { type: String, required: true },
    ciphertext: { type: String, required: true }, // E2EE payload or encrypted metadata
    type: { type: String, enum: MESSAGE_TYPES, default: 'text' },
    mediaUrl: { type: String, default: null },
    mediaMeta: {
      mime: String,
      size: Number,
      name: String,
      duration: Number,
      thumbnail: String,
    },
    replyToId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    forwarded: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
    starredBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // Status tracking: single tick (sent), double tick (delivered), blue tick (read)
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // Soft deletion
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedForEveryone: { type: Boolean, default: false },
    // Disappearing message expiry
    expiresAt: { type: Date, default: null, index: true },
    // Scheduled message flag
    isScheduled: { type: Boolean, default: false, index: true },
    scheduledFor: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, clientMsgId: 1 }, { unique: true });

export const Message = model('Message', messageSchema);
