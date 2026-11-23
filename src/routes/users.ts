import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Role } from '../constants.js';

const router = Router();
router.use(requireAuth, requireRole(Role.ADMIN));

router.get('/', async (req, res) => {
  res.json(await User.find().sort({ createdAt: -1 }).lean());
});

export default router;
