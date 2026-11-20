import { Schema, model } from 'mongoose';

const conversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    pairKey: { type: String, required: true, unique: true },
    disappearingSeconds: { type: Number, default: 0 }, // 0 = off, 300, 3600, 86400, 604800, 2592000, 31536000
    lastMessageAt: { type: Date, default: Date.now },
    pinnedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mutedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    wallpapers: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
export const Conversation = model('Conversation', conversationSchema);
