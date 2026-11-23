import mongoose from 'mongoose';
import { AiStatus, Tone, Length, oneOf } from '../constants.js';

const aiRunSchema = new mongoose.Schema(
  {
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    promptVersion: { type: String, required: true },
    status: { type: Number, required: true, validate: oneOf(AiStatus) },
    output: String,
    error: String,
    tone: { type: Number, validate: oneOf(Tone) },
    length: { type: Number, validate: oneOf(Length) },
    latencyMs: Number,
    tokensAwarded: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

aiRunSchema.index({ userId: 1, createdAt: -1 });
aiRunSchema.index({ contentId: 1, createdAt: -1 });

export default mongoose.model('AiRun', aiRunSchema);
