import { Schema, model } from 'mongoose';

const globalPermissionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    enabled: { type: Boolean, required: true },
  },
  { timestamps: true },
);
export const GlobalPermission = model('GlobalPermission', globalPermissionSchema);

const userPermissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, required: true },
    enabled: { type: Boolean, required: true },
  },
  { timestamps: true },
);
userPermissionSchema.index({ userId: 1, key: 1 }, { unique: true });
export const UserPermission = model('UserPermission', userPermissionSchema);
