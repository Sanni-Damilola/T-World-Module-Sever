import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Media from '../models/Media.js';
import { requireAuth } from '../middleware/auth.js';
import { shortTerm, longTerm } from '../services/storage.js';
import { HttpError } from '../utils.js';
import { Role, Storage } from '../constants.js';

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  const filter = req.user.role === Role.ADMIN ? {} : { uploadedBy: req.user._id };
  res.json(await Media.find(filter).sort({ createdAt: -1 }).limit(50).lean());
});

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Send a file in the "file" field');

  const saved = await shortTerm.upload({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
  });

  const media = await Media.create({
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user._id,
    storage: Storage.CLOUDINARY,
    url: saved.url,
    cloudinaryId: saved.id,
    resourceType: saved.resourceType,
  });
  res.status(201).json(media);
});

router.post('/:id/promote', async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) throw new HttpError(404, 'Media not found');
  if (req.user.role !== Role.ADMIN && !media.uploadedBy.equals(req.user._id)) throw new HttpError(403, 'Not your file');
  if (media.storage === Storage.S3) throw new HttpError(409, 'Already promoted');

  const oldRef = { cloudinaryId: media.cloudinaryId, resourceType: media.resourceType, url: media.url };
  const buffer = await shortTerm.read(oldRef);
  const key = `media/${crypto.randomUUID()}-${media.filename}`;
  const { url } = await longTerm.put({ key, buffer, mimeType: media.mimeType ?? 'application/octet-stream' });

  media.storage = Storage.S3;
  media.s3Key = key;
  media.url = url;
  media.cloudinaryId = undefined;
  media.promotedAt = new Date();
  await media.save();

  shortTerm.remove(oldRef).catch((err) => console.error('cloudinary cleanup failed', err.message));

  res.json(media);
});

export default router;
