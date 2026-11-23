import { v2 as cloudinary } from 'cloudinary';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { config } from '../config.js';

/*
  Two small interfaces so the routes don't care what's behind them.
  Mock versions are the default, live versions are used when STORAGE_MODE=live.
*/

export interface StoredRef {
  url?: string | null;
  cloudinaryId?: string | null;
  resourceType?: string | null;
}

export interface ShortTermStore {
  upload(f: { buffer: Buffer; filename: string; mimeType: string }): Promise<{ url: string; id: string; resourceType: string }>;
  read(ref: StoredRef): Promise<Buffer>;
  remove(ref: StoredRef): Promise<void>;
}

export interface LongTermStore {
  put(f: { key: string; buffer: Buffer; mimeType: string }): Promise<{ url: string }>;
}

// ---------- mock versions (default) ----------
const memory = new Map<string, Buffer>(); // only lives as long as the process does

const mockShortTerm: ShortTermStore = {
  async upload({ buffer, filename }) {
    const id = `mock/${crypto.randomUUID()}`;
    memory.set(id, buffer);
    return { url: `https://res.cloudinary.example/${id}/${encodeURIComponent(filename)}`, id, resourceType: 'raw' };
  },
  async read(ref) {
    return memory.get(ref.cloudinaryId ?? '') ?? Buffer.alloc(0);
  },
  async remove(ref) {
    memory.delete(ref.cloudinaryId ?? '');
  },
};

const mockLongTerm: LongTermStore = {
  async put({ key }) {
    return { url: `https://mock-bucket.s3.example.com/${key}` };
  },
};

// ---------- real versions ----------
function liveShortTerm(): ShortTermStore {
  cloudinary.config(config.cloudinary);
  return {
    upload({ buffer }) {
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ resource_type: 'auto', folder: 't-world' }, (err, res) => {
            if (err || !res) return reject(err ?? new Error('Cloudinary returned nothing'));
            resolve({ url: res.secure_url, id: res.public_id, resourceType: res.resource_type });
          })
          .end(buffer);
      });
    },
    async read(ref) {
      const res = await fetch(ref.url ?? '');
      if (!res.ok) throw new Error(`Could not download from Cloudinary (${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    },
    async remove(ref) {
      await cloudinary.uploader.destroy(ref.cloudinaryId ?? '', { resource_type: ref.resourceType || 'image' });
    },
  };
}

function liveLongTerm(): LongTermStore {
  const s3 = new S3Client({ region: config.aws.region }); // reads AWS_ACCESS_KEY_ID / SECRET from env
  return {
    async put({ key, buffer, mimeType }) {
      await s3.send(new PutObjectCommand({ Bucket: config.aws.bucket, Key: key, Body: buffer, ContentType: mimeType }));
      return { url: `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}` };
    },
  };
}

const live = config.storageMode === 'live';
export const shortTerm: ShortTermStore = live ? liveShortTerm() : mockShortTerm;
export const longTerm: LongTermStore = live ? liveLongTerm() : mockLongTerm;
