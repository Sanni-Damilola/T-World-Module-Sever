import { Router } from 'express';
import mongoose from 'mongoose';
import AiRun from '../models/AiRun.js';
import { requireAuth } from '../middleware/auth.js';
import { Role } from '../constants.js';

const router = Router();
router.use(requireAuth);


router.get('/', async (req, res) => {
  const filter: Record<string, any> = req.user.role === Role.ADMIN ? {} : { userId: req.user._id };
  const cid = req.query.contentId;
  if (typeof cid === 'string' && mongoose.isValidObjectId(cid)) filter.contentId = cid;

  const runs = await AiRun.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('contentId', 'title')
    .populate('userId', 'email')
    .lean();
  res.json(runs);
});

export default router;
