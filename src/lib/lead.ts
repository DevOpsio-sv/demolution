export const serviceOptions = [
  "Стопанска постройка",
  "Гараж или навес",
  "Стена или зидария",
  "Покрив",
  "Дървена конструкция",
  "Вътрешен демонтаж",
  "Друго",
] as const;

export type ServiceOption = (typeof serviceOptions)[number];

export interface CleanLead {
  name: string;
  phone: string;
  place: string;
  service: ServiceOption;
  message: string;
}

export type LeadDecision =
  | { ok: true; spam: true }
  | { ok: true; spam: false; lead: CleanLead }
  | { ok: false; message: string };

const NAME = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]{1,79}$/u;
const PLACE = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s.'’,./-]{1,79}$/u;

function clean(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\u00a0/g, " ")
    .trim()
    .slice(0, max);
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

export function evaluateLead(input: {
  name?: string;
  phone?: string;
  place?: string;
  service?: string;
  message?: string;
  company_website?: string;
  started?: string;
}, now = Date.now()): LeadDecision {
  const trap = clean(input.company_website ?? "", 200);
  if (trap) return { ok: true, spam: true };

  const started = Number(input.started);
  if (Number.isFinite(started) && started > 0) {
    const elapsed = now - started;
    if (elapsed >= 0 && elapsed < 1500) return { ok: true, spam: true };
  }

  const name = clean(input.name ?? "", 80);
  const phoneRaw = clean(input.phone ?? "", 24);
  const place = clean(input.place ?? "", 80);
  const service = clean(input.service ?? "", 80);
  const message = clean(input.message ?? "", 2000).replace(/\n{3,}/g, "\n\n");

  if (!NAME.test(name)) {
    return { ok: false, message: "Попълнете име за контакт." };
  }

  const phoneDigits = digits(phoneRaw);
  const phoneOk = /^\+?[0-9][0-9\s().-]{5,20}$/.test(phoneRaw) && phoneDigits.length >= 8 && phoneDigits.length <= 15;
  if (!phoneOk) {
    return { ok: false, message: "Въведете телефон, на който можем да ви се обадим." };
  }

  if (!PLACE.test(place)) {
    return { ok: false, message: "Посочете населеното място." };
  }

  if (!serviceOptions.includes(service as ServiceOption)) {
    return { ok: false, message: "Изберете какво трябва да бъде демонтирано." };
  }

  if (message.length < 10) {
    return { ok: false, message: "Опишете обекта с поне едно изречение." };
  }

  const urlCount = message.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (urlCount > 2) {
    return { ok: false, message: "Премахнете излишните връзки и опишете обекта с думи." };
  }

  return {
    ok: true,
    spam: false,
    lead: {
      name,
      phone: phoneRaw,
      place,
      service: service as ServiceOption,
      message,
    },
  };
}

export function leadText(lead: CleanLead): string {
  return [
    `Име: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    `Населено място: ${lead.place}`,
    `Обект: ${lead.service}`,
    "",
    lead.message,
  ].join("\n");
}

export function safeSubject(place: string): string {
  const compact = place.replace(/[\r\n]+/g, " ").slice(0, 60);
  return `Запитване за демонтаж — ${compact}`;
}
