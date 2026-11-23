import mongoose, { InferSchemaType } from 'mongoose';
import { Role, oneOf } from '../constants.js';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: Number, default: Role.USER, validate: oneOf(Role) },
    tokenBalance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type IUser = InferSchemaType<typeof userSchema>;
export default mongoose.model('User', userSchema);
