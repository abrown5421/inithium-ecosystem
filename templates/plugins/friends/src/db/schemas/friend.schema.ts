import mongoose, { Schema, Document } from 'mongoose';
import type { FriendStatus } from '../contracts/friend.contract';

export interface FriendDocument extends Document {
  requesterId: string;
  requesteeId: string;
  status: FriendStatus;
  requestedAt: Date;
  acceptedAt?: Date;
}

// No schema-level `timestamps` - `requestedAt`/`acceptedAt` are the two dates this domain
// actually cares about (mirrors blog-post.schema.ts's own comment/commentSchema split, which
// sets `createdAt` explicitly rather than reaching for `timestamps: true`).
const friendSchema = new Schema<FriendDocument>({
  requesterId: { type: String, required: true, index: true },
  requesteeId: { type: String, required: true, index: true },
  status: { type: String, required: true, enum: ['sent', 'pending', 'accepted'], default: 'sent' },
  requestedAt: { type: Date, required: true, default: Date.now },
  acceptedAt: { type: Date, required: false },
});

export const FriendModel = mongoose.models['Friend'] || mongoose.model<FriendDocument>('Friend', friendSchema);
