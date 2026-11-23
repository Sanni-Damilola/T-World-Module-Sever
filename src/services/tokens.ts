import type { Types } from 'mongoose';
import User from '../models/User.js';
import TokenTx from '../models/TokenTx.js';
import { HttpError } from '../utils.js';
import { TxType, TxSource } from '../constants.js';

type Id = Types.ObjectId | string;

// add tokens and write the ledger row
export async function credit(p: { userId: Id; amount: number; source: TxSource; referenceId?: Id }) {
  const user = await User.findByIdAndUpdate(p.userId, { $inc: { tokenBalance: p.amount } }, { new: true });
  if (!user) throw new HttpError(404, 'User not found');
  const tx = await TokenTx.create({
    userId: p.userId,
    type: TxType.EARN,
    source: p.source,
    amount: p.amount,
    balanceAfter: user.tokenBalance,
    referenceId: p.referenceId,
  });
  return { user, tx };
}

// remove tokens. the $gte in the filter makes the balance check and the
// update one atomic step, so two parallel requests can't overspend
export async function debit(p: { userId: Id; amount: number; type: TxType; source: TxSource; referenceId?: Id }) {
  const user = await User.findOneAndUpdate(
    { _id: p.userId, tokenBalance: { $gte: p.amount } },
    { $inc: { tokenBalance: -p.amount } },
    { new: true }
  );
  if (!user) throw new HttpError(400, 'Not enough tokens');
  const tx = await TokenTx.create({
    userId: p.userId,
    type: p.type,
    source: p.source,
    amount: -p.amount,
    balanceAfter: user.tokenBalance,
    referenceId: p.referenceId,
  });
  return { user, tx };
}
