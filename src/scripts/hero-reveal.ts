// Shared progress is the visible share of AFTER (0–1).
// Mask, seam, and handle use one diagonal: x(t) = top + t · slant.

const ANGLE = (16 * Math.PI) / 180;
const REVEAL_FROM = 0.15;
const REVEAL_TO = 0.85;
const DELAY = 500;
const TRAVEL = 3000;
const HOLD = 2500;
const SAMPLES = 48;

const root = document.querySelector<HTMLElement>("[data-hero-compare]");
if (root && root.dataset.bound !== "true") {
  root.dataset.bound = "true";
  mount(root);
}

function mount(root: HTMLElement) {
  const sliderEl = root.querySelector<HTMLInputElement>(".hero-compare-slider");
  const seamEl = root.querySelector<SVGSVGElement>(".hero-seam");
  const lineEls = [...root.querySelectorAll<SVGLineElement>(".hero-seam line")];
  if (!sliderEl || !seamEl || lineEls.length === 0) return;
  const slider: HTMLInputElement = sliderEl;
  const seam: SVGSVGElement = seamEl;
  const lines: SVGLineElement[] = lineEls;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const signal = new AbortController();
  let slant = 18;
  let area = 0;
  let handleT = 0.5;
  let ready = false;
  let userOwned = false;
  let heldByFocus = false;
  let reduced = motion.matches;
  let inView = true;
  let pageVisible = document.visibilityState === "visible";
  let delayLeft = DELAY;
  let elapsed = 0;
  let last = 0;
  let raf = 0;
  let painted = "";
  let drag: { id: number; x: number; y: number; active: boolean } | null = null;

  for (const img of root.querySelectorAll("img")) img.draggable = false;

  function measure() {
    const rect = root.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    slant = (Math.tan(ANGLE) * rect.height * 100) / rect.width;
  }

  function coverAt(progress: number, t: number) {
    return Math.min(100, Math.max(0, progress * (100 + slant) - t * slant));
  }

  function areaOf(progress: number) {
    let sum = 0;
    for (let i = 0; i < SAMPLES; i++) sum += coverAt(progress, (i + 0.5) / SAMPLES);
    return sum / SAMPLES / 100;
  }

  function progressFor(target: number) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      if (areaOf(mid) < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function paint(progress: number) {
    const top = 100 - progress * (100 + slant);
    const bottom = top + slant;
    const key = `${top.toFixed(3)}|${bottom.toFixed(3)}|${handleT.toFixed(3)}`;
    if (key === painted) return;
    painted = key;

    let t0 = 0;
    let t1 = 1;
    if (Math.abs(slant) > 0.001) {
      const enter = (0 - top) / slant;
      const exit = (100 - top) / slant;
      t0 = Math.max(0, Math.min(enter, exit));
      t1 = Math.min(1, Math.max(enter, exit));
    } else if (top < 0 || top > 100) {
      t0 = 1;
      t1 = 0;
    }
    const visible = t1 - t0 > 0.02 && area > 0.004 && area < 0.996;
    const t = visible ? Math.min(t1, Math.max(t0, handleT)) : Math.min(1, Math.max(0, handleT));
    const x = Math.min(100, Math.max(0, top + t * slant));

    root.style.setProperty("--cut-top", `${top.toFixed(3)}%`);
    root.style.setProperty("--cut-bottom", `${bottom.toFixed(3)}%`);
    root.style.setProperty("--hx", `${x.toFixed(3)}%`);
    root.style.setProperty("--hy", `${(t * 100).toFixed(3)}%`);
    const x1 = top.toFixed(3);
    const x2 = bottom.toFixed(3);
    for (const line of lines) {
      line.setAttribute("x1", x1);
      line.setAttribute("x2", x2);
    }
    seam.toggleAttribute("hidden", !visible);
  }

  function applyProgress(progress: number) {
    const next = Math.min(1, Math.max(0, progress));
    area = areaOf(next);
    paint(next);
  }

  function applyArea(next: number) {
    area = Math.min(1, Math.max(0, next));
    paint(progressFor(area));
  }

  function writeSlider() {
    const pct = Math.round(area * 100);
    slider.value = String(pct);
    slider.setAttribute("aria-valuetext", `${pct}% след`);
  }

  function canPlay() {
    return ready && !userOwned && !heldByFocus && !reduced && inView && pageVisible;
  }

  function stop() {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    root.classList.remove("is-playing");
  }

  function syncPlayback() {
    if (!canPlay()) {
      stop();
      return;
    }
    if (raf) return;
    root.classList.add("is-playing");
    raf = requestAnimationFrame(frame);
  }

  function ease(amount: number) {
    const x = Math.min(1, Math.max(0, amount));
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      const mx = ((1.9 * mid - 2.85) * mid + 1.95) * mid;
      if (mx < x) lo = mid;
      else hi = mid;
    }
    const t = (lo + hi) / 2;
    return (3 - 2 * t) * t * t;
  }

  function frame(now: number) {
    raf = 0;
    if (!canPlay()) {
      root.classList.remove("is-playing");
      return;
    }
    if (!last) {
      last = now;
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = now - last;
    last = now;
    if (dt > 200) {
      raf = requestAnimationFrame(frame);
      return;
    }
    if (delayLeft > 0) {
      delayLeft = Math.max(0, delayLeft - dt);
      raf = requestAnimationFrame(frame);
      return;
    }
    elapsed += dt;
    const cycle = TRAVEL + HOLD + TRAVEL + HOLD;
    const t = elapsed % cycle;
    let mix = 0;
    if (t < TRAVEL) mix = ease(t / TRAVEL);
    else if (t < TRAVEL + HOLD) mix = 1;
    else if (t < TRAVEL + HOLD + TRAVEL) mix = 1 - ease((t - TRAVEL - HOLD) / TRAVEL);
    const nextArea = REVEAL_FROM + (REVEAL_TO - REVEAL_FROM) * mix;
    if (Math.abs(nextArea - area) > 0.0004) applyArea(nextArea);
    raf = requestAnimationFrame(frame);
  }

  function pointProgress(clientX: number, clientY: number) {
    const rect = root.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const t = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    handleT = t;
    return Math.min(1, Math.max(0, (100 - x + t * slant) / (100 + slant)));
  }

  function takePointer(event: PointerEvent) {
    userOwned = true;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, active: true };
    applyProgress(pointProgress(event.clientX, event.clientY));
    writeSlider();
    syncPlayback();
    try {
      root.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured.
    }
  }

  root.addEventListener(
    "pointerdown",
    (event) => {
      if (!ready || event.button !== 0) return;
      if (event.target === slider && event.pointerType !== "touch") {
        event.preventDefault();
        slider.focus({ preventScroll: true });
      }
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false };
      if (event.pointerType !== "touch") takePointer(event);
    },
    { signal: signal.signal },
  );

  root.addEventListener(
    "pointermove",
    (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (!drag.active) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          drag = null;
          return;
        }
        takePointer(event);
      }
      event.preventDefault();
      applyProgress(pointProgress(event.clientX, event.clientY));
      writeSlider();
    },
    { signal: signal.signal, passive: false },
  );

  const endDrag = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (drag.active && root.hasPointerCapture(event.pointerId)) {
      try {
        root.releasePointerCapture(event.pointerId);
      } catch {
        // The pointer was already released.
      }
    }
    drag = null;
  };
  root.addEventListener("pointerup", endDrag, { signal: signal.signal });
  root.addEventListener("pointercancel", endDrag, { signal: signal.signal });

  slider.addEventListener(
    "focus",
    () => {
      writeSlider();
      heldByFocus = true;
      syncPlayback();
    },
    { signal: signal.signal },
  );
  slider.addEventListener(
    "blur",
    () => {
      heldByFocus = false;
      syncPlayback();
    },
    { signal: signal.signal },
  );
  slider.addEventListener(
    "input",
    () => {
      userOwned = true;
      handleT = 0.5;
      applyArea(Number(slider.value) / 100);
      writeSlider();
      syncPlayback();
    },
    { signal: signal.signal },
  );

  motion.addEventListener(
    "change",
    () => {
      reduced = motion.matches;
      syncPlayback();
    },
    { signal: signal.signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      pageVisible = document.visibilityState === "visible";
      syncPlayback();
    },
    { signal: signal.signal },
  );

  const resize = new ResizeObserver(() => {
    const previous = slant;
    measure();
    if (!ready || Math.abs(previous - slant) < 0.05) return;
    painted = "";
    applyArea(area);
  });
  resize.observe(root);

  const view = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    },
    { threshold: 0.02 },
  );
  view.observe(root);

  window.addEventListener("pagehide", () => stop());
  window.addEventListener("pageshow", () => {
    pageVisible = document.visibilityState === "visible";
    syncPlayback();
  });

  void (async () => {
    const images = [...root.querySelectorAll("img")];
    await Promise.all(images.map(decodeImage));
    if (signal.signal.aborted) return;
    if (images.length < 2 || images.some((img) => img.naturalWidth === 0)) return;
    measure();
    ready = true;
    slider.disabled = false;
    handleT = 0.5;
    applyArea(REVEAL_FROM);
    writeSlider();
    root.classList.add("is-ready");
    syncPlayback();
  })();
}

function decodeImage(img: HTMLImageElement) {
  if (img.complete) return img.naturalWidth > 0 ? img.decode().catch(() => undefined) : Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
      if (img.naturalWidth > 0) void img.decode().then(() => resolve(), () => resolve());
      else resolve();
    };
    img.addEventListener("load", done);
    img.addEventListener("error", done);
  });
}
