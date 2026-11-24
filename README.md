# T-World Module Service: backend

Express + MongoDB API for a content service with AI summaries and a token reward system.
Users run an AI summary on a piece of content and earn tokens. Tokens go into a ledger, and can be
converted into mock crypto (MOCK_USDT / MOCK_ETH) and "withdrawn". There is no real blockchain,
that part is mocked on purpose.

Written in TypeScript (Node + Express, Mongoose, Zod).

## What you need

- Node 20 or newer
- A MongoDB Atlas database (the free tier is fine)

That's all. The AI provider and file storage run in mock mode by default, so no API keys or extra accounts.

## Run it

```bash
cd server
cp .env.example .env     # then fill in the three required values below
npm install
npm run seed             # optional: adds sample articles and the admin user
npm run dev              # http://localhost:4000
```

Check it's up: open http://localhost:4000/health, you should see `{"ok":true}`.

Other scripts:

| command | what it does |
| --- | --- |
| `npm run dev` | start with auto-reload |
| `npm run build` then `npm start` | compile to `dist/` and run the compiled version |
| `npm run typecheck` | type check without building |
| `npm run seed` | add sample content and the admin user |

## Environment variables

Copy `.env.example` to `.env`. Only the first three are required.

| variable | what to put |
| --- | --- |
| `MONGODB_URI` | Atlas connection string. In Atlas: Database, Connect, Drivers, copy the `mongodb+srv://...` string, add your password, and put a database name before the `?` (e.g. `/t_world?`) |
| `JWT_SECRET` | any long random string. One way: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAILS` | comma separated emails that get the admin role when they log in, e.g. `admin@example.com` |
| `PORT` | default `4000` |
| `AI_PROVIDER` | `mock` (default) |
| `AI_TIMEOUT_MS` | how long to wait for the AI before using the fallback, default `5000` |
| `AI_MOCK_DELAY_MAX_MS` | max fake delay of the mock AI, default `1200` |
| `AI_MOCK_FAIL_RATE` | 0 to 1, chance the mock AI fails. Use `1` to always fail |
| `TOKENS_PER_AI_RUN` | tokens for a successful run, default `5` |
| `STORAGE_MODE` | `mock` (default) or `live` |
| `PUBLIC_URL` | only needed if the API isn't at `http://localhost:PORT`. Used for links to mock files |
| `CLOUDINARY_*`, `AWS_*`, `S3_BUCKET` | only needed when `STORAGE_MODE=live` |

Note: Atlas must allow your IP under Network Access, otherwise the server can't connect.

## Logging in

Login is email only, no password. This is a shortcut for the assessment, not something to ship.

- Log in with an email from `ADMIN_EMAILS` and you're an **admin**.
- Any other email creates a normal **user**.

The response gives you a token. Send it on every other request as `Authorization: Bearer <token>`.

## Try it quickly

The easiest way is the Postman collection in `docs/t-world.postman_collection.json`.
Import it, run the **Auth** folder first, then go down the folders in order. It saves the token and
ids for you. It uses `admin@example.com`, so that must be in `ADMIN_EMAILS`.

Or with curl:

```bash
# 1. log in
curl -s localhost:4000/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@example.com"}'

# 2. use the token from the response
TOKEN=<paste token>
curl localhost:4000/content -H "authorization: Bearer $TOKEN"

# 3. summarize one item (use an id from step 2)
curl -X POST localhost:4000/content/<id>/ai/summarize \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"tone":1,"length":1}'
```

A good order to follow:

1. Log in as admin, list or create content.
2. Summarize something. You get +5 tokens.
3. Check `/tokens/balance` and `/tokens/history`.
4. Convert 100 tokens to MOCK_USDT, then withdraw it.
5. Try `/media/upload`, then `/media/:id/promote`.

To see the timeout and fallback path, set `AI_MOCK_FAIL_RATE=1` (always fails), or
`AI_MOCK_DELAY_MAX_MS=8000` with `AI_TIMEOUT_MS=1000`, and restart. You'll get a basic fallback
summary and no tokens.

## Endpoints

Everything except login, health and verify-signature needs the bearer token.

| method | path | who | what it does |
| --- | --- | --- | --- |
| GET | `/health` | public | server check |
| POST | `/auth/login` | public | `{email}` returns `{token, user}` |
| GET | `/auth/me` | any | current user |
| POST | `/content` | admin | create content `{title, body, tags}` |
| GET | `/content?tag=&q=&page=` | any | list, 10 per page. `q` is a text search |
| GET | `/content/:id` | any | one item |
| POST | `/content/:id/ai/summarize` | any | `{tone, length}`, runs the AI, saves the run, awards tokens on success |
| GET | `/ai-runs` | any | admin sees all runs, a user sees their own |
| GET | `/users` | admin | all users and balances |
| GET | `/tokens/balance` | any | your balance (admin can add `?userId=`) |
| GET | `/tokens/history?page=` | any | ledger, newest first |
| GET | `/tokens/conversions` | any | your conversions |
| POST | `/tokens/convert` | any | `{toAsset: "MOCK_USDT" or "MOCK_ETH", amount}` |
| POST | `/tokens/withdraw` | any | `{conversionId?}`, omit the id to withdraw all confirmed |
| POST | `/tokens/grant` | admin | `{userId, amount}`, test helper that gives tokens |
| GET | `/media` | any | list files (admin sees all) |
| POST | `/media/upload` | any | multipart form, field name `file`, stored in Cloudinary (short term) |
| POST | `/media/:id/promote` | owner or admin | moves the file to S3 (long term) |
| POST | `/web3/verify-signature` | public | `{message, signature, address}` checks a wallet signature |

Errors come back as `{"error": "message"}` with a normal status: 400 bad input,
401 no or bad token, 403 wrong role, 404 not found, 409 already done.

### Example summarize response

```json
{
  "runId": "...",
  "status": 0,
  "fallback": false,
  "output": "In summary, ...",
  "latencyMs": 640,
  "tokensAwarded": 5,
  "totalTokenBalance": 45
}
```

## Values are numbers

Fixed values (roles, statuses and so on) are stored and returned as numbers instead of strings.
They're defined in `src/constants.ts`, each with a comment saying what it means.

| field | values |
| --- | --- |
| role | 0 user, 1 admin |
| AI run status | 0 success, 1 failed, 2 timeout |
| tone (request) | 0 neutral, 1 formal, 2 casual |
| length (request) | 0 short (1 sentence), 1 medium (3), 2 long (5) |
| transaction type | 0 earn, 1 convert, 2 withdraw |
| transaction source | 0 AI usage, 1 manual, 2 system |
| conversion status | 0 confirmed, 1 withdrawn |
| storage | 0 Cloudinary, 1 S3 |

The one exception is `toAsset` on `/tokens/convert`, which takes the name (`"MOCK_USDT"`) because the brief shows it that way.

Rates used: 100 tokens = 1 MOCK_USDT, 200 tokens = 0.01 MOCK_ETH.

## Project layout

```
src/
  index.ts         app setup and startup
  config.ts        reads .env
  constants.ts     the number values above
  models/          mongoose schemas
  routes/          one file per area (auth, content, tokens, media, ...)
  services/
    ai.ts          AI provider, timeout, fallback
    tokens.ts      credit / debit with ledger rows
    storage.ts     short term + long term storage (mock and live)
  middleware/      auth, validation, logging, error handling
  scripts/seed.ts  sample data
```

## How a few things work

**Token ledger.** Every balance change writes a row in `token_transactions` with the amount and
the balance right after. Rows can't be updated or deleted (the model blocks it), so the history acts like
a simple audit trail. Spent tokens are stored as negative amounts.

**No overspending.** Converting checks the balance and subtracts in one database update
(`tokenBalance >= amount` is part of the filter), so two requests sent at once can't spend the same tokens.

**AI calls.** The provider sits behind a small function type in `services/ai.ts`, so a real model
can be added next to the mock one. Each call has a timeout. If it fails or times out, the API still
returns a fallback summary (the first sentences of the text), saves the run with the failed status,
and awards nothing.

**Storage.** `services/storage.ts` has a short term and a long term interface. In mock mode files are
saved to `.mock-storage/` and served at `/mock-files`, so you can open the links. With
`STORAGE_MODE=live` it uses real Cloudinary and S3. Promote copies the file to the long term store,
updates the database link first, then deletes the short term copy.

**Mock blockchain.** A convert creates a record in `contract_conversions` (the `Conversion` model) with a random fake
`0x...` transaction hash. Withdraw marks it withdrawn and writes a ledger row. Nothing talks to a chain.
`/web3/verify-signature` is real though: it recovers the signer address with `ethers`.

## Known limits and what I'd do next

- The balance update and the ledger insert are two separate writes. A crash between them could leave
  them out of sync. I'd wrap them in a MongoDB transaction.
- Login has no password. A real version needs proper auth.
- Mock AI just returns the first sentences. It's built so a real provider can be dropped in.
- No automated tests yet. The Postman collection covers the main flows and error cases.
- Mock storage files live on local disk, so they disappear if the host wipes its disk (e.g. a free Render instance restarting).

## Troubleshooting

- **"Missing MONGODB_URI in .env":** you haven't created `.env`, or the variable is empty.
- **Can't connect to Mongo:** add your IP in Atlas under Network Access, and URL-encode any special characters in the password.
- **403 on creating content:** you're logged in as a normal user. Use an email from `ADMIN_EMAILS`.
- **Images don't load after upload:** make sure `PUBLIC_URL` points to where the API actually runs.
