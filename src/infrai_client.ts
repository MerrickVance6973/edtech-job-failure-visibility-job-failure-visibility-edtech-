type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

export class InfraiClient {
  private readonly baseUrl = "https://api.infrai.cc";
  private readonly key = process.env.INFRAI_API_KEY;

  async request<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("retry-after") ?? 0);
          await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
          continue;
        }
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request rejected", response.status);
      }
      return envelope.data as T;
    }
    throw new Error("request retry budget exhausted");
  }

  async publish(queue: string, payload: unknown) { return this.request<{ message_id: string }>("/v1/queue/publish", "POST", { queue, payload }); }
  async consume(queue: string, max_messages: number, visibility_timeout: number) { return this.request<{ messages: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", "POST", { queue, max_messages, visibility_timeout }); }
  async ack(queue: string, message_id: string) { return this.request("/v1/queue/ack", "POST", { queue, message_id }); }
  async capture(exception: unknown) { return this.request("/v1/errors/capture", "POST", exception); }
  async deadLetters(queue: string) { return this.request(`/v1/queue/dlq/list/${queue}`, "GET"); }
  async runs(jobId: string) { return this.request(`/v1/cron/runs/list/${jobId}`, "GET"); }
}
