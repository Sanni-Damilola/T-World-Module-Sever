/*
  Everything that used to be an enum lives here as plain numbers.
  The database stores the number, the comment says what it means.
  Need a new value? Add a line (use the next free number, never reuse old ones).
*/

export type ValueOf<T> = T[keyof T];

export const Role = {
  USER: 0, // normal account
  ADMIN: 1, // can add content, see all users and all AI runs
} as const;
export type Role = ValueOf<typeof Role>;

export const AiStatus = {
  SUCCESS: 0, // model answered in time, tokens awarded
  FAILED: 1, // provider threw an error, fallback summary returned
  TIMEOUT: 2, // took longer than AI_TIMEOUT_MS, fallback summary returned
} as const;
export type AiStatus = ValueOf<typeof AiStatus>;

export const TxType = {
  EARN: 0, // tokens added
  CONVERT: 1, // tokens spent to get a mock asset
  WITHDRAW: 2, // mock asset sent out (amount is 0, tokens already left at CONVERT)
} as const;
export type TxType = ValueOf<typeof TxType>;

export const TxSource = {
  AI_USAGE: 0, // earned by running AI
  MANUAL: 1, // admin granted
  SYSTEM: 2, // created by the system (conversions, withdrawals)
} as const;
export type TxSource = ValueOf<typeof TxSource>;

export const Asset = {
  MOCK_USDT: 0, // fake stablecoin
  MOCK_ETH: 1, // fake ether
} as const;
export type Asset = ValueOf<typeof Asset>;

// tokens needed for 1 unit of the asset
// 100 tokens = 1 MOCK_USDT, 200 tokens = 0.01 MOCK_ETH (so 20000 per ETH)
export const ASSET_INFO: Record<Asset, { name: string; tokensPerUnit: number }> = {
  [Asset.MOCK_USDT]: { name: 'MOCK_USDT', tokensPerUnit: 100 },
  [Asset.MOCK_ETH]: { name: 'MOCK_ETH', tokensPerUnit: 20000 },
};

export const ConversionStatus = {
  CONFIRMED: 0, // converted, waiting to be withdrawn
  WITHDRAWN: 1, // sent out (mock)
} as const;
export type ConversionStatus = ValueOf<typeof ConversionStatus>;

export const Storage = {
  CLOUDINARY: 0, // short term
  S3: 1, // long term
} as const;
export type Storage = ValueOf<typeof Storage>;

export const Tone = {
  NEUTRAL: 0,
  FORMAL: 1,
  CASUAL: 2,
} as const;
export type Tone = ValueOf<typeof Tone>;

export const Length = {
  SHORT: 0, // 1 sentence
  MEDIUM: 1, // 3 sentences
  LONG: 2, // 5 sentences
} as const;
export type Length = ValueOf<typeof Length>;

export const valuesOf = <T extends Record<string, number>>(obj: T) => Object.values(obj) as ValueOf<T>[];

// mongoose validator: rejects numbers that aren't in the constants object
export const oneOf = <T extends Record<string, number>>(obj: T) => ({
  validator: (v: number) => valuesOf(obj).includes(v as ValueOf<T>),
  message: 'unexpected value for {PATH}',
});
