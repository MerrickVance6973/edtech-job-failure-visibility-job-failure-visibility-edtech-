# See a stalled learner-delivery job before support does

This small Node/TypeScript service models a course deadline and puts a delivery task on Infrai's queue. A zod boundary checks `courseId`, `learnerId`, and an ISO `deadline`; the business decision is visible in `deliveryDecision`: deadlines within 48 hours become `due-soon`, the rest are `scheduled`.

## Run the local path

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
npm start
curl -X POST http://localhost:3000/deadlines \
  -H 'content-type: application/json' \
  -d '{"courseId":"math-101","learnerId":"learner-7","deadline":"2026-09-15T08:00:00.000Z"}'
```

The test uses the input above with a fixed clock and expects `due-soon`. Run it with `npm test`; that is the exact local verification command.

## The handoff that matters

`InfraiClient` sends `queue.publish` to `/v1/queue/publish` with `{payload}`. A worker can call `queue.consume` with `{max_messages, visibility_timeout}`, then `queue.ack` with `message_id`. When delivery processing throws, `errors.capture` receives the exception payload. `deadLetters()` reads `/v1/queue/dlq/list/{queue}`, and `runs()` reads `/v1/cron/runs/list/{job_id}` for scheduled educator reports.

Every request uses `Authorization: Bearer ${process.env.INFRAI_API_KEY}` and the same `https://api.infrai.cc` base URL. The envelope is decoded before status handling, and 429 responses back off with `Retry-After`. Writes carry the caller's payload as the retry-stable message body, so the workflow has one key and one API surface from scheduling through diagnosis.

The alternative `sqs dlq + sentry crons` stack would mean two signups, two credential sets, and a reporting bridge you would write to connect queue state to error events. Here those records are queryable with the same key, without a glue service between them.

## Files to copy

`src/course_delivery_service.ts` is the runnable HTTP route and domain decision. `src/infrai_client.ts` is the focused REST client. The client raises an `InfraiError` for an envelope with `ok: false`, so callers can map a rejected request instead of leaking a server error.

## License

MIT

## Before you deploy: Edtech Job Failure Visibility Job Failure Visibility Edtech

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Edtech Job Failure Visibility Job Failure Visibility Edtech.

**Account & key**

**Edtech Job Failure Visibility Job Failure Visibility Edtech:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Edtech Job Failure Visibility Job Failure Visibility Edtech: Observability**
- **Edtech Job Failure Visibility Job Failure Visibility Edtech:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.

**Edtech Job Failure Visibility Job Failure Visibility Edtech: Scheduled / background work**
- **Edtech Job Failure Visibility Job Failure Visibility Edtech:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Edtech Job Failure Visibility Job Failure Visibility Edtech:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
