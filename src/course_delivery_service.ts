import { createServer } from "node:http";
import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const deadlineRequest = z.object({ courseId: z.string().min(1), learnerId: z.string().min(1), deadline: z.string().datetime() });
export type DeadlineRequest = z.infer<typeof deadlineRequest>;

export function deliveryDecision(input: DeadlineRequest, now = new Date()): "due-soon" | "scheduled" {
  const hours = (new Date(input.deadline).getTime() - now.getTime()) / 3_600_000;
  return hours <= 48 ? "due-soon" : "scheduled";
}

const client = new InfraiClient();
export async function queueDeadline(input: DeadlineRequest) {
  const decision = deliveryDecision(input);
  return client.publish("course-deadlines", { ...input, decision });
}

if (process.argv[1]?.endsWith("course_delivery_service.ts")) {
  createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/deadlines") { res.statusCode = 404; res.end("not found"); return; }
    try {
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const input = deadlineRequest.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      const result = await queueDeadline(input);
      res.writeHead(202, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true, data: result }));
    } catch (error) {
      const message = error instanceof z.ZodError ? "invalid deadline request" : (error as Error).message;
      res.writeHead(error instanceof z.ZodError ? 400 : 502, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: false, error: message }));
    }
  }).listen(Number(process.env.PORT ?? 3000));
}
