import { Router } from 'express';
import { verifyMessage } from 'ethers';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = Router();

const schema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
  address: z.string().min(1),
});


router.post('/verify-signature', validate(schema), (req, res) => {
  const { message, signature, address } = req.valid.body as z.infer<typeof schema>;
  try {
    const recovered = verifyMessage(message, signature);
    res.json({ valid: recovered.toLowerCase() === address.toLowerCase(), recoveredAddress: recovered });
  } catch {
    res.json({ valid: false, recoveredAddress: null });
  }
});

export default router;
