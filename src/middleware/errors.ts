import type { ErrorRequestHandler, RequestHandler } from 'express';

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err.name === 'CastError') return void res.status(400).json({ error: 'Invalid id' });
  if (err.code === 11000) return void res.status(409).json({ error: 'Already exists' });
  if (err.name === 'MulterError') return void res.status(400).json({ error: err.message });

  const status: number = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message });
};
