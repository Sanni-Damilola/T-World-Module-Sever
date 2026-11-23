import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import Content from '../models/Content.js';
import AiRun from '../models/AiRun.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, numberFrom } from '../middleware/validate.js';
import { summarize, fallbackSummary, AiTimeoutError, PROMPT_VERSION } from '../services/ai.js';
import { credit } from '../services/tokens.js';
import { HttpError } from '../utils.js';
import { Role, AiStatus, TxSource, Tone, Length } from '../constants.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  tags: z.array(z.string().trim().min(1)).max(10).default([]),
});

const listSchema = z.object({
  tag: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const summarizeSchema = z.object({
  tone: numberFrom(Tone).default(Tone.NEUTRAL),
  length: numberFrom(Length).default(Length.SHORT),
});

const PAGE_SIZE = 10;

router.post('/', requireRole(Role.ADMIN), validate(createSchema), async (req, res) => {
  const body = req.valid.body as z.infer<typeof createSchema>;
  const item = await Content.create({ ...body, createdBy: req.user._id });
  res.status(201).json(item);
});

router.get('/', validate(listSchema, 'query'), async (req, res) => {
  const { tag, q, page } = req.valid.query as z.infer<typeof listSchema>;
  const filter: Record<string, any> = {};
  if (tag) filter.tags = tag;
  if (q) filter.$text = { $search: q };

  const [items, total] = await Promise.all([
    Content.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Content.countDocuments(filter),
  ]);

  res.json({ items, page, pageSize: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) || 1 });
});

router.get('/:id', async (req, res) => {
  const item = await Content.findById(req.params.id).lean();
  if (!item) throw new HttpError(404, 'Content not found');
  res.json(item);
});

router.post('/:id/ai/summarize', validate(summarizeSchema), async (req, res) => {
  const content = await Content.findById(req.params.id);
  if (!content) throw new HttpError(404, 'Content not found');

  const { tone, length } = req.valid.body as z.infer<typeof summarizeSchema>;
  const started = Date.now();
  let output: string;
  let status: AiStatus = AiStatus.SUCCESS;
  let error: string | undefined;

  try {
    output = await summarize(content, { tone, length });
  } catch (err) {
    status = err instanceof AiTimeoutError ? AiStatus.TIMEOUT : AiStatus.FAILED;
    error = (err as Error).message;
    output = fallbackSummary(content.body, length);
  }
  const latencyMs = Date.now() - started;

  const run = await AiRun.create({
    contentId: content._id,
    userId: req.user._id,
    promptVersion: PROMPT_VERSION,
    status,
    output,
    error,
    tone,
    length,
    latencyMs,
  });

  // only successful runs earn tokens, fallbacks don't
  let balance = req.user.tokenBalance;
  let tokensAwarded = 0;
  if (status === AiStatus.SUCCESS) {
    const { user } = await credit({
      userId: req.user._id,
      amount: config.ai.reward,
      source: TxSource.AI_USAGE,
      referenceId: run._id,
    });
    tokensAwarded = config.ai.reward;
    balance = user.tokenBalance;
    run.tokensAwarded = tokensAwarded;
    await run.save();
  }

  res.json({
    runId: run._id,
    status,
    fallback: status !== AiStatus.SUCCESS,
    error,
    output,
    latencyMs,
    tokensAwarded,
    totalTokenBalance: balance,
  });
});

export default router;
