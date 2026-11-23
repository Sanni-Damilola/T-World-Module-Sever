import { Router, Request } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../models/User.js';
import TokenTx from '../models/TokenTx.js';
import Conversion from '../models/Conversion.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { credit, debit } from '../services/tokens.js';
import { HttpError, fakeTxHash } from '../utils.js';
import { Role, Asset, ASSET_INFO, ConversionStatus, TxType, TxSource } from '../constants.js';

const router = Router();
router.use(requireAuth);


function targetUserId(req: Request) {
  const asked = req.query.userId;
  if (typeof asked === 'string' && req.user.role === Role.ADMIN && mongoose.isValidObjectId(asked)) return asked;
  return req.user._id;
}

router.get('/balance', async (req, res) => {
  const user = await User.findById(targetUserId(req)).lean();
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ userId: user._id, email: user.email, tokenBalance: user.tokenBalance });
});

router.get('/history', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const filter = { userId: targetUserId(req) };

  const [items, total] = await Promise.all([
    TokenTx.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TokenTx.countDocuments(filter),
  ]);
  res.json({ items, page, total, pages: Math.ceil(total / limit) || 1 });
});

router.get('/conversions', async (req, res) => {
  res.json(await Conversion.find({ userId: targetUserId(req) }).sort({ createdAt: -1 }).lean());
});


const convertSchema = z.object({
  toAsset: z
    .string()
    .refine((n): n is keyof typeof Asset => Object.hasOwn(Asset, n), 'must be MOCK_USDT or MOCK_ETH')
    .transform((n) => Asset[n]),
  amount: z.number().int().positive(),
});

router.post('/convert', validate(convertSchema), async (req, res) => {
  const { toAsset, amount } = req.valid.body as z.infer<typeof convertSchema>;
  const info = ASSET_INFO[toAsset];
  const converted = Number((amount / info.tokensPerUnit).toFixed(6));
  if (converted <= 0) throw new HttpError(400, 'Amount too small for this asset');

  const conversion = new Conversion({
    userId: req.user._id,
    toAsset,
    amount,
    convertedAmount: converted,
    exchangeRate: 1 / info.tokensPerUnit,
    txHashMock: fakeTxHash(),
  });

  await debit({ userId: req.user._id, amount, type: TxType.CONVERT, source: TxSource.SYSTEM, referenceId: conversion._id });
  await conversion.save();

  res.status(201).json({
    conversionId: conversion._id,
    txHashMock: conversion.txHashMock,
    convertedAmount: `${converted} ${info.name}`,
  });
});

const withdrawSchema = z.object({ conversionId: z.string().optional() });

router.post('/withdraw', validate(withdrawSchema), async (req, res) => {
  const { conversionId } = req.valid.body as z.infer<typeof withdrawSchema>;
  const filter: Record<string, any> = { userId: req.user._id, status: ConversionStatus.CONFIRMED };
  if (conversionId) filter._id = conversionId;

  const pending = await Conversion.find(filter);
  if (!pending.length) throw new HttpError(404, 'Nothing to withdraw');

  const done = [];
  for (const c of pending) {
    
    const updated = await Conversion.findOneAndUpdate(
      { _id: c._id, status: ConversionStatus.CONFIRMED },
      { status: ConversionStatus.WITHDRAWN, withdrawTxHashMock: fakeTxHash() },
      { new: true }
    );
    if (!updated) continue;

    const fresh = await User.findById(req.user._id);
    await TokenTx.create({
      userId: req.user._id,
      type: TxType.WITHDRAW,
      source: TxSource.SYSTEM,
      amount: 0,
      balanceAfter: fresh?.tokenBalance ?? 0,
      referenceId: updated._id,
    });
    done.push(updated);
  }

  if (!done.length) throw new HttpError(409, 'Already withdrawn');

  res.json({
    status: 'SUCCESS',
    network: 'Ethereum',
    txHashMock: done[0].withdrawTxHashMock,
    withdrawn: done.map((c) => ({
      id: c._id,
      asset: ASSET_INFO[c.toAsset as Asset].name,
      amount: c.convertedAmount,
      txHashMock: c.withdrawTxHashMock,
    })),
  });
});


const grantSchema = z.object({ userId: z.string(), amount: z.number().int().positive().max(100000) });

router.post('/grant', requireRole(Role.ADMIN), validate(grantSchema), async (req, res) => {
  const { userId, amount } = req.valid.body as z.infer<typeof grantSchema>;
  const { user } = await credit({ userId, amount, source: TxSource.MANUAL });
  res.json({ userId: user._id, tokenBalance: user.tokenBalance });
});

export default router;
