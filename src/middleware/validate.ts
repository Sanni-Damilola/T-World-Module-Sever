import type { RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../utils.js';
import { ValueOf, valuesOf } from '../constants.js';

export const validate =
  (schema: z.ZodType, where: 'body' | 'query' = 'body'): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req[where]);
    if (!result.success) {
      const msg = result.error.issues.map((i) => `${i.path.join('.') || where}: ${i.message}`).join('; ');
      throw new HttpError(400, msg);
    }
    req.valid = { ...req.valid, [where]: result.data };
    next();
  };

export const numberFrom = <T extends Record<string, number>>(obj: T) =>
  z.number().refine((v): v is ValueOf<T> => valuesOf(obj).includes(v as ValueOf<T>), 'unexpected value');
