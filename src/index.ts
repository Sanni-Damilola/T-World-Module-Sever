import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config.js';
import { logger } from './middleware/logger.js';
import { notFound, errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import contentRoutes from './routes/content.js';
import aiRunRoutes from './routes/aiRuns.js';
import userRoutes from './routes/users.js';
import tokenRoutes from './routes/tokens.js';
import mediaRoutes from './routes/media.js';
import web3Routes from './routes/web3.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(logger);

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/content', contentRoutes);
app.use('/ai-runs', aiRunRoutes);
app.use('/users', userRoutes);
app.use('/tokens', tokenRoutes);
app.use('/media', mediaRoutes);
app.use('/web3', web3Routes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await mongoose.connect(config.mongoUri);
  console.log('mongo connected');
  await mongoose.connection.syncIndexes();
  app.listen(config.port, () => console.log(`api on http://localhost:${config.port} (storage: ${config.storageMode})`));
}

start().catch((err) => {
  console.error('failed to start', err.message);
  process.exit(1);
});
