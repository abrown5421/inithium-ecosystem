import mongoose, { Schema, Document } from 'mongoose';

export interface UserDocument extends Document {
  email: string;
  firstName: string;
  lastName?: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: false },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: 'user' },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models['User'] || mongoose.model<UserDocument>('User', userSchema);