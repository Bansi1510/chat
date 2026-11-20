import { Schema, model } from 'mongoose';

const identityKeySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    identityKey: { type: String, required: true },
    signedPreKey: {
      keyId: { type: Number, required: true },
      publicKey: { type: String, required: true },
      signature: { type: String, required: true },
    },
    oneTimePreKeys: [
      {
        keyId: { type: Number, required: true },
        publicKey: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const IdentityKey = model('IdentityKey', identityKeySchema);
