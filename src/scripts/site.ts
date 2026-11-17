const header = document.querySelector(".site-header");
const sentinel = document.getElementById("top-sentinel");

if (header && sentinel) {
  new IntersectionObserver(([entry]) => {
    header.classList.toggle("is-stuck", !entry.isIntersecting);
  }).observe(sentinel);
}

document.querySelectorAll(".menu a").forEach((link) => {
  link.addEventListener("click", () => {
    const menu = link.closest("details");
    if (menu) menu.open = false;
  });
});

const navLinks = [...document.querySelectorAll<HTMLAnchorElement>("[data-nav]")];
const sections = navLinks
  .map((link) => {
    const id = link.hash.replace("#", "");
    const section = id ? document.getElementById(id) : null;
    return section ? { link, section } : null;
  })
  .filter((item): item is { link: HTMLAnchorElement; section: HTMLElement } => item !== null);

if (sections.length) {
  const ratios = new Map<Element, number>();
  const mark = () => {
    let current: Element | null = null;
    let best = 0;
    for (const [section, ratio] of ratios) {
      if (ratio > best) {
        best = ratio;
        current = section;
      }
    }
    for (const item of sections) {
      if (item.section === current && best > 0) item.link.setAttribute("aria-current", "true");
      else item.link.removeAttribute("aria-current");
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      mark();
    },
    { rootMargin: "-30% 0px -45% 0px", threshold: [0, 0.25, 0.6] },
  );
  const seen = new Set<Element>();
  for (const item of sections) {
    if (seen.has(item.section)) continue;
    seen.add(item.section);
    observer.observe(item.section);
  }
}

function showService(id: string) {
  document.querySelectorAll<HTMLImageElement>(".service-stage img").forEach((img) => {
    const on = img.dataset.for === id;
    img.classList.toggle("is-active", on);
    img.alt = on ? img.dataset.alt || "" : "";
    if (on) img.removeAttribute("aria-hidden");
    else img.setAttribute("aria-hidden", "true");
  });
  document.querySelectorAll<HTMLElement>(".service-row").forEach((row) => {
    row.classList.toggle("is-active", row.dataset.service === id);
  });
}

document.querySelectorAll<HTMLElement>(".service-row").forEach((row) => {
  const id = row.dataset.service;
  if (!id) return;
  row.addEventListener("mouseenter", () => showService(id));
  row.addEventListener("focusin", () => showService(id));
});

document.querySelectorAll<HTMLAnchorElement>("[data-fill-service]").forEach((link) => {
  link.addEventListener("click", () => {
    const select = document.querySelector<HTMLSelectElement>("#service");
    const value = link.dataset.fillService;
    if (select && value) select.value = value;
  });
});

const dialog = document.querySelector<HTMLDialogElement>("#viewer");
if (dialog && typeof dialog.showModal === "function") {
  const image = dialog.querySelector("img");
  const caption = dialog.querySelector("p");
  let lastTrigger: HTMLElement | null = null;
  document.querySelectorAll<HTMLAnchorElement>(".project-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!image) return;
      event.preventDefault();
      image.src = link.href;
      image.alt = link.dataset.alt || "";
      if (caption) caption.textContent = link.dataset.caption || "";
      lastTrigger = link;
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>("[data-close]")?.focus();
    });
  });
  dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => lastTrigger?.focus());
}

const bar = document.querySelector<HTMLElement>(".sticky-call");
const contact = document.getElementById("kontakt");
if (bar && contact) {
  new IntersectionObserver(
    ([entry]) => {
      const hide = entry.isIntersecting;
      bar.classList.toggle("is-hidden", hide);
      if (hide) bar.setAttribute("inert", "");
      else bar.removeAttribute("inert");
    },
    { threshold: 0.18 },
  ).observe(contact);
}

const form = document.querySelector<HTMLFormElement>("#lead-form");
if (form) {
  const started = form.querySelector<HTMLInputElement>('input[name="started"]');
  if (started) started.value = String(Date.now());
  const status = form.querySelector<HTMLElement>(".form-status");
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    if (!form.reportValidity()) return;
    event.preventDefault();
    if (!status || !button) return;
    status.textContent = "";
    status.className = "form-status";
    button.disabled = true;
    const label = button.textContent;
    button.textContent = "Изпраща се…";
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { accept: "application/json", "x-requested-with": "fetch" },
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      const message = data?.message || (response.ok ? "Запитването е изпратено." : "Запитването не беше изпратено. Обадете се на 0882 820025.");
      status.textContent = message;
      status.classList.add(response.ok ? "is-ok" : "is-error");
      if (response.ok) form.reset();
      if (started) started.value = String(Date.now());
    } catch {
      status.textContent = "Няма връзка. Обадете се на 0882 820025.";
      status.classList.add("is-error");
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
}
