import mongoose from 'mongoose';
import { Asset, ConversionStatus, oneOf } from '../constants.js';

const conversionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromToken: { type: String, default: 'TWORLD' },
    toAsset: { type: Number, required: true, validate: oneOf(Asset) },
    amount: { type: Number, required: true }, // tokens spent
    convertedAmount: { type: Number, required: true }, // mock asset received
    exchangeRate: { type: Number, required: true }, // asset units per 1 token
    txHashMock: { type: String, required: true },
    withdrawTxHashMock: String,
    status: { type: Number, default: ConversionStatus.CONFIRMED, validate: oneOf(ConversionStatus) },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

conversionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Conversion', conversionSchema);
