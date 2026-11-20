import { Schema, model } from 'mongoose';

const callHistorySchema = new Schema(
  {
    callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['audio', 'video'], required: true },
    status: { type: String, enum: ['missed', 'rejected', 'completed', 'busy'], required: true },
    durationSeconds: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

export const CallHistory = model('CallHistory', callHistorySchema);
