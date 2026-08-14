/* ════════════════════════════════════════════════════════════
   EDIT THIS BLOCK. Nothing else needs touching.
   ══════════════════════════════════════════════════════════ */
const CONFIG = {
  herName:   "Neha",             // shows on the first screen
  scriptUrl: "PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE",
  secret:    "change-me-to-something-random",   // must match Code.gs
  whatsapp:  "",                 // your number, digits only, incl. country code. "" hides the button
};

/* The three questions. Add/remove/reword freely — the UI is built from this.
   "day" is special: instead of an option grid, it renders a Day/Night choice
   followed by a date picker (see renderWhenPicker() below). Use {{name}}
   in a `sub` string anywhere you want her name dropped in. */
const STEPS = [
  { key: "day", title: "when?", sub: "night works any day of the week, — day needs a weekend", dayNight: true },
  { key: "food", title: "what are we eating?", sub: "be honest, {{name}}", options: [
      { e: "☕", l: "Coffee with mud-cake" },
      { e: "🍝", l: "Pasta" },
      { e: "🍕", l: "Pizza" },
      { e: "🥡", l: "Chinese" },
      { e: "🍜", l: "Thai" },
      { e: "🍚", l: "Fried rice with no sides XD" },
  ]},
  { key: "place", title: "where to?", sub: "or where from, {{name}} — if we're staying in", options: [
      { e: "🌆", l: "Rooftop" },
      { e: "☕", l: "Cozy café" },
  ]},
  { key: "song", title: "will you sing a song for me, {{name}}? 👉👈", sub: "even a little hum counts 🎶", options: [
      { e: "🎤", l: "Yes" },
      { e: "🙅", l: "No", vanish: true },
  ]},
];

/* ════════════════════════════════════════════════════════════
   Below here: the machinery.
   ══════════════════════════════════════════════════════════ */

const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const state = { screen: "intro", step: 0, picks: {} };

/* ── base64 that survives emoji ─────────────────────────── */
const b64e = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const b64d = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

const withName = (s) => s.replace(/\{\{name\}\}/g, CONFIG.herName);

/* ── screens ────────────────────────────────────────────── */
function show(name) {
  state.screen = name;
  $$(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === name));
  window.scrollTo(0, 0);
}

/* ── the four questions ─────────────────────────────────── */
function renderStep() {
  const step = STEPS[state.step];

  $("#step-title").textContent = withName(step.title);
  $("#step-sub").textContent   = withName(step.sub || "");
  $("#back-btn").hidden        = state.step === 0;
  $("#heart-fill").style.clipPath = `inset(${100 - (state.step / STEPS.length) * 100}% 0 0 0)`;

  // Note: .options/.when-picker each set their own `display`, which as an author rule
  // beats the UA's default `[hidden] { display: none }` — so .hidden alone wouldn't
  // hide these (see the same fix on #wa-btn in renderReceipt).
  if (step.dayNight) {
    $("#options").style.display = "none";
    $("#when-picker").style.display = "";
    renderWhenPicker();
  } else {
    $("#when-picker").style.display = "none";
    $("#options").style.display = "";
    renderOptions(step);
  }

  show("step");
}

function renderOptions(step) {
  const box = $("#options");
  box.innerHTML = "";

  step.options.forEach((opt) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.type = "button";
    b.innerHTML = `<span class="e">${opt.e}</span><span class="l"></span>`;
    b.querySelector(".l").textContent = opt.l;

    if (opt.vanish) {
      // this option can't actually be picked. A brief "startled" shake first,
      // THEN the fade — vanishing on the very first touch with no warning at
      // all just reads as broken rather than as a joke.
      let vanished = false;
      const vanish = (e) => {
        if (vanished) return;
        vanished = true;
        e.preventDefault();
        b.classList.add("spooked");
        setTimeout(() => {
          b.classList.remove("spooked");
          b.classList.add("vanish");
          setTimeout(() => { b.style.display = "none"; }, 500);
        }, 350);
      };
      if (matchMedia("(hover: hover)").matches) b.addEventListener("pointerenter", vanish);
      b.addEventListener("pointerdown", vanish);
    } else {
      b.addEventListener("click", () => {
        box.querySelectorAll(".opt").forEach((o) => o.classList.remove("chosen"));
        b.classList.add("chosen");
        choose(step.key, `${opt.e} ${opt.l}`);
      });
    }

    box.appendChild(b);
  });
}

/* the "when" step: Day or Night first, THEN a date — Night allows any day of the
   week, Day is limited to Friday/Saturday/Sunday. Persists across back/forward
   within one ask-flow — only reset when a fresh "yes" starts the flow over. */
let whenPick = { date: "", part: null };

function isWeekend(dateStr) {
  const day = new Date(dateStr + "T12:00:00").getDay();   // 0=Sun, 5=Fri, 6=Sat
  return day === 0 || day === 5 || day === 6;
}

function renderWhenPicker() {
  const input = $("#date-input"), hint = $("#date-hint"), ok = $("#when-ok");
  const dateSection = $("#date-section");

  $$(".when-picker .daynight .opt").forEach((b) => b.classList.toggle("chosen", b.dataset.part === whenPick.part));
  input.value = whenPick.date;

  const validateDate = () => {
    const needsWeekend = whenPick.part === "Day";
    if (input.value && needsWeekend && !isWeekend(input.value)) {
      hint.textContent = "daytime only works on a weekend — Friday, Saturday, or Sunday 🙂";
      hint.hidden = false;
      whenPick.date = "";
    } else {
      hint.hidden = true;
      whenPick.date = input.value;
    }
    ok.disabled = !(whenPick.date && whenPick.part);
  };

  // date section stays hidden until Day/Night is picked — that choice decides
  // which dates are even valid, so asking for a date first doesn't make sense
  dateSection.style.display = whenPick.part ? "" : "none";
  if (whenPick.part) validateDate();
  else ok.disabled = true;

  input.oninput = validateDate;

  $$(".when-picker .daynight .opt").forEach((b) => {
    b.onclick = () => {
      whenPick.part = b.dataset.part;
      $$(".when-picker .daynight .opt").forEach((o) => o.classList.toggle("chosen", o === b));
      dateSection.style.display = "";
      input.focus();
      validateDate();   // re-check any already-entered date against the new part
    };
  });

  ok.onclick = () => {
    const d = new Date(whenPick.date + "T12:00:00");
    const label = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    const emoji = whenPick.part === "Night" ? "🌙" : "🌞";
    choose("day", `📅 ${label} · ${emoji} ${whenPick.part}`);
  };
}

function choose(key, value) {
  state.picks[key] = value;
  setTimeout(() => {
    if (state.step < STEPS.length - 1) {
      state.step++;
      renderStep();
    } else {
      $("#heart-fill").style.clipPath = "inset(0% 0 0 0)";
      finish();
    }
  }, 260);   // let the tap animation land before moving on
}

/* ── the ask ────────────────────────────────────────────── */
// "no" dodges forever — there is no give-up, no fallback screen, no way to land a
// click or a tap on it. Scale is clamped so it stays visible (never shrinks to
// nothing) and legible (never balloons) no matter how many times it's chased.
let dodges = 0, noScale = 1, yesScale = 1, lastDodgeAt = 0;
const NO_SCALE_MIN = 0.55, YES_SCALE_MAX = 1.6;
const DODGE_COOLDOWN = 260;   // ms — one tick past the .22s left/top transition in style.css,
                               // so a single mouse approach can't fire pointerenter more than
                               // once, but a genuinely fast second approach (real chasing)
                               // still registers once the button visibly finishes relocating

let noFloorY = null;   // its own starting height — it's allowed to roam below this, never above

function dodge() {
  const now = performance.now();
  if (now - lastDodgeAt < DODGE_COOLDOWN) return;
  lastDodgeAt = now;

  const no = $("#no-btn"), yes = $("#yes-btn");

  if (!no.classList.contains("loose")) {
    const r = no.getBoundingClientRect();
    no.style.width  = r.width + "px";
    no.style.height = r.height + "px";
    no.style.left   = r.left + "px";
    no.style.top    = r.top + "px";
    // .screen's entrance animation touches `transform`, which makes it a containing block for
    // fixed descendants — left/top would then resolve against the card, not the real viewport,
    // and the button could render somewhere no pointer can ever reach. Escape it onto <body>.
    document.body.appendChild(no);
    no.classList.add("loose");
    noFloorY = r.top;   // never let it dodge above the row it started in — that's where the question is
  }

  dodges++;
  const pad = 14;
  const maxX = Math.max(pad, innerWidth  - no.offsetWidth  - pad);
  const maxY = Math.max(pad, innerHeight - no.offsetHeight - pad);
  const minY = Math.min(noFloorY, maxY);
  no.style.left = pad + Math.random() * (maxX - pad) + "px";
  no.style.top  = minY + Math.random() * (maxY - minY) + "px";

  noScale  = Math.max(noScale  * 0.82, NO_SCALE_MIN);  no.style.transform  = `scale(${noScale})`;
  yesScale = Math.min(yesScale * 1.09, YES_SCALE_MAX); yes.style.transform = `scale(${yesScale})`;
}

function wireAsk() {
  const no = $("#no-btn");
  const flee = (e) => { e.preventDefault(); dodge(); };   // preventDefault: on touch, stops the tap ever landing

  // mouse: run away before they can even click. touch: run away on the press itself.
  if (matchMedia("(hover: hover)").matches) no.addEventListener("pointerenter", flee);
  no.addEventListener("pointerdown", flee);

  $("#yes-btn").addEventListener("click", () => {
    whenPick = { date: "", part: null };
    state.step = 0;
    renderStep();
  });
}

/* ── submit ─────────────────────────────────────────────── */
async function finish() {
  const picks = state.picks;
  renderReceipt(picks);
  show("done");
  confetti();

  if (!CONFIG.scriptUrl.startsWith("http")) {
    $("#done-status").textContent = "not wired up yet — take a screenshot and send me 👇";
    return;
  }

  const body = JSON.stringify({ ...picks, secret: CONFIG.secret });
  let sent = false;

  try {
    // No custom Content-Type → CORS-safelisted → no preflight → we can read the reply.
    const res = await fetch(CONFIG.scriptUrl, { method: "POST", body });
    sent = res.ok;
  } catch {
    try {
      // Blind retry. Response is opaque, but the write still lands.
      await fetch(CONFIG.scriptUrl, { method: "POST", mode: "no-cors", body });
      sent = true;
    } catch { /* offline. the fallback below covers it. */ }
  }

  $("#done-status").textContent = sent
    ? "he knows 💌"
    : "couldn't reach him — tap below and it's sorted";
}

function renderReceipt(picks) {
  const labels = { day: "when", food: "food", place: "where", song: "song?" };

  $("#receipt").innerHTML = "";
  STEPS.forEach((s) => {
    if (!picks[s.key]) return;
    const row = document.createElement("div");
    row.className = "row";
    const k = document.createElement("span"); k.className = "k"; k.textContent = labels[s.key] || s.key;
    const v = document.createElement("span"); v.className = "v"; v.textContent = picks[s.key];
    row.append(k, v);
    $("#receipt").appendChild(row);
  });

  // The fallback: her answer, encoded into a link, ready to send by hand.
  const link = location.origin + location.pathname + "#p=" + encodeURIComponent(b64e(JSON.stringify(picks)));
  const text = "it's a date 🤍\n" +
    STEPS.filter((s) => picks[s.key]).map((s) => `${labels[s.key]}: ${picks[s.key]}`).join("\n") +
    "\n" + link;

  const wa = $("#wa-btn");
  if (CONFIG.whatsapp) {
    wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
    wa.style.display = "";
  } else {
    // Note: `.btn` sets its own `display`, which as an author rule beats the UA's
    // default `[hidden] { display: none }` — so `.hidden = true` alone wouldn't hide this.
    wa.style.display = "none";
  }

  // .onclick (not addEventListener) so a second renderReceipt() call — e.g. she submits,
  // backs up, and resubmits — replaces the handler instead of stacking another one.
  $("#copy-btn").onclick = async () => {
    try { await navigator.clipboard.writeText(text); $("#copy-btn").textContent = "copied ✓"; }
    catch { prompt("copy this:", text); }
  };
}

/* ── read a shared link back ────────────────────────────── */
function fromHash() {
  const m = location.hash.match(/^#p=(.+)$/);
  if (!m) return false;
  try {
    const picks = JSON.parse(b64d(decodeURIComponent(m[1])));
    renderReceipt(picks);
    $("#done-status").textContent = "here's what she picked";
    show("done");
    confetti();
    return true;
  } catch { return false; }
}

/* ── confetti ───────────────────────────────────────────── */
// Runs forever on the done screen, by design — particles that fall past the
// bottom just respawn above the top, so it never stops.
let confettiRunning = false;

function confetti() {
  if (confettiRunning) return;
  confettiRunning = true;

  const c = $("#confetti"), ctx = c.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const colors = ["#ff6b9d", "#ffd166", "#ff8fab", "#c8a2ff", "#8ecae6", "#ffffff"];
  const spawn = (fresh) => ({
    x: Math.random() * innerWidth,
    y: fresh ? -20 - Math.random() * innerHeight * 0.6 : -20 - Math.random() * 40,
    w: 5 + Math.random() * 6,
    vx: -1.2 + Math.random() * 2.4,
    vy: 1.8 + Math.random() * 2.6,
    rot: Math.random() * Math.PI,
    vr: -0.12 + Math.random() * 0.24,
    col: colors[(Math.random() * colors.length) | 0],
  });
  const parts = Array.from({ length: 130 }, () => spawn(true));

  (function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.018; p.rot += p.vr;
      if (p.y > innerHeight + 20) Object.assign(p, spawn(false));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w * 0.55);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  })();
}

/* ── boot ───────────────────────────────────────────────── */
$$(".her-name").forEach((el) => { el.textContent = CONFIG.herName; });

$$("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));
$("#back-btn").addEventListener("click", () => { if (state.step > 0) { state.step--; renderStep(); } });

wireAsk();
if (!fromHash()) show("intro");
