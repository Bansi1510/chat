import { Schema, model } from 'mongoose';

const connectionSchema = new Schema(
  {
    userA: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userB: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pairKey: { type: String, required: true, unique: true }, // sorted user ids: `${id1}_${id2}`
    status: { type: String, enum: ['active', 'blocked', 'removed'], default: 'active' },
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

connectionSchema.index({ userA: 1, userB: 1 });
export const Connection = model('Connection', connectionSchema);
