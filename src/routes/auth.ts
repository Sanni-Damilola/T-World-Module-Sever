import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import User from '../models/User.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { Role } from '../constants.js';

const router = Router();

const loginSchema = z.object({ email: z.string().email() });

router.post('/login', validate(loginSchema), async (req, res) => {
  const email = (req.valid.body as z.infer<typeof loginSchema>).email.toLowerCase();
  const role = config.adminEmails.includes(email) ? Role.ADMIN : Role.USER;

  let user = await User.findOne({ email });
  if (!user) user = await User.create({ email, role });
  else if (role === Role.ADMIN && user.role !== Role.ADMIN) {
    user.role = Role.ADMIN;
    await user.save();
  }

  const token = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '12h' });
  res.json({ token, user });
});

router.get('/me', requireAuth, (req, res) => res.json(req.user));

export default router;
