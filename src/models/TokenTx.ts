import mongoose from 'mongoose';
import { TxType, TxSource, oneOf } from '../constants.js';


const txSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: Number, required: true, validate: oneOf(TxType) },
    source: { type: Number, required: true, validate: oneOf(TxSource) },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

txSchema.index({ userId: 1, createdAt: -1 });


txSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  throw new Error('token_transactions is append-only');
});
txSchema.pre('save', function () {
  if (!this.isNew) throw new Error('token_transactions is append-only');
});

export default mongoose.model('TokenTx', txSchema);
