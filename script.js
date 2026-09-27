/* Water Story v33 — shorter touch momentum + concise yearly savings story */

const state = {
  showerMinutes: 2,
  showersPerWeek: 1,
  dishesPerWeek: 1,
  dishMethod: "dishwasher",
  laundryPerWeek: null
};

const showerUI = {
  step: 1,
  transitioning: false,
  duration: { min: 2, max: 30, step: 1 },
  frequency: { min: 1, max: 14, step: 1 }
};

const sinkUI = {
  plateChosen: true,
  methodStepVisible: false,
  methodChosen: true
};

const laundryUI = {
  chosen: false
};

/* Easy pacing controls. Autoplay is intentionally slower than v24. */
const AUTO_STORY_STEP = 1.55;
const FUTURE_STORY_STEP = 2.05;
/* Hidden pin buffer for autoplay chapters. It prevents a fast swipe/wheel from
   skipping across the whole chapter before its input gate can activate. */
const AUTO_GATE_VIEWPORTS = 2.2;

/* v32 calculation assumptions. Keep these centralized so the storytelling numbers
   can be adjusted without hunting through the UI code.
   - 2026 Brabant Water variable tariff: €1.51 / m³.
   - Milieu Centraal: going from 7.4 to 5 min/day saves about €36/year.
     That is roughly €15/year per daily shower-minute avoided.
   - €25 phone plan is an illustrative comparison value, not an average.
   - Spotify Premium Individual NL is €13.99/month (checked Sept 2026). */
const WATER_EUR_PER_M3 = 1.51;
const SHOWER_WARM_WATER_EUR_PER_DAILY_MINUTE_YEAR = 15;
const PHONE_PLAN_EUR = 25;
const SPOTIFY_EUR = 13.99;
const SHOWER_TARGET_MINUTES = 5;

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

if (!window.gsap) {
  document.documentElement.classList.add("gsap-missing");
  throw new Error("GSAP did not load. Check the GSAP CDN script tags in index.html.");
}

const plugins = [window.ScrollTrigger].filter(Boolean);
if (plugins.length) gsap.registerPlugin(...plugins);

const isTouchLike = Boolean(
  window.matchMedia?.("(pointer: coarse)")?.matches ||
  (navigator.maxTouchPoints || 0) > 1
);
let touchNormalizer = null;

let activeTransition = null;
let savingTimeline = null;
let futureTimeline = null;
const showerRainLoops = [];
const moneyRainLoops = [];
const storyState = {
  savingPlayed: false,
  savingBusy: false,
  futurePlayed: false,
  futureBusy: false
};

/* -------------------------------------------------------------------------- */
/* Scroll control                                                              */
/* -------------------------------------------------------------------------- */

const scrollGate = { locked: false };
const blockedKeys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"]);

function blockManualScroll(event) {
  if (!scrollGate.locked) return;

  /* The shower screen itself stays locked, but iOS must be allowed to own the
     native range gesture. Preventing touchmove here was the reason the slider
     could be tapped but not held and dragged on an iPhone. */
  if (event.type === "touchmove" && event.target?.closest?.(".shower-range")) return;

  if (event.type === "keydown") {
    if (!blockedKeys.has(event.key)) return;
    if (event.target?.closest?.("button, input, select, textarea, [role='button']")) return;
  }
  event.preventDefault();
}

window.addEventListener("wheel", blockManualScroll, { passive: false, capture: true });
window.addEventListener("touchmove", blockManualScroll, { passive: false, capture: true });
window.addEventListener("keydown", blockManualScroll, { passive: false, capture: true });

function lockPageScroll() {
  /* Gate only real user input. Programmatic chapter handoffs can still reposition
     the document while the overlay or pinned autoplay stage hides that movement. */
  scrollGate.locked = true;
  touchNormalizer?.disable?.();
  document.documentElement.classList.add("interaction-locked");
  document.body.classList.add("interaction-locked");
}

function unlockPageScroll() {
  scrollGate.locked = false;
  document.documentElement.classList.remove("interaction-locked");
  document.body.classList.remove("interaction-locked");
  if (isTouchLike && !reducedMotion) touchNormalizer?.enable?.();
}

function setupSmoothScrolling() {
  if (!window.ScrollTrigger) return;

  ScrollTrigger.config({
    ignoreMobileResize: true,
    limitCallbacks: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load"
  });

  /* v33: normalize touch scrolling for the whole experience, but keep momentum
     deliberately short. iOS native momentum can carry one flick through several
     pinned chapters before ScrollTrigger has time to settle. This preserves a
     smooth drag while making a flick travel closer to an app-style feed. */
  if (isTouchLike && !reducedMotion && ScrollTrigger.normalizeScroll) {
    touchNormalizer = ScrollTrigger.normalizeScroll({
      type: "touch,pointer",
      allowNestedScroll: true,
      lockAxis: true,
      ignore: ".shower-range, button, input, select, textarea",
      momentum: self => Math.min(0.38, Math.max(0.16, Math.abs(self.velocityY) / 8000))
    });
  }
}

function alignTo(target) {
  const el = typeof target === "string" ? qs(target) : target;
  if (!el) return;

  const y = Math.round(window.scrollY + el.getBoundingClientRect().top);
  window.scrollTo(0, y);
  window.ScrollTrigger?.update();
}

function setGlobalScrollCueVisible(visible, label = null) {
  const cue = qs("#globalScrollHint");
  if (!cue) return;
  if (label) qs("span", cue).textContent = label;
  cue.classList.toggle("is-visible", visible);
  cue.setAttribute("aria-hidden", String(!visible));
  gsap.to(cue, {
    autoAlpha: visible ? 0.86 : 0,
    y: visible ? 0 : 8,
    duration: reducedMotion ? 0 : 0.25,
    ease: "power2.out",
    overwrite: true
  });
}

function runGuidedTransition({ kicker, title, target, lockAfter = true, releaseCue = null }) {
  if (activeTransition?.isActive()) return;

  const overlay = qs("#chapterTransition");
  const water = qs(".chapter-transition-water", overlay);
  const copy = qs(".chapter-transition-copy", overlay);
  if (!overlay || !water || !copy) return;

  qs("#chapterTransitionKicker").textContent = kicker;
  qs("#chapterTransitionTitle").textContent = title;

  lockPageScroll();
  setGlobalScrollCueVisible(false);

  const cleanup = () => {
    gsap.set(overlay, { autoAlpha: 0, visibility: "hidden", pointerEvents: "none", yPercent: 100 });
    gsap.set(water, { yPercent: 0, opacity: 1 });
    gsap.set(copy, { xPercent: -50, yPercent: -50, autoAlpha: 0, y: 14 });

    if (lockAfter) lockPageScroll();
    else unlockPageScroll();

    if (!lockAfter && releaseCue) setGlobalScrollCueVisible(true, releaseCue);
    activeTransition = null;
  };

  /* The WHOLE overlay moves as one panel. While it fully covers the viewport we
     jump to the next chapter underneath it, then slide the panel away. This avoids
     a half-finished blue layer getting stranded over the site. */
  activeTransition = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: cleanup,
    onInterrupt: cleanup
  });

  activeTransition
    .set(overlay, { autoAlpha: 1, visibility: "visible", pointerEvents: "auto", yPercent: 100 })
    .set(water, { yPercent: 0, opacity: 1 })
    .set(copy, { xPercent: -50, yPercent: -50, autoAlpha: 0, y: 14 })
    .to(overlay, {
      yPercent: 0,
      duration: reducedMotion ? 0.01 : 0.32,
      ease: "power4.inOut"
    })
    .to(copy, {
      autoAlpha: 1,
      y: 0,
      duration: reducedMotion ? 0.01 : 0.20,
      ease: "power3.out"
    }, "-=0.10")
    .to({}, { duration: reducedMotion ? 0 : 0.34 })
    .call(() => {
      alignTo(target);
      window.ScrollTrigger?.update();
    })
    .to({}, { duration: reducedMotion ? 0 : 0.08 })
    .to(copy, {
      autoAlpha: 0,
      y: -12,
      duration: reducedMotion ? 0.01 : 0.12,
      ease: "power2.in"
    })
    .to(overlay, {
      yPercent: -100,
      duration: reducedMotion ? 0.01 : 0.32,
      ease: "power4.inOut"
    }, "-=0.04");
}

/* -------------------------------------------------------------------------- */
/* Reusable motion helpers                                                     */
/* -------------------------------------------------------------------------- */

function selectInGroup(container, button) {
  qsa("button", container).forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  gsap.fromTo(button, { scale: 0.96 }, { scale: 1, duration: 0.32, ease: "back.out(2)" });

  if (container.id === "dishFrequency") {
    qsa(".plate", container).forEach(plate => {
      plate.querySelector(".plate-fill")?.setAttribute("fill", plate.classList.contains("active") ? "#c9ff38" : "#f8f4ed");
    });
  }
}

function splitWords(element) {
  if (!element || element.dataset.gsapSplit === "true") return qsa(".gsap-word", element);
  const walk = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.nodeValue;
        if (!text?.trim()) return;
        const frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.append(document.createTextNode(part));
          else {
            const wrap = document.createElement("span");
            wrap.className = "gsap-word-wrap";
            const word = document.createElement("span");
            word.className = "gsap-word";
            word.textContent = part;
            wrap.append(word);
            frag.append(wrap);
          }
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") walk(child);
    });
  };
  walk(element);
  element.dataset.gsapSplit = "true";
  return qsa(".gsap-word", element);
}

function animateWordsIn(words, timeline, at = 0) {
  if (!words.length) return;
  timeline.fromTo(words,
    { yPercent: 120, rotate: 2, opacity: 0 },
    { yPercent: 0, rotate: 0, opacity: 1, duration: reducedMotion ? 0.01 : 0.48, stagger: reducedMotion ? 0 : 0.03, ease: "power3.out" },
    at
  );
}

function animateWordsOut(words, timeline, at) {
  if (!words.length) return;
  timeline.to(words, {
    yPercent: -115,
    rotate: -1.5,
    opacity: 0,
    duration: reducedMotion ? 0.01 : 0.3,
    stagger: reducedMotion ? 0 : 0.018,
    ease: "power2.in"
  }, at);
}

/* -------------------------------------------------------------------------- */
/* Decorative builds                                                          */
/* -------------------------------------------------------------------------- */

function buildNewShowerRain() {
  const container = qs("#newShowerRain");
  if (!container) return;
  container.innerHTML = "";
  const lanes = [8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 86, 92];
  for (let i = 0; i < 48; i++) {
    const line = document.createElement("i");
    line.className = "water-line";
    const lane = lanes[i % lanes.length];
    line.style.left = `${lane + (Math.random() * 1.4 - 0.7)}%`;
    line.style.setProperty("--drop-width", `${1.5 + Math.random() * 0.8}px`);
    line.style.setProperty("--length", `${52 + Math.random() * 62}px`);
    line.style.setProperty("--speed", `${0.9 + Math.random() * 0.45}s`);
    line.style.setProperty("--alpha", `${0.34 + Math.random() * 0.42}`);
    container.appendChild(line);
  }
}

function updateShowerRainIntensity() {
  const lines = qsa("#newShowerRain .water-line");
  if (!lines.length) return;

  const durationProgress = clamp(
    (state.showerMinutes - showerUI.duration.min) /
      (showerUI.duration.max - showerUI.duration.min)
  );
  const frequencyProgress = clamp(
    (state.showersPerWeek - showerUI.frequency.min) /
      (showerUI.frequency.max - showerUI.frequency.min)
  );

  /* Minutes build roughly the first 60% of the shower density. Question two then
     adds the remaining density, so moving either answer upward always adds water
     instead of the rain becoming weaker when the question changes. */
  const intensity = clamp(0.18 + durationProgress * 0.42 + frequencyProgress * 0.40);
  const visibleCount = Math.round(7 + intensity * (lines.length - 7));

  lines.forEach((line, index) => {
    line.style.visibility = index < visibleCount ? "visible" : "hidden";
  });

  const rain = qs("#newShowerRain");
  if (rain) rain.style.setProperty("--rain-intensity", intensity.toFixed(3));
}

function buildFlyingGlasses() {
  const container = qs("#flyingGlasses");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < 42; i++) {
    const glass = document.createElement("i");
    glass.className = "fly-glass";
    glass.dataset.x = (Math.random() * 88 + 4).toFixed(2);
    glass.dataset.y = (Math.random() * 88 + 4).toFixed(2);
    glass.dataset.r = (Math.random() * 80 - 40).toFixed(2);
    container.appendChild(glass);
  }
}

function buildMoneyRain() {
  const container = qs("#moneyRain");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < 28; i++) {
    const euro = document.createElement("i");
    euro.className = "euro";
    euro.textContent = "€";
    euro.style.left = `${Math.random() * 92}%`;
    euro.style.fontSize = `${24 + Math.random() * 34}px`;
    container.appendChild(euro);
    const duration = 2.7 + Math.random() * 3.4;
    const loop = gsap.fromTo(euro,
      { y: "-12svh", rotate: -5 + Math.random() * 10 },
      { y: "128svh", rotate: 8 + Math.random() * 14, duration, delay: -Math.random() * duration, repeat: -1, ease: "none" }
    );
    loop.pause();
    moneyRainLoops.push(loop);
  }
}

function setupLoopingDecorations() {
  qsa("#newShowerRain .water-line").forEach((line, index) => {
    const alpha = Number(line.style.getPropertyValue("--alpha")) || 0.62;
    const speed = Number.parseFloat(line.style.getPropertyValue("--speed")) || 1.05;
    const delay = -(index % 15) * 0.07;
    const tl = gsap.timeline({ repeat: -1, delay });
    showerRainLoops.push(tl);
    tl.set(line, { y: 0, opacity: 0 })
      .to(line, { opacity: alpha, duration: speed * 0.12, ease: "none" })
      .to(line, { y: 215, duration: speed * 0.74, ease: "none" }, "<")
      .to(line, { y: 248, opacity: 0, duration: speed * 0.14, ease: "none" });
  });

  [qs("#basinWater"), qs("#washerWater")].filter(Boolean).forEach((water, i) => {
    gsap.to(water, { y: 2, backgroundPositionY: 18, duration: 3.8 + i * 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
  });

  const cueArrow = qs("#globalScrollHint i");
  if (cueArrow) gsap.to(cueArrow, { y: 4, duration: 1.35, yoyo: true, repeat: -1, ease: "sine.inOut" });
}

/* -------------------------------------------------------------------------- */
/* Shower — touch-first range/stepper, knobs are visual feedback only          */
/* -------------------------------------------------------------------------- */

function showerConfig() {
  return showerUI.step === 1 ? showerUI.duration : showerUI.frequency;
}

function currentShowerAnswer() {
  return showerUI.step === 1 ? state.showerMinutes : state.showersPerWeek;
}

function dialAngleForValue(value, config) {
  const p = clamp((Number(value) - config.min) / (config.max - config.min));
  return -118 + 236 * p;
}

function setDialVisual(dialId, value, config, valueId, formatter) {
  const dial = qs(`#${dialId}`);
  const valueEl = qs(`#${valueId}`);
  if (!dial || !valueEl) return;
  valueEl.innerHTML = formatter(value);
  gsap.to(dial, { "--dial-angle": `${dialAngleForValue(value, config)}deg`, duration: reducedMotion ? 0.01 : 0.36, ease: "power3.out", overwrite: true });
  gsap.fromTo(qs(".dial-knob", dial), { scale: 0.97 }, { scale: 1, duration: reducedMotion ? 0.01 : 0.28, ease: "back.out(1.8)" });
}

function setDialActive(dial, active) {
  if (!dial) return;
  dial.classList.toggle("is-active", active);
  dial.classList.toggle("is-inactive", !active);
  gsap.to(dial, { opacity: active ? 1 : 0.3, scale: active ? 1 : 0.95, filter: active ? "grayscale(0)" : "grayscale(.65)", duration: reducedMotion ? 0.01 : 0.26, ease: "power2.out", overwrite: true });
}

function updateShowerValue(value) {
  const config = showerConfig();
  value = Math.round(clamp(Number(value), config.min, config.max));
  if (showerUI.step === 1) {
    state.showerMinutes = value;
    setDialVisual("timeDial", value, config, "timeValue", v => `${v}<span> min</span>`);
  } else {
    state.showersPerWeek = value;
    setDialVisual("flowDial", value, config, "flowValue", v => `${v}<span>× / week</span>`);
  }

  const range = qs("#showerAnswerOptions input[type='range']");
  const readout = qs("#showerAnswerOptions .stepper-readout strong");
  if (range) range.value = String(value);
  if (readout) readout.textContent = showerUI.step === 1 ? `${value} MIN` : `${value}× / WEEK`;
  updateShowerRainIntensity();
  updateEstimate();
}

function renderShowerAnswerControl() {
  const group = qs("#showerAnswerOptions");
  if (!group) return;
  const config = showerConfig();
  const value = currentShowerAnswer();
  const unit = showerUI.step === 1 ? "MIN" : "× / WEEK";
  const minText = showerUI.step === 1 ? `${config.min} min` : `${config.min}×`;
  const maxText = showerUI.step === 1 ? `${config.max} min` : `${config.max}×`;

  group.innerHTML = `
    <div class="shower-stepper">
      <div class="stepper-row">
        <button class="stepper-button stepper-minus" type="button" aria-label="Decrease answer">−</button>
        <div class="stepper-readout" aria-live="polite"><strong>${value} ${unit}</strong><span>tap − / + or slide</span></div>
        <button class="stepper-button stepper-plus" type="button" aria-label="Increase answer">+</button>
      </div>
      <input class="shower-range" type="range" min="${config.min}" max="${config.max}" step="${config.step}" value="${value}" aria-label="${showerUI.step === 1 ? "Shower duration in minutes" : "Showers per week"}" />
      <div class="range-ends"><span>${minText}</span><span>${maxText}</span></div>
    </div>`;

  const range = qs("input[type='range']", group);
  range.addEventListener("input", () => updateShowerValue(range.value));
  range.addEventListener("change", () => updateShowerValue(range.value));

  /* iOS fallback: explicitly translate the finger position into a range value.
     This keeps the control draggable even on Safari versions where a native range
     inside a globally scroll-gated page only reacts to taps. */
  let activePointer = null;
  const updateRangeFromPointer = event => {
    const rect = range.getBoundingClientRect();
    if (!rect.width) return;
    const progress = clamp((event.clientX - rect.left) / rect.width);
    const raw = config.min + progress * (config.max - config.min);
    const stepped = Math.round((raw - config.min) / config.step) * config.step + config.min;
    updateShowerValue(clamp(stepped, config.min, config.max));
  };
  range.addEventListener("pointerdown", event => {
    activePointer = event.pointerId;
    range.setPointerCapture?.(event.pointerId);
    updateRangeFromPointer(event);
  });
  range.addEventListener("pointermove", event => {
    if (activePointer !== event.pointerId) return;
    event.preventDefault();
    updateRangeFromPointer(event);
  });
  const finishRangeDrag = event => {
    if (activePointer !== event.pointerId) return;
    range.releasePointerCapture?.(event.pointerId);
    activePointer = null;
  };
  range.addEventListener("pointerup", finishRangeDrag);
  range.addEventListener("pointercancel", finishRangeDrag);

  range.addEventListener("touchstart", event => event.stopPropagation(), { passive: true });
  range.addEventListener("touchmove", event => event.stopPropagation(), { passive: true });
  qs(".stepper-minus", group).addEventListener("click", () => updateShowerValue(Number(range.value) - config.step));
  qs(".stepper-plus", group).addEventListener("click", () => updateShowerValue(Number(range.value) + config.step));

  gsap.fromTo(qs(".shower-stepper", group), { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: reducedMotion ? 0.01 : 0.3, ease: "power2.out" });
}

function setShowerStep(step) {
  showerUI.step = step;
  const timeDial = qs("#timeDial");
  const flowDial = qs("#flowDial");
  const label = qs("#activeControlLabel");
  const question = qs("#showerQuestion");
  const helper = qs("#showerHelper");
  const nextText = qs("#showerNextText");

  if (step === 1) {
    setDialActive(timeDial, true);
    setDialActive(flowDial, false);
    question.textContent = "How long is your usual shower?";
    helper.textContent = "Use the slider or the − / + buttons.";
    nextText.textContent = "NEXT QUESTION";
    qs("#flowValue").textContent = "—";
    setDialVisual("timeDial", state.showerMinutes, showerUI.duration, "timeValue", v => `${v}<span> min</span>`);
  } else {
    setDialActive(timeDial, false);
    setDialActive(flowDial, true);
    question.textContent = "How many times a week do you shower?";
    helper.textContent = "Use the slider or the − / + buttons.";
    nextText.textContent = "NEXT: THE SINK";
    setDialVisual("flowDial", state.showersPerWeek, showerUI.frequency, "flowValue", v => `${v}<span>× / week</span>`);
  }

  renderShowerAnswerControl();
  qs("#showerNext").disabled = false;
  qs("#showerNext").setAttribute("aria-disabled", "false");
}

function advanceShowerToQuestionTwo() {
  if (showerUI.transitioning || showerUI.step !== 1) return;
  showerUI.transitioning = true;
  const block = qs("#showerQuestionBlock");
  gsap.timeline({ onComplete: () => { showerUI.transitioning = false; } })
    .to(block, { y: -10, opacity: 0, duration: reducedMotion ? 0.01 : 0.18, ease: "power2.in" })
    .call(() => setShowerStep(2))
    .set(block, { y: 14, opacity: 0 })
    .to(block, { y: 0, opacity: 1, duration: reducedMotion ? 0.01 : 0.32, ease: "power3.out" });
}

function bindShower() {
  qs("#showerNext").addEventListener("click", () => {
    if (showerUI.step === 1) return advanceShowerToQuestionTwo();
    runGuidedTransition({ kicker: "ROUTINE SAVED", title: "NEXT: THE SINK", target: "#sinkChapter", lockAfter: true });
  });
}

/* -------------------------------------------------------------------------- */
/* Sink + laundry                                                              */
/* -------------------------------------------------------------------------- */

function setSinkNextVisible(visible, text = null) {
  const next = qs("#sinkNext");
  if (text) qs("span", next).textContent = text;
  next.setAttribute("aria-hidden", String(!visible));
  next.tabIndex = visible ? 0 : -1;
  next.style.pointerEvents = visible ? "auto" : "none";
  gsap.to(next, { autoAlpha: visible ? 1 : 0, y: visible ? 0 : 12, duration: reducedMotion ? 0.01 : 0.25, ease: "power3.out", overwrite: true });
}

function showDishMethodStep() {
  if (sinkUI.methodStepVisible) return;
  sinkUI.methodStepVisible = true;
  sinkUI.methodChosen = true; // first option is the default
  setSinkNextVisible(false);

  const method = qs("#dishMethod");
  const first = qs(".method-plate", method);
  if (first) selectInGroup(method, first);
  state.dishMethod = first?.dataset.value || "dishwasher";
  updateSink();
  updateEstimate();

  const panel = qs("#dishMethodPanel");
  const copy = qs(".kitchen-room .sink-copy");
  const scene = qs(".kitchen-room .sink-scene");
  panel.classList.add("is-visible");
  panel.setAttribute("aria-hidden", "false");
  qs(".kitchen-room").classList.add("is-method-step");

  gsap.timeline({ onComplete: () => setSinkNextVisible(true, "NEXT: LAUNDRY") })
    .to([copy, scene], { filter: "blur(2.2px) brightness(0.72)", opacity: 0.58, duration: reducedMotion ? 0.01 : 0.26, ease: "power2.out" }, 0)
    .fromTo(panel, { autoAlpha: 0, y: 36, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: reducedMotion ? 0.01 : 0.4, ease: "power3.out" }, 0.03);
}

function bindPlates() {
  const group = qs("#dishFrequency");
  qsa(".plate", group).forEach(btn => {
    btn.addEventListener("click", () => {
      selectInGroup(group, btn);
      state.dishesPerWeek = Number(btn.dataset.value);
      sinkUI.plateChosen = true;
      updateSink();
      updateEstimate();
    });
  });

  qs("#sinkNext").addEventListener("click", () => {
    if (!sinkUI.methodStepVisible) return showDishMethodStep();
    runGuidedTransition({
      kicker: "DISHES SAVED",
      title: "NEXT: LAUNDRY",
      target: "#laundryChapter",
      lockAfter: true
    });
  });

  const method = qs("#dishMethod");
  qsa(".method-plate", method).forEach(btn => {
    btn.addEventListener("click", () => {
      selectInGroup(method, btn);
      state.dishMethod = btn.dataset.value;
      sinkUI.methodChosen = true;
      updateSink();
      updateEstimate();
    });
  });
}

function bindLaundry() {
  const group = qs("#laundryButtons");
  const room = qs(".laundry-room");
  const hint = qs("#laundryAnswerHint");

  qsa("button[data-value]", group).forEach(btn => {
    btn.addEventListener("click", () => {
      selectInGroup(group, btn);
      state.laundryPerWeek = Number(btn.dataset.value);
      laundryUI.chosen = true;
      room?.classList.add("has-answer");
      hint?.setAttribute("aria-hidden", "true");
      if (hint) gsap.to(hint, { autoAlpha: 0, y: -5, duration: reducedMotion ? 0.01 : 0.22, overwrite: true });
      updateLaundry();
      updateEstimate();

      /* The laundry chapter is a required answer. Only after the user deliberately
         chooses one of the circles do we give scrolling back to the pinned story. */
      unlockPageScroll();
      const laundryPin = ScrollTrigger.getById?.("laundry-pin");
      if (laundryPin?.isActive) activateHeldTouch(laundryPin);
      setGlobalScrollCueVisible(true, "SCROLL TO RUN THE WASH");
    });
  });
}

function updateSink() {
  const water = qs("#basinWater");
  if (!water) return;
  const frequencyFactor = clamp(state.dishesPerWeek / 7, 0.14, 1);
  const methodFactor = { dishwasher: 0.34, basin: 0.64, running: 1 }[state.dishMethod];
  const height = 12 + 58 * frequencyFactor * methodFactor;
  gsap.to(water, { height: `${height}%`, duration: reducedMotion ? 0.01 : 0.55, ease: "power3.out", overwrite: "auto" });
}

function updateLaundry() {
  const water = qs("#washerWater");
  const laundryValue = Number(state.laundryPerWeek) || 0;
  const height = 18 + clamp(laundryValue / 4, 0, 1) * 54;
  gsap.to(water, { height: `${height}%`, duration: reducedMotion ? 0.01 : 0.58, ease: "power3.out", overwrite: "auto" });
}

/* -------------------------------------------------------------------------- */
/* Estimate                                                                    */
/* -------------------------------------------------------------------------- */

function estimateBreakdown(snapshot = state) {
  const showerMinutesPerDay = (Number(snapshot.showerMinutes) * Number(snapshot.showersPerWeek)) / 7;
  const shower = showerMinutesPerDay * 8;
  const dishPerSession = { dishwasher: 10, basin: 18, running: 34 }[snapshot.dishMethod] ?? 18;
  const dishes = (dishPerSession * Number(snapshot.dishesPerWeek)) / 7;
  const laundry = (50 * (Number(snapshot.laundryPerWeek) || 0)) / 7;
  const base = 28;
  return {
    showerMinutesPerDay,
    shower,
    dishes,
    laundry,
    base,
    total: shower + dishes + laundry + base
  };
}

function estimateDailyLitres() {
  return Math.round(estimateBreakdown(state).total);
}

function estimateMonthlyRoutineCost(snapshot = state) {
  const usage = estimateBreakdown(snapshot);
  /* The Milieu Centraal shower benchmark already represents warm-water cost, so
     only non-shower litres get the separate drinking-water tariff here. */
  const nonShowerDailyLitres = Math.max(0, usage.total - usage.shower);
  const nonShowerWaterAnnual = (nonShowerDailyLitres * 365 / 1000) * WATER_EUR_PER_M3;
  const showerWarmWaterAnnual = usage.showerMinutesPerDay * SHOWER_WARM_WATER_EUR_PER_DAILY_MINUTE_YEAR;
  return (nonShowerWaterAnnual + showerWarmWaterAnnual) / 12;
}

function estimateSavingScenario() {
  const current = { ...state };
  const improved = { ...state };

  improved.showerMinutes = Math.min(Number(current.showerMinutes), SHOWER_TARGET_MINUTES);
  if (current.dishMethod === "running") improved.dishMethod = "basin";
  /* We only model fewer laundry cycles for the highest-frequency answer. We do
     not assume that someone doing 1–3 loads can safely wash less. */
  if ((Number(current.laundryPerWeek) || 0) >= 4) improved.laundryPerWeek = 3;

  const currentBreakdown = estimateBreakdown(current);
  const improvedBreakdown = estimateBreakdown(improved);
  const monthlyCurrent = estimateMonthlyRoutineCost(current);
  const monthlyImproved = estimateMonthlyRoutineCost(improved);
  const monthlySaving = Math.max(0, monthlyCurrent - monthlyImproved);
  const annualSaving = monthlySaving * 12;
  const annualLitresSaved = Math.max(0, (currentBreakdown.total - improvedBreakdown.total) * 365);

  return { monthlyCurrent, monthlySaving, annualSaving, annualLitresSaved, improved };
}

function formatCompactNumber(value, digits = 1) {
  const rounded = Number(value.toFixed(digits));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
}

function updatePersonalizedStory() {
  const saving = estimateSavingScenario();
  const annual = Math.max(0, saving.annualSaving);
  const annualRounded = Math.round(annual);
  const phoneMonths = Math.max(0, Math.round(annual / PHONE_PLAN_EUR));
  const spotifyMonths = Math.max(0, Math.round(annual / SPOTIFY_EUR));

  const yearLine = qs("#savingYearLine");
  const waterLine = qs("#savingYearWaterLine");
  const phoneMonthsEl = qs("#phonePlanMonths");
  const spotifyMonthsEl = qs("#spotifyMonths");

  if (yearLine) {
    yearLine.textContent = annualRounded >= 1
      ? `YOU COULD SAVE ABOUT €${annualRounded} A YEAR`
      : "YOUR ROUTINE IS ALREADY CLOSE TO OUR SAVING TARGET";
  }
  if (waterLine) {
    const litres = Math.round(saving.annualLitresSaved);
    waterLine.textContent = litres > 0
      ? `${litres.toLocaleString("en-US")} LITRES LESS WATER A YEAR`
      : "KEEP THESE WATER-SAVING HABITS GOING";
  }
  if (phoneMonthsEl) phoneMonthsEl.textContent = phoneMonths > 0 ? `${phoneMonths} MONTH${phoneMonths === 1 ? "" : "S"}` : "< 1 MONTH";
  if (spotifyMonthsEl) spotifyMonthsEl.textContent = spotifyMonths > 0 ? `${spotifyMonths} MONTH${spotifyMonths === 1 ? "" : "S"}` : "< 1 MONTH";
}

function updatePersonalizedTips() {
  const showerTitle = qs("#tipShowerTitle");
  const showerCopy = qs("#tipShowerCopy");
  const dishesTitle = qs("#tipDishesTitle");
  const dishesCopy = qs("#tipDishesCopy");
  const laundryTitle = qs("#tipLaundryTitle");
  const laundryCopy = qs("#tipLaundryCopy");

  const minutes = Number(state.showerMinutes);
  if (minutes > SHOWER_TARGET_MINUTES) {
    const difference = minutes - SHOWER_TARGET_MINUTES;
    if (showerTitle) showerTitle.innerHTML = "AIM FOR A<br />5 MIN SHOWER";
    if (showerCopy) showerCopy.textContent = `That is ${difference} minute${difference === 1 ? "" : "s"} shorter than your answer. Shorter showers save warm water and energy.`;
  } else {
    if (showerTitle) showerTitle.innerHTML = "KEEP IT AROUND<br />5 MINUTES";
    if (showerCopy) showerCopy.textContent = "You are already at or below the 5-minute recommendation.";
  }

  if (state.dishMethod === "running") {
    if (dishesTitle) dishesTitle.innerHTML = "STOP THE<br />RUNNING TAP";
    if (dishesCopy) dishesCopy.textContent = "For hand washing, use a filled sink or basin instead of leaving warm water running.";
  } else if (state.dishMethod === "dishwasher") {
    if (dishesTitle) dishesTitle.innerHTML = "RUN IT FULL<br />+ USE ECO";
    if (dishesCopy) dishesCopy.textContent = "Only run the dishwasher when it is full and choose the eco programme.";
  } else {
    if (dishesTitle) dishesTitle.innerHTML = "KEEP USING A<br />FILLED SINK";
    if (dishesCopy) dishesCopy.textContent = "A basin avoids the extra warm water used by washing under a running tap.";
  }

  const laundry = Number(state.laundryPerWeek) || 0;
  if (laundry >= 4) {
    if (laundryTitle) laundryTitle.innerHTML = "COMBINE LOADS<br />WHEN YOU CAN";
    if (laundryCopy) laundryCopy.textContent = "A typical washing-machine cycle uses about 50 litres. Full loads can mean fewer cycles.";
  } else {
    if (laundryTitle) laundryTitle.innerHTML = "WASH FULL<br />AND USE ECO";
    if (laundryCopy) laundryCopy.textContent = "A typical washing-machine cycle uses about 50 litres. Full loads and eco avoid unnecessary use.";
  }
}

function updateResultNumberFill(progress) {
  const value = qs("#personalLitres");
  if (!value) return;
  const fill = Math.round(clamp(progress) * 100);
  value.style.setProperty("--litre-fill", `${fill}%`);
}

function updateEstimate() {
  const litres = estimateDailyLitres();
  qs("#personalLitres").textContent = litres;
  qs("#glassCount").textContent = Math.round(litres / 0.2);

  const saving = estimateSavingScenario();
  const currentCost = Math.max(1, Math.round(saving.monthlyCurrent));
  qs("#monthlyCostLine").innerHTML = `€${currentCost}<br>A MONTH`;

  const comparison = qs("#resultComparison");
  if (comparison) {
    const userPos = clamp(litres / 220, 0, 1) * 100;
    const avgPos = clamp(118 / 220, 0, 1) * 100;
    comparison.style.setProperty("--user-position", `${userPos}%`);
    comparison.style.setProperty("--avg-position", `${avgPos}%`);
    qs("#resultYouLabel").textContent = `${litres} L / DAY`;
    gsap.set(qs(".user-fill", comparison), { width: `${userPos}%` });
  }

  updatePersonalizedStory();
  updatePersonalizedTips();
}

/* -------------------------------------------------------------------------- */
/* Locked automatic stories                                                    */
/* -------------------------------------------------------------------------- */

function updateStoryDots(root, activeIndex, progress = 0) {
  qsa("i", root).forEach((dot, index) => {
    dot.classList.toggle("is-done", index < activeIndex);
    dot.classList.toggle("is-active", index === activeIndex);
    dot.style.setProperty("--dot-progress", index === activeIndex ? progress : 0);
  });
}

function buildAutoStoryTimeline({ slides, progressRoot, stepDuration, onComplete }) {
  slides.forEach(slide => {
    const line = qs(".saving-main-line, .future-headline strong, .future-comparison-figure figcaption", slide);
    if (line) splitWords(line);
  });

  const tl = gsap.timeline({ paused: true, onComplete });
  slides.forEach((slide, index) => {
    const start = index * stepDuration;
    const words = qsa(".gsap-word", slide);
    const media = qsa(".saving-face, .saving-comparison-grid, .future-reference-image", slide);

    tl.set(slide, { autoAlpha: 1, visibility: "visible" }, start);
    animateWordsIn(words, tl, start + 0.03);
    if (media.length) {
      tl.fromTo(media,
        { y: 28, scale: 0.92, rotate: index % 2 ? 1.2 : -1.2, opacity: 0, clipPath: "inset(10% 0 10% 0 round 18px)" },
        { y: 0, scale: 1, rotate: 0, opacity: 1, clipPath: "inset(0% 0 0% 0 round 18px)", duration: reducedMotion ? 0.01 : 0.56, stagger: reducedMotion ? 0 : 0.05, ease: "power3.out" },
        start + 0.05
      );
    }

    if (progressRoot) {
      tl.call(() => updateStoryDots(progressRoot, index, 0), null, start);
      const dot = qsa("i", progressRoot)[index];
      if (dot) tl.fromTo(dot, { "--dot-progress": 0 }, { "--dot-progress": 1, duration: stepDuration * 0.9, ease: "none" }, start);
    }

    if (index < slides.length - 1) {
      const outAt = start + stepDuration * 0.76;
      animateWordsOut(words, tl, outAt);
      if (media.length) tl.to(media, { y: -12, scale: 0.97, opacity: 0, duration: reducedMotion ? 0.01 : 0.3, ease: "power2.in" }, outAt);
      tl.set(slide, { autoAlpha: 0, visibility: "hidden" }, start + stepDuration - 0.02);
    }
  });
  return tl;
}

function showStoryReleaseCue(selector, show) {
  const cue = qs(selector);
  if (!cue) return;
  cue.setAttribute("aria-hidden", String(!show));
  gsap.to(cue, { autoAlpha: show ? 1 : 0, y: show ? 0 : 10, duration: reducedMotion ? 0.01 : 0.34, ease: "power3.out", overwrite: true });
}

function settleAutoplayGate(gateTrigger) {
  if (!gateTrigger) return;

  /* Keep the visual completely pinned while moving the document to the final
     couple of pixels of the hidden buffer. The user sees no jump, but the very
     next deliberate scroll releases the chapter instead of requiring an extra
     viewport of "dead" scrolling. */
  const releaseY = Math.max(gateTrigger.start + 1, gateTrigger.end - 2);
  window.scrollTo(0, Math.round(releaseY));
  ScrollTrigger.update();
}

function playLockedStory({ slides, progress, stepDuration, kind, releaseCue, gateTrigger }) {
  const isSaving = kind === "saving";
  const playedKey = isSaving ? "savingPlayed" : "futurePlayed";
  const busyKey = isSaving ? "savingBusy" : "futureBusy";
  if (storyState[playedKey] || storyState[busyKey]) return;

  storyState[busyKey] = true;
  lockPageScroll();
  setGlobalScrollCueVisible(false);
  showStoryReleaseCue(releaseCue, false);
  gsap.set(slides, { autoAlpha: 0, visibility: "hidden" });
  gsap.set(slides[0], { autoAlpha: 1, visibility: "visible" });
  updateStoryDots(progress, 0, 0);

  const onComplete = () => {
    storyState[playedKey] = true;
    storyState[busyKey] = false;
    updateStoryDots(progress, slides.length, 1);

    /* Do this before unlocking input. The section is still pinned, so moving
       through its safety buffer is visually invisible. */
    settleAutoplayGate(gateTrigger);
    showStoryReleaseCue(releaseCue, true);
    unlockPageScroll();
  };

  const tl = buildAutoStoryTimeline({ slides, progressRoot: progress, stepDuration, onComplete });
  if (isSaving) savingTimeline = tl;
  else futureTimeline = tl;
  tl.play(0);
}

function setupAutomaticStories() {
  const saving = qs("#savingChapter");
  const savingSlides = qsa(".saving-auto-slide", saving);
  const savingProgress = qs(".saving-auto-progress", saving);
  gsap.set(savingSlides, { autoAlpha: 0, visibility: "hidden" });
  gsap.set(savingSlides[0], { autoAlpha: 1, visibility: "visible" });
  showStoryReleaseCue("#savingReleaseCue", false);

  let savingGate;
  savingGate = ScrollTrigger.create({
    id: "saving-autoplay-gate",
    trigger: saving,
    start: "top top",
    end: pinDistance(AUTO_GATE_VIEWPORTS),
    pin: true,
    pinSpacing: true,
    anticipatePin: 0,
    invalidateOnRefresh: true,
    refreshPriority: 60,
    onEnter: self => { activateHeldTouch(self); playLockedStory({
      slides: savingSlides,
      progress: savingProgress,
      stepDuration: AUTO_STORY_STEP,
      kind: "saving",
      releaseCue: "#savingReleaseCue",
      gateTrigger: savingGate
    }); },
    onEnterBack: () => {
      if (storyState.savingPlayed) showStoryReleaseCue("#savingReleaseCue", true);
    }
  });

  const future = qs("#futureAutoStage");
  const futureSlides = qsa(".future-auto-slide", future);
  const futureProgress = qs(".future-auto-progress", future);
  gsap.set(futureSlides, { autoAlpha: 0, visibility: "hidden" });
  gsap.set(futureSlides[0], { autoAlpha: 1, visibility: "visible" });
  showStoryReleaseCue("#futureReleaseCue", false);

  let futureGate;
  futureGate = ScrollTrigger.create({
    id: "future-autoplay-gate",
    trigger: future,
    start: "top top",
    end: pinDistance(AUTO_GATE_VIEWPORTS),
    pin: true,
    pinSpacing: true,
    anticipatePin: 0,
    invalidateOnRefresh: true,
    refreshPriority: 40,
    onEnter: self => { activateHeldTouch(self); playLockedStory({
      slides: futureSlides,
      progress: futureProgress,
      stepDuration: FUTURE_STORY_STEP,
      kind: "future",
      releaseCue: "#futureReleaseCue",
      gateTrigger: futureGate
    }); },
    onEnterBack: () => {
      if (storyState.futurePlayed) showStoryReleaseCue("#futureReleaseCue", true);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Held scroll stages — viewport stays put while scroll advances the story     */
/* -------------------------------------------------------------------------- */

function activateHeldTouch(self) {
  if (!isTouchLike || !touchNormalizer || scrollGate.locked) return;
  /* The global normalizer already keeps iOS momentum short and synchronized.
     Do not force-scroll to self.start here; pinning begins only at `top top`, so
     the previous chapter cannot be visible when the held stage becomes active. */
  touchNormalizer.enable?.();
}

function deactivateHeldTouch() {
  /* Keep the same normalized, short-momentum scroll between chapters. Disabling
     it on release allows the remainder of an iOS flick to shoot through sections. */
}

function stageCue(self, activeLabel, releaseLabel) {
  setGlobalScrollCueVisible(true, self.progress > 0.88 ? releaseLabel : activeLabel);
}

function pinDistance(multiplier) {
  return () => `+=${Math.max(320, Math.round(window.innerHeight * multiplier))}`;
}

function setupHeldStages() {
  if (!window.ScrollTrigger) return;

  const toggleLoops = (loops, playing) => loops.forEach(loop => playing ? loop.play() : loop.pause());
  ScrollTrigger.create({ trigger: "#showerStart", start: "top bottom", end: "bottom top", onEnter: () => toggleLoops(showerRainLoops, true), onEnterBack: () => toggleLoops(showerRainLoops, true), onLeave: () => toggleLoops(showerRainLoops, false), onLeaveBack: () => toggleLoops(showerRainLoops, false) });
  ScrollTrigger.create({ trigger: "#moneyChapter", start: "top bottom", end: "bottom top", onEnter: () => toggleLoops(moneyRainLoops, true), onEnterBack: () => toggleLoops(moneyRainLoops, true), onLeave: () => toggleLoops(moneyRainLoops, false), onLeaveBack: () => toggleLoops(moneyRainLoops, false) });

  /* Pin the CHAPTER itself. ScrollTrigger then creates exactly the scroll space
     the animation needs, instead of us faking it with 185svh sections. */

  ScrollTrigger.create({
    id: "laundry-answer-gate",
    trigger: "#laundryChapter",
    start: "top 2px",
    refreshPriority: 105,
    onEnter: () => {
      if (!laundryUI.chosen) {
        lockPageScroll();
        setGlobalScrollCueVisible(false);
      }
    },
    onEnterBack: () => {
      if (!laundryUI.chosen) {
        lockPageScroll();
        setGlobalScrollCueVisible(false);
      }
    }
  });

  const washer = qs(".washer");
  const load = qs(".washer-load");
  gsap.timeline({
    scrollTrigger: {
      id: "laundry-pin",
      trigger: "#laundryChapter",
      start: "top top",
      end: pinDistance(0.88),
      pin: true,
      pinSpacing: true,
      anticipatePin: 0,
      scrub: reducedMotion ? false : 0.34,
      invalidateOnRefresh: true,
      refreshPriority: 100,
      onEnter: self => { activateHeldTouch(self); stageCue(self, "SCROLL TO RUN THE WASH", "SCROLL TO SEE YOUR WATER STORY"); },
      onEnterBack: self => { activateHeldTouch(self); stageCue(self, "SCROLL TO RUN THE WASH", "SCROLL TO SEE YOUR WATER STORY"); },
      onUpdate: self => stageCue(self, "SCROLL TO RUN THE WASH", "SCROLL TO SEE YOUR WATER STORY"),
      onLeave: deactivateHeldTouch,
      onLeaveBack: deactivateHeldTouch
    }
  })
    .fromTo(washer, { scale: 0.94, y: 14 }, { scale: 1.045, y: 0, ease: "none" }, 0)
    .fromTo(load, { rotation: 0 }, { rotation: 700, ease: "none" }, 0.06)
    .fromTo(qs(".washer-dial"), { rotation: -15 }, { rotation: 150, ease: "none" }, 0.08);

  const resultComparison = qs("#resultComparison");
  gsap.set(resultComparison, { y: 44, autoAlpha: 0 });
  gsap.timeline({
    scrollTrigger: {
      id: "result-pin",
      trigger: "#resultChapter",
      start: "top top",
      end: pinDistance(0.78),
      pin: true,
      pinSpacing: true,
      anticipatePin: 0,
      scrub: reducedMotion ? false : 0.34,
      invalidateOnRefresh: true,
      refreshPriority: 90,
      onEnter: self => { activateHeldTouch(self); updateResultNumberFill(self.progress); stageCue(self, "SCROLL TO COMPARE", "SCROLL TO MAKE IT VISIBLE"); },
      onEnterBack: self => { activateHeldTouch(self); updateResultNumberFill(self.progress); stageCue(self, "SCROLL TO COMPARE", "SCROLL TO MAKE IT VISIBLE"); },
      onUpdate: self => {
        /* Fill the litres themselves from bottom to top before the comparison card
           is fully revealed, so the number becomes part of the scroll interaction. */
        updateResultNumberFill(clamp(self.progress / 0.34));
        stageCue(self, "SCROLL TO COMPARE", "SCROLL TO MAKE IT VISIBLE");
      },
      onLeave: deactivateHeldTouch,
      onLeaveBack: deactivateHeldTouch
    }
  })
    .fromTo("#resultChapter .result-number", { scale: 0.92 }, { scale: 1, ease: "none" }, 0)
    .to(resultComparison, { y: 0, autoAlpha: 1, ease: "power2.out" }, 0.06)
    .fromTo(qs(".user-fill", resultComparison), { scaleX: 0, transformOrigin: "left" }, { scaleX: 1, ease: "none" }, 0.10)
    .fromTo(qs(".average-fill", resultComparison), { scaleX: 0, transformOrigin: "left" }, { scaleX: 1, ease: "none" }, 0.14);

  const glasses = qsa(".fly-glass");
  const glassTl = gsap.timeline({
    scrollTrigger: {
      id: "glasses-pin",
      trigger: "#glassesChapter",
      start: "top top",
      end: pinDistance(1.02),
      pin: true,
      pinSpacing: true,
      anticipatePin: 0,
      scrub: reducedMotion ? false : 0.34,
      invalidateOnRefresh: true,
      refreshPriority: 80,
      onEnter: self => { activateHeldTouch(self); setBrowserTheme("#061935"); stageCue(self, "SCROLL TO MAKE IT VISIBLE", "SCROLL TO SEE WHAT THAT MEANS"); },
      onEnterBack: self => { activateHeldTouch(self); setBrowserTheme("#061935"); stageCue(self, "SCROLL TO MAKE IT VISIBLE", "SCROLL TO SEE WHAT THAT MEANS"); },
      onUpdate: self => stageCue(self, "SCROLL TO MAKE IT VISIBLE", "SCROLL TO SEE WHAT THAT MEANS"),
      onLeave: () => { deactivateHeldTouch(); setBrowserTheme("#f4efe7"); },
      onLeaveBack: () => { deactivateHeldTouch(); setBrowserTheme("#f4efe7"); }
    }
  });
  glasses.forEach((glass, index) => {
    glassTl.fromTo(glass,
      { left: "50%", top: "56%", opacity: 0, scale: 0.2, rotation: 0 },
      { left: `${glass.dataset.x}%`, top: `${glass.dataset.y}%`, opacity: 0.88, scale: 1, rotation: Number(glass.dataset.r), ease: "none" },
      (index % 12) * 0.018
    );
  });

  const moneyTitle = qs(".money-title");
  const moneyRain = qs("#moneyRain");
  const moneyFace = qs("#moneyChapter .saving-face");
  gsap.set(moneyRain, { opacity: 0 });
  gsap.set(moneyFace, { y: 34, opacity: 0, scale: 0.92 });
  gsap.timeline({
    scrollTrigger: {
      id: "money-pin",
      trigger: "#moneyChapter",
      start: "top top",
      end: pinDistance(0.84),
      pin: true,
      pinSpacing: true,
      anticipatePin: 0,
      scrub: reducedMotion ? false : 0.34,
      invalidateOnRefresh: true,
      refreshPriority: 70,
      onEnter: self => { activateHeldTouch(self); stageCue(self, "SCROLL TO REVEAL THE COST", "SCROLL TO SEE WHAT YOU COULD SAVE"); },
      onEnterBack: self => { activateHeldTouch(self); stageCue(self, "SCROLL TO REVEAL THE COST", "SCROLL TO SEE WHAT YOU COULD SAVE"); },
      onUpdate: self => stageCue(self, "SCROLL TO REVEAL THE COST", "SCROLL TO SEE WHAT YOU COULD SAVE"),
      onLeave: deactivateHeldTouch,
      onLeaveBack: deactivateHeldTouch
    }
  })
    .fromTo(moneyTitle, { y: 30, scale: 0.94, opacity: 0.65 }, { y: 0, scale: 1, opacity: 1, ease: "none" }, 0)
    .to(moneyRain, { opacity: 1, ease: "none" }, 0.22)
    .to(moneyFace, { y: 0, opacity: 1, scale: 1, ease: "power2.out" }, 0.42);

  const cards = qsa(".action-card");
  const actionsTl = gsap.timeline({
    scrollTrigger: {
      id: "actions-pin",
      trigger: "#actionsChapter",
      start: "top top",
      end: pinDistance(1.24),
      pin: true,
      pinSpacing: true,
      anticipatePin: 0,
      scrub: reducedMotion ? false : 0.34,
      invalidateOnRefresh: true,
      refreshPriority: 50,
      onEnter: self => { activateHeldTouch(self); stageCue(self, "SCROLL THROUGH THE TIPS", "SCROLL TO SEE WHY IT MATTERS"); },
      onEnterBack: self => { activateHeldTouch(self); stageCue(self, "SCROLL THROUGH THE TIPS", "SCROLL TO SEE WHY IT MATTERS"); },
      onUpdate: self => stageCue(self, "SCROLL THROUGH THE TIPS", "SCROLL TO SEE WHY IT MATTERS"),
      onLeave: deactivateHeldTouch,
      onLeaveBack: deactivateHeldTouch
    }
  });
  cards.forEach((card, i) => actionsTl.fromTo(card, { y: 45, opacity: 0 }, { y: 0, opacity: 1, ease: "power2.out" }, i * 0.23));

  /* Morph is a longer held stage because its scroll is the interaction. */
  const morphFrame = qs("#morphFrame");
  const morphShell = qs(".morph-frame-shell");
  gsap.set(morphShell, { y: 76, scale: 0.86, opacity: 0.72 });
  ScrollTrigger.create({
    id: "morph-pin",
    trigger: "#morphChapter",
    start: "top top",
    end: pinDistance(1.85),
    pin: true,
    pinSpacing: true,
    anticipatePin: 0,
    scrub: reducedMotion ? false : 0.32,
    invalidateOnRefresh: true,
    refreshPriority: 30,
    onEnter: self => { activateHeldTouch(self); stageCue(self, "SCROLL TO CHANGE THE WORLD", "SCROLL TO FINISH"); },
    onEnterBack: self => { activateHeldTouch(self); stageCue(self, "SCROLL TO CHANGE THE WORLD", "SCROLL TO FINISH"); },
    onUpdate: self => {
      const p = clamp(self.progress);
      const intro = clamp(p / 0.16);
      gsap.set(morphShell, { y: 76 * (1 - intro), scale: 0.86 + 0.14 * intro, opacity: 0.72 + 0.28 * intro });
      const morphProgress = clamp((p - 0.16) / 0.84);
      const frameIndex = Math.round(morphProgress * 28);
      if (morphFrame.dataset.frame !== String(frameIndex)) {
        morphFrame.src = `assets/morph_frames_webp/frame_${String(frameIndex).padStart(2, "0")}.webp`;
        morphFrame.dataset.frame = String(frameIndex);
      }
      stageCue(self, "SCROLL TO CHANGE THE WORLD", "SCROLL TO FINISH");
    },
    onLeave: deactivateHeldTouch,
    onLeaveBack: deactivateHeldTouch
  });

  const endHeading = qs("#endMessage h2");
  const endWords = splitWords(endHeading);

  ScrollTrigger.create({
    id: "end-trigger",
    trigger: "#endChapter",
    start: "top 82%",
    refreshPriority: 10,
    once: true,
    onEnter: () => {
      setBrowserTheme("#070707");
      setGlobalScrollCueVisible(false);

      /* Keep the closing screen visible by default. The animation is created only
         after the section is actually reached, so a missed trigger can never leave
         the user staring at an empty black screen. */
      const endTl = gsap.timeline();
      endTl.from(qs(".end-orbit"), { scale: 0.72, rotate: -16, autoAlpha: 0, duration: reducedMotion ? 0.01 : 0.55, ease: "back.out(1.5)" })
        .from(qs(".end-kicker"), { y: 14, autoAlpha: 0, duration: reducedMotion ? 0.01 : 0.3, ease: "power2.out" }, "-=0.28");
      endTl.fromTo(endWords,
        { yPercent: 120, rotate: 2, opacity: 0 },
        { yPercent: 0, rotate: 0, opacity: 1, duration: reducedMotion ? 0.01 : 0.5, stagger: reducedMotion ? 0 : 0.035, ease: "power3.out" },
        "-=0.08"
      );
      endTl.from(qs("#endMessage p"), { y: 18, autoAlpha: 0, duration: reducedMotion ? 0.01 : 0.4, ease: "power2.out" }, "-=0.16")
        .from(qs("#restartBtn"), { y: 16, scale: 0.96, autoAlpha: 0, duration: reducedMotion ? 0.01 : 0.42, ease: "back.out(1.5)" }, "-=0.12");
    }
  });
}

function setBrowserTheme(color) {
  qs("#themeColorMeta")?.setAttribute("content", color);
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;
}

function preloadMorphFrames() {
  for (let i = 0; i < 29; i++) {
    const img = new Image();
    img.src = `assets/morph_frames_webp/frame_${String(i).padStart(2, "0")}.webp`;
  }
}

function resetInitialVisuals() {
  setGlobalScrollCueVisible(false);
  setSinkNextVisible(true, "NEXT QUESTION");
  gsap.set("#dishMethodPanel", { autoAlpha: 0, y: 36, scale: 0.97 });

  laundryUI.chosen = false;
  state.laundryPerWeek = null;
  qsa("#laundryButtons button[data-value]").forEach(btn => btn.classList.remove("active"));
  qs(".laundry-room")?.classList.remove("has-answer");
  const laundryHint = qs("#laundryAnswerHint");
  laundryHint?.setAttribute("aria-hidden", "false");
  if (laundryHint) gsap.set(laundryHint, { autoAlpha: 1, y: 0 });

  updateResultNumberFill(0);
  updateShowerRainIntensity();
}

function init() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  if (new URLSearchParams(window.location.search).has("restart")) {
    requestAnimationFrame(() => window.scrollTo(0, 0));
    setTimeout(() => window.scrollTo(0, 0), 80);
  }

  buildNewShowerRain();
  buildFlyingGlasses();
  buildMoneyRain();
  setupSmoothScrolling();

  setShowerStep(1);
  bindShower();
  bindPlates();
  bindLaundry();
  updateSink();
  updateLaundry();
  updateEstimate();
  resetInitialVisuals();
  preloadMorphFrames();
  setupLoopingDecorations();

  /* Build every chapter trigger first, then perform ONE ordered refresh. Explicit
     refreshPriority values follow DOM order, so every pin spacer is included before
     positions below it are measured. This is the core v28 anti-jump rule. */
  setupHeldStages();
  setupAutomaticStories();
  window.ScrollTrigger?.sort();
  window.ScrollTrigger?.refresh();

  lockPageScroll();

  qs("#restartBtn")?.addEventListener("click", () => {
    unlockPageScroll();
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const url = new URL(window.location.href);
    url.searchParams.set("restart", Date.now());
    url.hash = "showerStart";
    window.location.replace(url.toString());
  });

  requestAnimationFrame(() => {
    window.ScrollTrigger?.refresh();
  });
}

init();
