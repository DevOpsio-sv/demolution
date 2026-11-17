import { evaluateLead, leadText, safeSubject, type CleanLead } from "../../src/lib/lead.ts";

interface Env {
  RESEND_API_KEY?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_TO_EMAIL?: string;
  LEAD_WEBHOOK_URL?: string;
  LEAD_WEBHOOK_SECRET?: string;
  ALLOWED_ORIGINS?: string;
}

const MAX_BODY = 20_000;
const RATE_LIMIT = 5;
const RATE_WINDOW = 600;

function wantsJson(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json") || request.headers.get("x-requested-with") === "fetch";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] ?? char;
  });
}

function htmlPage(title: string, message: string, status: number): Response {
  const body = `<!doctype html>
<html lang="bg">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; background: #F3F1EC; color: #171B1D; font: 18px/1.5 "Segoe UI", sans-serif; }
  main { max-width: 38rem; margin: 0 auto; padding: 4rem 1.25rem; }
  a { color: #171B1D; }
  .call { display: inline-block; margin-top: 1.5rem; background: #d85e33; color: #171B1D; text-decoration: none; font-weight: 700; padding: 0.9rem 1.1rem; }
</style>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
  <p><a class="call" href="tel:+359882820025">Обадете се: 0882 820025</a></p>
  <p><a href="/#kontakt">Обратно към формата</a></p>
</main>
</html>`;
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function reply(request: Request, status: number, message: string, ok: boolean): Response {
  if (wantsJson(request)) {
    return new Response(JSON.stringify({ ok, message }), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }
  if (ok) {
    return Response.redirect(new URL("/blagodarim", request.url), 303);
  }
  return htmlPage(status === 503 ? "Формулярът още не изпраща" : "Запитването не е изпратено", message, status);
}

function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const expected = new Set<string>();
  const hostHeader = request.headers.get("host");
  if (hostHeader) expected.add(hostHeader.toLowerCase());
  try {
    expected.add(new URL(request.url).host.toLowerCase());
  } catch {
    // The request URL is still checked through the Host header when it is visible.
  }
  if (expected.has(originHost.toLowerCase())) return true;
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return allowed.some((item) => {
    try {
      return new URL(item).host.toLowerCase() === originHost.toLowerCase();
    } catch {
      return false;
    }
  });
}

type RateCache = {
  match: (request: Request) => Promise<Response | undefined>;
  put: (request: Request, response: Response) => Promise<void>;
};

async function withinRateLimit(request: Request): Promise<boolean> {
  const cache = (globalThis as { caches?: { default?: RateCache } }).caches?.default;
  if (!cache) return true;
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const key = new Request(`https://demont-rate-limit.internal/${ip}`);
  const existing = await cache.match(key);
  const count = existing ? Number(await existing.text()) : 0;
  if (Number.isFinite(count) && count >= RATE_LIMIT) return false;
  await cache.put(
    key,
    new Response(String((Number.isFinite(count) ? count : 0) + 1), {
      headers: { "cache-control": `max-age=${RATE_WINDOW}` },
    }),
  );
  return true;
}

function isEmail(value: string | undefined): value is string {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120;
}

function safeWebhook(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "[::1]") return null;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return null;
    return url;
  } catch {
    return null;
  }
}

async function deliver(lead: CleanLead, env: Env): Promise<"sent" | "unconfigured" | "failed"> {
  if (env.RESEND_API_KEY && isEmail(env.CONTACT_TO_EMAIL) && isEmail(env.CONTACT_FROM_EMAIL)) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [env.CONTACT_TO_EMAIL],
        subject: safeSubject(lead.place),
        text: leadText(lead),
      }),
    });
    if (!response.ok) {
      console.error("lead_delivery_failed", { provider: "resend", status: response.status });
      return "failed";
    }
    return "sent";
  }

  const webhook = safeWebhook(env.LEAD_WEBHOOK_URL);
  if (env.LEAD_WEBHOOK_URL && !webhook) {
    console.error("lead_webhook_rejected");
    return "failed";
  }
  if (webhook) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (env.LEAD_WEBHOOK_SECRET) headers.authorization = `Bearer ${env.LEAD_WEBHOOK_SECRET}`;
    const response = await fetch(webhook, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: lead.name,
        phone: lead.phone,
        place: lead.place,
        service: lead.service,
        message: lead.message,
        receivedAt: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      console.error("lead_delivery_failed", { provider: "webhook", status: response.status });
      return "failed";
    }
    return "sent";
  }

  console.error("lead_delivery_unconfigured");
  return "unconfigured";
}

export async function handleContact(request: Request, env: Env = {}): Promise<Response> {
  if (request.method !== "POST") {
    return reply(request, 405, "Методът не е позволен.", false);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY) {
    return reply(request, 413, "Запитването е твърде голямо.", false);
  }

  if (!originAllowed(request, env)) {
    return reply(request, 403, "Заявката е отказана.", false);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(request, 400, "Невалидна заявка.", false);
  }

  for (const value of form.values()) {
    if (typeof value !== "string") {
      return reply(request, 400, "Формулярът не приема файлове. Изпратете снимки по телефона или във Viber.", false);
    }
  }

  if (!(await withinRateLimit(request))) {
    return reply(request, 429, "Изпратени са твърде много запитвания. Обадете се на 0882 820025.", false);
  }

  const decision = evaluateLead({
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    place: String(form.get("place") ?? ""),
    service: String(form.get("service") ?? ""),
    message: String(form.get("message") ?? ""),
    company_website: String(form.get("company_website") ?? ""),
    started: String(form.get("started") ?? ""),
  });

  if (!decision.ok) return reply(request, 400, decision.message, false);
  if (decision.spam) return reply(request, 200, "Запитването е прието.", true);

  const delivered = await deliver(decision.lead, env);
  if (delivered === "unconfigured") {
    return reply(
      request,
      503,
      "Формулярът още не е свързан с поща. Обадете се на 0882 820025, за да получим запитването.",
      false,
    );
  }
  if (delivered === "failed") {
    return reply(request, 502, "Запитването не беше изпратено. Обадете се на 0882 820025.", false);
  }
  return reply(request, 200, "Запитването е изпратено. Ще се свържем с вас по телефона.", true);
}

export const onRequestPost = (context: { request: Request; env: Env }) =>
  handleContact(context.request, context.env);
