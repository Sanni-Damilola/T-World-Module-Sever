import 'dotenv/config';

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name} in .env (see .env.example)`);
    process.exit(1);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: need('MONGODB_URI'),
  jwtSecret: need('JWT_SECRET'),
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  ai: {
    provider: process.env.AI_PROVIDER || 'mock',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 5000,
    mockDelayMax: Number(process.env.AI_MOCK_DELAY_MAX_MS) || 1200,
    mockFailRate: Number(process.env.AI_MOCK_FAIL_RATE) || 0,
    reward: Number(process.env.TOKENS_PER_AI_RUN) || 5,
  },
  storageMode: process.env.STORAGE_MODE || 'mock',
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
  aws: {
    region: process.env.AWS_REGION || 'eu-west-1',
    bucket: process.env.S3_BUCKET || '',
  },
};
