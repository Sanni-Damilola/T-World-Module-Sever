import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import User from '../models/User.js';
import { HttpError } from '../utils.js';
import type { Role } from '../constants.js';

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Missing token');

  let id: string;
  try {
    id = jwt.verify(token, config.jwtSecret).sub as string;
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }

  
  const user = await User.findById(id);
  if (!user) throw new HttpError(401, 'User no longer exists');
  req.user = user;
  next();
};

export const requireRole =
  (role: Role): RequestHandler =>
  (req, res, next) => {
    if (req.user.role !== role) throw new HttpError(403, 'Not allowed for your role');
    next();
  };
