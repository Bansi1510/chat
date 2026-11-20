import { Schema, model } from 'mongoose';

const auditLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, index: true },
  targetType: { type: String },
  targetId: { type: String },
  meta: { type: Schema.Types.Mixed },
  at: { type: Date, default: Date.now, index: true },
});

export const AuditLog = model('AuditLog', auditLogSchema);
