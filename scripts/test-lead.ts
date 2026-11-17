import assert from "node:assert/strict";
import test from "node:test";
import { evaluateLead } from "../src/lib/lead.ts";
import { handleContact } from "../functions/api/contact.ts";

const valid = {
  name: "Иван Петров",
  phone: "0882 820025",
  place: "с. Катунец",
  service: "Покрив",
  message: "Стар навес до къщата, около 40 квадрата.",
};

test("accepts a complete Bulgarian inquiry", () => {
  const result = evaluateLead(valid);
  assert.equal(result.ok, true);
  if (result.ok && !result.spam) assert.equal(result.lead.service, "Покрив");
});

test("rejects a short description and an unknown service", () => {
  const short = evaluateLead({ ...valid, message: "навес" });
  assert.equal(short.ok, false);
  const service = evaluateLead({ ...valid, service: "Всичко" });
  assert.equal(service.ok, false);
});

test("treats a filled honeypot as spam without an error", () => {
  const result = evaluateLead({ ...valid, company_website: "https://spam.example" });
  assert.deepEqual(result, { ok: true, spam: true });
});

test("treats an instant submission as spam", () => {
  const now = 10_000;
  const result = evaluateLead({ ...valid, started: "9000" }, now);
  assert.deepEqual(result, { ok: true, spam: true });
});

function request(fields: Record<string, string>, headers: Record<string, string> = {}) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return new Request("http://localhost/api/contact", {
    method: "POST",
    body,
    headers: { accept: "application/json", origin: "http://localhost", ...headers },
  });
}

test("returns 503 when delivery is not configured", async () => {
  const response = await handleContact(request(valid), {});
  assert.equal(response.status, 503);
  const json = await response.json();
  assert.equal(json.ok, false);
  assert.match(json.message, /0882 820025/);
});

test("does not call the network for a honeypot", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("should not deliver");
  };
  try {
    const response = await handleContact(request({ ...valid, company_website: "bot" }), {
      LEAD_WEBHOOK_URL: "https://leads.example/hook",
    });
    assert.equal(response.status, 200);
  } finally {
    globalThis.fetch = original;
  }
});

test("posts a validated lead to an https webhook", async () => {
  let called = "";
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    called = String(input);
    return new Response("ok", { status: 200 });
  };
  try {
    const response = await handleContact(request(valid), { LEAD_WEBHOOK_URL: "https://leads.example/hook" });
    assert.equal(response.status, 200);
    assert.equal(called, "https://leads.example/hook");
  } finally {
    globalThis.fetch = original;
  }
});

test("rejects a foreign origin", async () => {
  const response = await handleContact(request(valid, { origin: "https://evil.example" }), {});
  assert.equal(response.status, 403);
});

test("rejects a private webhook address", async () => {
  const response = await handleContact(request(valid), { LEAD_WEBHOOK_URL: "https://127.0.0.1/hook" });
  assert.equal(response.status, 502);
});
