import type { HydratedDocument } from 'mongoose';
import type { IUser } from '../models/User.js';

declare global {
  namespace Express {
    interface Request {
      user: HydratedDocument<IUser>;
      // filled by the validate middleware, cast to the zod type where you read it
      valid: { body?: unknown; query?: unknown };
    }
  }
}
