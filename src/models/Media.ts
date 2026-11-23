import mongoose from 'mongoose';
import { Storage, oneOf } from '../constants.js';

const mediaSchema = new mongoose.Schema(
  {
    filename: String,
    mimeType: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // where the file lives right now
    storage: { type: Number, default: Storage.CLOUDINARY, validate: oneOf(Storage) },
    url: String,
    cloudinaryId: String,
    resourceType: String,
    s3Key: String,
    promotedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('Media', mediaSchema);
