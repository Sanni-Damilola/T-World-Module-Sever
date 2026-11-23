import { config } from '../config.js';
import { Tone, Length } from '../constants.js';

export const PROMPT_VERSION = 'summarize-v1';

export interface SummaryOptions {
  tone: Tone;
  length: Length;
}

// how many sentences each length keeps
const SENTENCES: Record<Length, number> = {
  [Length.SHORT]: 1,
  [Length.MEDIUM]: 3,
  [Length.LONG]: 5,
};

const TONE_PREFIX: Record<Tone, string> = {
  [Tone.NEUTRAL]: '',
  [Tone.FORMAL]: 'In summary, ',
  [Tone.CASUAL]: 'So basically: ',
};

export class AiTimeoutError extends Error {}

const splitSentences = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]*/g)
    ?.map((s) => s.trim())
    .filter(Boolean) ?? [text];

// used when the provider fails, so the caller still gets something readable
export function fallbackSummary(body: string, length: Length = Length.SHORT) {
  return splitSentences(body).slice(0, SENTENCES[length]).join(' ');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Provider = (content: { body: string }, opts: SummaryOptions) => Promise<string>;

// fake model: waits a bit, sometimes fails, then keeps the first few sentences
const mockProvider: Provider = async (content, { tone, length }) => {
  await sleep(200 + Math.random() * config.ai.mockDelayMax);
  if (Math.random() < config.ai.mockFailRate) throw new Error('mock provider: upstream 503');
  return TONE_PREFIX[tone] + fallbackSummary(content.body, length);
};

// to plug in a real model, add another function with the same shape here
const providers: Record<string, Provider> = {
  mock: mockProvider,
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AiTimeoutError(`AI call took longer than ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function summarize(content: { body: string }, opts: SummaryOptions) {
  const provider = providers[config.ai.provider];
  if (!provider) throw new Error(`Unknown AI_PROVIDER "${config.ai.provider}"`);
  return withTimeout(provider(content, opts), config.ai.timeoutMs);
}
