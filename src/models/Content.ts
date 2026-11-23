import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

contentSchema.index({ tags: 1, createdAt: -1 });
contentSchema.index({ title: 'text', body: 'text' });

export default mongoose.model('Content', contentSchema);
