import mongoose, { Schema, Document } from 'mongoose';
import { AVATAR_SHAPES, AVATAR_VARIANTS, DEFAULT_AVATAR_CONFIG } from '../../../contracts/user.contract';
import type { AvatarConfig } from '../../../contracts/user.contract';

export interface UserDocument extends Document {
  email: string;
  firstName: string;
  lastName?: string;
  passwordHash: string;
  role: string;
  avatar: AvatarConfig;
  createdAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: false },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: 'user' },
    avatar: {
      variant: { type: String, required: true, enum: AVATAR_VARIANTS, default: DEFAULT_AVATAR_CONFIG.variant },
      style: {
        bgColor: {
          color: { type: String, required: true, default: DEFAULT_AVATAR_CONFIG.style.bgColor.color },
          intensity: { type: Number, required: false, default: DEFAULT_AVATAR_CONFIG.style.bgColor.intensity },
          opacity: { type: Number, required: false },
        },
        fontColor: {
          color: { type: String, required: false },
          intensity: { type: Number, required: false },
          opacity: { type: Number, required: false },
        },
        shape: { type: String, required: true, enum: AVATAR_SHAPES, default: DEFAULT_AVATAR_CONFIG.style.shape },
      },
      image: {
        url: { type: String, required: false },
      },
      dicebear: {
        style: { type: String, required: false },
        seed: { type: String, required: false },
        options: { type: Schema.Types.Mixed, required: false },
      },
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models['User'] || mongoose.model<UserDocument>('User', userSchema);