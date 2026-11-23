import mongoose from 'mongoose';
import { config } from '../config.js';
import User from '../models/User.js';
import Content from '../models/Content.js';
import { Role } from '../constants.js';

const samples = [
  {
    title: 'Why we moved to event-driven billing',
    tags: ['engineering', 'billing'],
    body: 'Our old billing job ran once a night and a single failure meant a whole day of delayed invoices. We switched to publishing an event for every usage record. Consumers pick them up as they arrive and retry on their own. Support tickets about missing invoices dropped sharply in the first month. The trade-off is more moving parts to monitor.',
  },
  {
    title: 'Onboarding checklist for new teammates',
    tags: ['people', 'process'],
    body: 'Day one is about access: email, the repo, and the staging environment. Day two is a guided tour of the architecture with a buddy. By the end of week one every new hire should have shipped a small change to production. We keep the checklist in the wiki and update it after every hire.',
  },
  {
    title: 'Notes on caching product listings',
    tags: ['engineering', 'performance'],
    body: 'Product listings barely change but get hit constantly. A short TTL cache in front of the database cut average latency by more than half. Invalidation is the hard part, so we clear the key whenever an editor saves. Cold starts after a deploy are still slow and need a warm-up step.',
  },
];

await mongoose.connect(config.mongoUri);
const email = config.adminEmails[0] || 'admin@example.com';
const admin = (await User.findOne({ email })) || (await User.create({ email, role: Role.ADMIN }));

if ((await Content.countDocuments()) === 0) {
  await Content.insertMany(samples.map((s) => ({ ...s, createdBy: admin._id })));
  console.log(`seeded ${samples.length} content items`);
} else {
  console.log('content already there, skipping');
}
console.log(`admin user: ${email}`);
await mongoose.disconnect();
