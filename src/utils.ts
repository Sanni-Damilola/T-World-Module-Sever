import crypto from 'crypto';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const fakeTxHash = () => '0x' + crypto.randomBytes(32).toString('hex');
