/* Water Story v24 — GSAP-first interaction + motion system */

const state = {
  showerMinutes: null,
  showersPerWeek: null,
  dishesPerWeek: 5,
  dishMethod: "basin",
  laundryPerWeek: null
};

const showerUI = {
  step: 1,
  transitioning: false,
  timeValues: [2, 5, 10, 20],
  frequencyValues: [3, 5, 7, 10]
};

const sinkUI = {
  plateChosen: false,
  methodStepVisible: false,
  methodChosen: false
};

/* Easy tuning: the automatic savings beat changes roughly once per second. */
const AUTO_STORY_STEP = 1.08;
const FUTURE_STORY_STEP = 1.55;

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

if (!window.gsap) {
  document.documentElement.classList.add("gsap-missing");
  throw new Error("GSAP did not load. Check the GSAP CDN script tags in index.html.");
}

const plugins = [window.ScrollTrigger, window.ScrollToPlugin, window.ScrollSmoother].filter(Boolean);
if (plugins.length) gsap.registerPlugin(...plugins);

let smoother = null;
let activeTransition = null;
let savingTimeline = null;
let futureTimeline = null;
const showerRainLoops = [];
const moneyRainLoops = [];

/* -------------------------------------------------------------------------- */
/* Scroll system                                                               */
/* -------------------------------------------------------------------------- */

const scrollGate = { locked: false };
const blockedKeys = new Set([
  "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"
]);

function blockManualScroll(event) {
  if (!scrollGate.locked) return;
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
  scrollGate.locked = true;
  document.documentElement.classList.add("interaction-locked");
  document.body.classList.add("interaction-locked");
  smoother?.paused(true);
}

function unlockPageScroll() {
  scrollGate.locked = false;
  document.documentElement.classList.remove("interaction-locked");
  document.body.classList.remove("interaction-locked");
  smoother?.paused(false);
}

function setupSmoothScrolling() {
  if (window.ScrollTrigger) ScrollTrigger.config({ ignoreMobileResize: true });
  if (!window.ScrollSmoother || reducedMotion) return;
  smoother = ScrollSmoother.create({
    wrapper: "#smooth-wrapper",
    content: "#smooth-content",
    smooth: 0.72,
    smoothTouch: 0.1,
    effects: false,
    normalizeScroll: true,
    ignoreMobileResize: true
  });
}

function scrollToTarget(target, duration = 1.05) {
  const el = typeof target === "string" ? qs(target) : target;
  if (!el) return gsap.to({}, { duration: 0 });

  if (window.ScrollToPlugin) {
    return gsap.to(window, {
      scrollTo: { y: el, autoKill: false },
      duration: reducedMotion ? 0.01 : duration,
      ease: "power3.inOut"
    });
  }

  el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  return gsap.to({}, { duration: reducedMotion ? 0.01 : duration });
}

function setGlobalScrollCueVisible(visible) {
  const cue = qs("#globalScrollHint");
  if (!cue) return;
  cue.classList.toggle("is-visible", visible);
  cue.setAttribute("aria-hidden", String(!visible));
  gsap.to(cue, {
    autoAlpha: visible ? 0.82 : 0,
    y: visible ? 0 : 8,
    duration: reducedMotion ? 0 : 0.28,
    ease: "power2.out",
    overwrite: true
  });
}

function runGuidedTransition({ kicker, title, target, lockAfter = true }) {
  if (activeTransition?.isActive()) return;

  const overlay = qs("#chapterTransition");
  const water = qs(".chapter-transition-water", overlay);
  const copy = qs(".chapter-transition-copy", overlay);
  const kickerEl = qs("#chapterTransitionKicker");
  const titleEl = qs("#chapterTransitionTitle");

  kickerEl.textContent = kicker;
  titleEl.textContent = title;
  lockPageScroll();
  setGlobalScrollCueVisible(false);

  const destination = qs(target);
  const scrollTweenTarget = smoother || window;
  const scrollTweenVars = smoother
    ? {
        scrollTop: Math.min(
          ScrollTrigger.maxScroll(window),
          smoother.offset(destination, "top top")
        ),
        duration: reducedMotion ? 0.01 : 1.0,
        ease: "power3.inOut"
      }
    : {
        scrollTo: { y: destination, autoKill: false },
        duration: reducedMotion ? 0.01 : 1.0,
        ease: "power3.inOut"
      };

  activeTransition = gsap.timeline({
    defaults: { overwrite: true },
    onComplete: () => {
      gsap.set(overlay, { autoAlpha: 0, visibility: "hidden", pointerEvents: "none" });
      gsap.set(water, { yPercent: 105, opacity: 1 });
      gsap.set(copy, { autoAlpha: 0, y: 16 });
      if (lockAfter) lockPageScroll();
      else unlockPageScroll();
      window.ScrollTrigger?.refresh();
    }
  });

  activeTransition
    .set(overlay, { autoAlpha: 1, visibility: "visible", pointerEvents: "auto" })
    .set(water, { yPercent: 105, opacity: 1 })
    .set(copy, { autoAlpha: 0, y: 20 })
    .to(water, {
      yPercent: 0,
      duration: reducedMotion ? 0.01 : 0.52,
      ease: "power4.out"
    })
    .to(copy, {
      autoAlpha: 1,
      y: 0,
      duration: reducedMotion ? 0.01 : 0.34,
      ease: "power3.out"
    }, "-=0.12")
    .to({}, { duration: reducedMotion ? 0 : 0.32 })
    .to(copy, {
      autoAlpha: 0,
      y: -18,
      duration: reducedMotion ? 0.01 : 0.24,
      ease: "power2.in"
    })
    .to(water, {
      opacity: 0.38,
      duration: reducedMotion ? 0.01 : 0.18,
      ease: "none"
    }, "<")
    .to(scrollTweenTarget, scrollTweenVars, "-=0.02")
    .to(water, {
      yPercent: -105,
      opacity: 1,
      duration: reducedMotion ? 0.01 : 0.58,
      ease: "power4.inOut"
    }, "-=0.22");
}

/* -------------------------------------------------------------------------- */
/* Reusable GSAP helpers                                                       */
/* -------------------------------------------------------------------------- */

function selectInGroup(container, button) {
  qsa("button", container).forEach(b => b.classList.remove("active"));
  button.classList.add("active");

  gsap.fromTo(button,
    { scale: 0.96 },
    { scale: 1, duration: 0.34, ease: "back.out(2)", overwrite: true }
  );

  if (container.id === "dishFrequency") {
    qsa(".plate", container).forEach(plate => {
      plate.querySelector(".plate-fill")?.setAttribute(
        "fill",
        plate.classList.contains("active") ? "#c9ff38" : "#f8f4ed"
      );
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
          if (/^\s+$/.test(part)) {
            frag.append(document.createTextNode(part));
          } else {
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
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        walk(child);
      }
    });
  };

  walk(element);
  element.dataset.gsapSplit = "true";
  return qsa(".gsap-word", element);
}

function animateWordsIn(words, timeline, at = 0) {
  if (!words.length) return;
  timeline.fromTo(words,
    { yPercent: 125, rotate: 2.5, opacity: 0 },
    {
      yPercent: 0,
      rotate: 0,
      opacity: 1,
      duration: reducedMotion ? 0.01 : 0.42,
      stagger: reducedMotion ? 0 : 0.025,
      ease: "power3.out"
    },
    at
  );
}

function animateWordsOut(words, timeline, at) {
  if (!words.length) return;
  timeline.to(words, {
    yPercent: -120,
    rotate: -2,
    opacity: 0,
    duration: reducedMotion ? 0.01 : 0.28,
    stagger: reducedMotion ? 0 : 0.015,
    ease: "power2.in"
  }, at);
}

function setupLoopingDecorations() {
  /* Shower water — GSAP timelines replace the old CSS keyframes. */
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

  /* Calm water movement; no extra decorative animation beyond what communicates water. */
  [qs("#basinWater"), qs("#washerWater")].filter(Boolean).forEach((water, i) => {
    gsap.to(water, {
      y: 2,
      backgroundPositionY: 18,
      duration: 3.8 + i * 0.6,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  });

  const cueArrow = qs("#globalScrollHint i");
  if (cueArrow) {
    gsap.to(cueArrow, {
      y: 4,
      duration: 1.35,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Shower                                                                      */
/* -------------------------------------------------------------------------- */

function buildNewShowerRain() {
  const container = qs("#newShowerRain");
  if (!container) return;
  container.innerHTML = "";

  const lanes = [8,14,20,26,32,38,44,50,56,62,68,74,80,86,92];
  for (let i = 0; i < 30; i++) {
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

function dialAngleForIndex(index, count) {
  if (count <= 1) return 0;
  return -118 + (236 * index) / (count - 1);
}

function setDialVisual(dialId, values, value, valueId, formatter) {
  const dial = qs(`#${dialId}`);
  const valueEl = qs(`#${valueId}`);
  if (!dial || !valueEl) return;

  if (value == null) {
    valueEl.textContent = "—";
    gsap.to(dial, { "--dial-angle": "0deg", duration: 0.3, overwrite: true });
    return;
  }

  const index = Math.max(0, values.indexOf(Number(value)));
  valueEl.innerHTML = formatter(value);
  gsap.to(dial, {
    "--dial-angle": `${dialAngleForIndex(index, values.length)}deg`,
    duration: reducedMotion ? 0.01 : 0.48,
    ease: "back.out(1.7)",
    overwrite: true
  });
  gsap.fromTo(qs(".dial-knob", dial), { scale: 0.96 }, {
    scale: 1,
    duration: reducedMotion ? 0.01 : 0.34,
    ease: "back.out(2)",
    overwrite: true
  });
}

function setDialActive(dial, active) {
  if (!dial) return;
  dial.classList.toggle("is-active", active);
  dial.classList.toggle("is-inactive", !active);
  gsap.to(dial, {
    opacity: active ? 1 : 0.28,
    scale: active ? 1 : 0.94,
    duration: reducedMotion ? 0.01 : 0.3,
    ease: "power2.out",
    overwrite: true
  });
}

function currentShowerAnswer() {
  return showerUI.step === 1 ? state.showerMinutes : state.showersPerWeek;
}

function renderShowerAnswerOptions() {
  const group = qs("#showerAnswerOptions");
  if (!group) return;

  const values = showerUI.step === 1 ? showerUI.timeValues : showerUI.frequencyValues;
  const current = currentShowerAnswer();
  group.innerHTML = "";
  group.setAttribute(
    "aria-label",
    showerUI.step === 1 ? "Choose shower duration" : "Choose showers per week"
  );

  values.forEach(value => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.value = String(value);
    button.classList.toggle("is-selected", Number(current) === value);
    button.textContent = showerUI.step === 1 ? `${value} min` : `${value}× / week`;
    button.addEventListener("click", () => chooseShowerAnswer(value, button));
    group.append(button);
  });

  gsap.fromTo(qsa("button", group),
    { y: 8, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: reducedMotion ? 0.01 : 0.3,
      stagger: reducedMotion ? 0 : 0.035,
      ease: "power2.out"
    }
  );
}

function setShowerNextEnabled(enabled) {
  const next = qs("#showerNext");
  next.disabled = !enabled;
  next.setAttribute("aria-disabled", String(!enabled));
  gsap.to(next, {
    opacity: enabled ? 1 : 0.32,
    y: enabled ? 0 : 3,
    duration: reducedMotion ? 0.01 : 0.25,
    ease: "power2.out",
    overwrite: true
  });
}

function chooseShowerAnswer(value, button) {
  const group = qs("#showerAnswerOptions");
  qsa("button", group).forEach(btn => btn.classList.toggle("is-selected", btn === button));
  gsap.fromTo(button, { scale: 0.93 }, {
    scale: 1,
    duration: reducedMotion ? 0.01 : 0.34,
    ease: "back.out(2.4)"
  });

  if (showerUI.step === 1) {
    state.showerMinutes = value;
    setDialVisual("timeDial", showerUI.timeValues, value, "timeValue", v => `${v}<span> min</span>`);
  } else {
    state.showersPerWeek = value;
    setDialVisual("flowDial", showerUI.frequencyValues, value, "flowValue", v => `${v}<span>× / week</span>`);
  }

  setShowerNextEnabled(true);
  updateEstimate();
}

function setShowerStep(step) {
  showerUI.step = step;
  const timeDial = qs("#timeDial");
  const flowDial = qs("#flowDial");
  const label = qs("#activeControlLabel");
  const question = qs("#showerQuestion");
  const helper = qs("#showerHelper");
  const nextText = qs("#showerNextText");
  const timeCaption = qs("#timeCaption");
  const flowCaption = qs("#flowCaption");

  if (step === 1) {
    setDialActive(timeDial, true);
    setDialActive(flowDial, false);
    label.textContent = "CHOOSE ONE";
    question.textContent = "How long is your usual shower?";
    helper.textContent = "Tap one answer. The knob updates for you.";
    nextText.textContent = "NEXT QUESTION";
    timeCaption.textContent = "DURATION";
    flowCaption.textContent = "";
    qs("#flowValue").textContent = "—";
    setDialVisual("timeDial", showerUI.timeValues, state.showerMinutes, "timeValue", v => `${v}<span> min</span>`);
  } else {
    setDialActive(timeDial, false);
    setDialActive(flowDial, true);
    label.textContent = "CHOOSE ONE";
    question.textContent = "How many times a week do you shower?";
    helper.textContent = "Tap one answer. No dragging needed.";
    nextText.textContent = "NEXT: THE SINK";
    timeCaption.textContent = "DURATION";
    flowCaption.textContent = "FREQUENCY";
    setDialVisual("flowDial", showerUI.frequencyValues, state.showersPerWeek, "flowValue", v => `${v}<span>× / week</span>`);
  }

  renderShowerAnswerOptions();
  setShowerNextEnabled(currentShowerAnswer() != null);
}

function advanceShowerToQuestionTwo() {
  if (showerUI.transitioning || showerUI.step !== 1 || state.showerMinutes == null) return;
  showerUI.transitioning = true;

  const block = qs("#showerQuestionBlock");
  const options = qs("#showerAnswerOptions");
  gsap.timeline({
    onComplete: () => { showerUI.transitioning = false; }
  })
    .to([block, options], {
      y: -10,
      opacity: 0,
      duration: reducedMotion ? 0.01 : 0.18,
      ease: "power2.in"
    })
    .call(() => setShowerStep(2))
    .set([block, options], { y: 14, opacity: 0 })
    .to([block, options], {
      y: 0,
      opacity: 1,
      duration: reducedMotion ? 0.01 : 0.3,
      ease: "power3.out"
    });
}

function bindShower() {
  qs("#showerNext").addEventListener("click", () => {
    if (showerUI.step === 1) {
      advanceShowerToQuestionTwo();
      return;
    }
    if (state.showersPerWeek == null) return;
    runGuidedTransition({
      kicker: "ROUTINE SAVED",
      title: "NEXT: THE SINK",
      target: "#sinkChapter",
      lockAfter: true
    });
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
  gsap.to(next, {
    autoAlpha: visible ? 1 : 0,
    y: visible ? 0 : 12,
    duration: reducedMotion ? 0.01 : 0.28,
    ease: "power3.out",
    overwrite: true
  });
}

function showDishMethodStep() {
  if (!sinkUI.plateChosen || sinkUI.methodStepVisible) return;
  sinkUI.methodStepVisible = true;
  sinkUI.methodChosen = false;
  setSinkNextVisible(false);
  setGlobalScrollCueVisible(false);

  const panel = qs("#dishMethodPanel");
  const copy = qs(".kitchen-room .sink-copy");
  const scene = qs(".kitchen-room .sink-scene");
  panel.classList.add("is-visible");
  panel.setAttribute("aria-hidden", "false");
  qs(".kitchen-room").classList.add("is-method-step");

  gsap.timeline()
    .to([copy, scene], {
      filter: "blur(2.2px) brightness(0.72)",
      opacity: 0.58,
      duration: reducedMotion ? 0.01 : 0.28,
      ease: "power2.out"
    }, 0)
    .fromTo(panel,
      { autoAlpha: 0, y: 36, scale: 0.97 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: reducedMotion ? 0.01 : 0.42,
        ease: "power3.out"
      },
      0.04
    );
}

function bindPlates() {
  const group = qs("#dishFrequency");
  qsa(".plate", group).forEach(btn => {
    btn.addEventListener("click", () => {
      selectInGroup(group, btn);
      state.dishesPerWeek = Number(btn.dataset.value);
      sinkUI.plateChosen = true;
      if (!sinkUI.methodStepVisible) setSinkNextVisible(true, "NEXT QUESTION");
      updateSink();
      updateEstimate();
    });
  });

  qs("#sinkNext").addEventListener("click", () => {
    if (!sinkUI.methodStepVisible) {
      showDishMethodStep();
      return;
    }
    if (!sinkUI.methodChosen) return;

    setSinkNextVisible(false);
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
      setSinkNextVisible(true, "NEXT: LAUNDRY");
      updateSink();
      updateEstimate();
    });
  });
}

function bindLaundry() {
  const group = qs("#laundryButtons");
  qsa("button[data-value]", group).forEach(btn => {
    btn.addEventListener("click", () => {
      selectInGroup(group, btn);
      state.laundryPerWeek = Number(btn.dataset.value);
      updateLaundry();
      updateEstimate();
      unlockPageScroll();
      setGlobalScrollCueVisible(true);
      window.ScrollTrigger?.refresh();
    });
  });
}

function updateSink() {
  const water = qs("#basinWater");
  if (!water) return;

  let height = 18;
  if (sinkUI.plateChosen) {
    const frequencyFactor = clamp(state.dishesPerWeek / 7, 0.14, 1);
    const methodFactor = sinkUI.methodStepVisible
      ? { dishwasher: 0.34, basin: 0.64, running: 1 }[state.dishMethod]
      : 0.64;
    height = 12 + 58 * frequencyFactor * methodFactor;
  }

  gsap.to(water, {
    height: `${height}%`,
    duration: reducedMotion ? 0.01 : 0.62,
    ease: "power3.out",
    overwrite: "auto"
  });
}

function updateLaundry() {
  const water = qs("#washerWater");
  const chosen = state.laundryPerWeek !== null;
  const height = chosen ? 18 + clamp(state.laundryPerWeek / 4, 0, 1) * 54 : 18;
  gsap.to(water, {
    height: `${height}%`,
    duration: reducedMotion ? 0.01 : 0.68,
    ease: "power3.out",
    overwrite: "auto"
  });
}

/* -------------------------------------------------------------------------- */
/* Estimate                                                                    */
/* -------------------------------------------------------------------------- */

function estimateDailyLitres() {
  const showerMinutes = state.showerMinutes ?? 10;
  const showersPerWeek = state.showersPerWeek ?? 5;
  const dishMethod = state.dishMethod ?? "basin";
  const dishesPerWeek = state.dishesPerWeek ?? 5;
  const laundryPerWeek = state.laundryPerWeek ?? 2.5;

  const shower = (showerMinutes * 8 * showersPerWeek) / 7;
  const dishPerSession = { dishwasher: 10, basin: 18, running: 34 }[dishMethod];
  const dishes = (dishPerSession * dishesPerWeek) / 7;
  const laundry = (50 * laundryPerWeek) / 7;
  const baseline = 28;
  return Math.round(shower + dishes + laundry + baseline);
}

function updateEstimate() {
  const litres = estimateDailyLitres();
  qs("#personalLitres").textContent = litres;
  qs("#glassCount").textContent = Math.round(litres / 0.5);
  const cost = Math.max(18, Math.round(litres * 0.46));
  qs("#monthlyCostLine").innerHTML = `€${cost}<br>A MONTH`;

  const comparison = qs("#resultComparison");
  const youLabel = qs("#resultYouLabel");
  if (comparison && youLabel) {
    const scaleMax = 220;
    const userPos = clamp(litres / scaleMax, 0, 1) * 100;
    const avgPos = clamp(118 / scaleMax, 0, 1) * 100;
    comparison.style.setProperty("--user-position", `${userPos}%`);
    comparison.style.setProperty("--avg-position", `${avgPos}%`);
    youLabel.textContent = `${litres} L / DAY`;
    gsap.to(qs(".user-fill", comparison), {
      width: `${userPos}%`,
      duration: reducedMotion ? 0.01 : 0.5,
      ease: "power2.out"
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Decorative builds                                                          */
/* -------------------------------------------------------------------------- */

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
      {
        y: "128svh",
        rotate: 8 + Math.random() * 14,
        duration,
        delay: -Math.random() * duration,
        repeat: -1,
        ease: "none"
      }
    );
    loop.pause();
    moneyRainLoops.push(loop);
  }
}

/* -------------------------------------------------------------------------- */
/* Automatic story sections                                                   */
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
    const media = qsa(".saving-face, .beer-meme, .food-row, .future-reference-image", slide);

    tl.set(slide, { autoAlpha: 1, visibility: "visible" }, start);
    animateWordsIn(words, tl, start + 0.02);

    if (media.length) {
      tl.fromTo(media,
        {
          y: 28,
          scale: 0.9,
          rotate: index % 2 ? 1.5 : -1.5,
          opacity: 0,
          clipPath: "inset(10% 0 10% 0 round 18px)"
        },
        {
          y: 0,
          scale: 1,
          rotate: 0,
          opacity: 1,
          clipPath: "inset(0% 0 0% 0 round 18px)",
          duration: reducedMotion ? 0.01 : 0.48,
          stagger: reducedMotion ? 0 : 0.04,
          ease: "power3.out"
        },
        start + 0.03
      );
    }

    if (progressRoot) {
      tl.call(() => updateStoryDots(progressRoot, index, 0), null, start);
      const dot = qsa("i", progressRoot)[index];
      if (dot) {
        tl.fromTo(dot,
          { "--dot-progress": 0 },
          { "--dot-progress": 1, duration: stepDuration * 0.88, ease: "none" },
          start
        );
      }
    }

    if (index < slides.length - 1) {
      const outAt = start + stepDuration * 0.74;
      animateWordsOut(words, tl, outAt);
      if (media.length) {
        tl.to(media, {
          x: -18,
          y: -5,
          scale: 0.96,
          rotate: -1.5,
          opacity: 0,
          duration: reducedMotion ? 0.01 : 0.25,
          ease: "power2.in"
        }, outAt);
      }
      tl.set(slide, { autoAlpha: 0, visibility: "hidden" }, start + stepDuration - 0.02);
    }
  });

  return tl;
}

function setupSavingAutoStory() {
  const section = qs("#savingChapter");
  const slides = qsa(".saving-auto-slide", section);
  const progress = qs(".saving-auto-progress", section);
  if (!slides.length) return;

  gsap.set(slides, { autoAlpha: 0, visibility: "hidden" });
  gsap.set(slides[0], { autoAlpha: 1, visibility: "visible" });

  const play = () => {
    savingTimeline?.kill();
    setGlobalScrollCueVisible(false);
    gsap.set(slides, { autoAlpha: 0, visibility: "hidden" });
    updateStoryDots(progress, 0, 0);
    savingTimeline = buildAutoStoryTimeline({
      slides,
      progressRoot: progress,
      stepDuration: AUTO_STORY_STEP,
      onComplete: () => {
        updateStoryDots(progress, slides.length, 1);
        setGlobalScrollCueVisible(true);
      }
    });
    savingTimeline.play(0);
  };

  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    onEnter: play,
    onEnterBack: play
  });
}

function setupFutureAutoStory() {
  const section = qs("#futureAutoStage");
  const slides = qsa(".future-auto-slide", section);
  const progress = qs(".future-auto-progress", section);
  if (!slides.length) return;

  gsap.set(slides, { autoAlpha: 0, visibility: "hidden" });
  gsap.set(slides[0], { autoAlpha: 1, visibility: "visible" });

  const play = () => {
    futureTimeline?.kill();
    setGlobalScrollCueVisible(false);
    gsap.set(slides, { autoAlpha: 0, visibility: "hidden" });
    updateStoryDots(progress, 0, 0);
    futureTimeline = buildAutoStoryTimeline({
      slides,
      progressRoot: progress,
      stepDuration: FUTURE_STORY_STEP,
      onComplete: () => {
        updateStoryDots(progress, slides.length, 1);
        setGlobalScrollCueVisible(true);
      }
    });
    futureTimeline.play(0);
  };

  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    onEnter: play,
    onEnterBack: play
  });
}

/* -------------------------------------------------------------------------- */
/* GSAP scroll storytelling                                                    */
/* -------------------------------------------------------------------------- */

function setupScrollAnimations() {
  if (!window.ScrollTrigger) return;

  const toggleLoops = (loops, playing) => loops.forEach(loop => playing ? loop.play() : loop.pause());
  ScrollTrigger.create({
    trigger: "#showerStart",
    start: "top bottom",
    end: "bottom top",
    onEnter: () => toggleLoops(showerRainLoops, true),
    onEnterBack: () => toggleLoops(showerRainLoops, true),
    onLeave: () => toggleLoops(showerRainLoops, false),
    onLeaveBack: () => toggleLoops(showerRainLoops, false)
  });
  ScrollTrigger.create({
    trigger: "#moneyChapter",
    start: "top bottom",
    end: "bottom top",
    onEnter: () => toggleLoops(moneyRainLoops, true),
    onEnterBack: () => toggleLoops(moneyRainLoops, true),
    onLeave: () => toggleLoops(moneyRainLoops, false),
    onLeaveBack: () => toggleLoops(moneyRainLoops, false)
  });

  /* Laundry: one purposeful movement that communicates the machine running. */
  const washer = qs(".washer");
  const load = qs(".washer-load");
  if (washer && load) {
    gsap.timeline({
      scrollTrigger: {
        trigger: "#laundryChapter",
        start: "top top",
        end: "bottom bottom",
        scrub: reducedMotion ? false : 0.65
      }
    })
      .fromTo(washer, { scale: 0.9 }, { scale: 1.03, ease: "none" }, 0)
      .fromTo(load, { rotation: 0 }, { rotation: 500, ease: "none" }, 0.08);
  }

  const resultNumber = qs(".result-number");
  const marker = qs(".marker-strip");
  if (resultNumber && marker) {
    gsap.timeline({
      scrollTrigger: {
        trigger: "#resultChapter",
        start: "top 65%",
        end: "top 5%",
        scrub: reducedMotion ? false : 0.5
      }
    })
      .fromTo(resultNumber, { scale: 0.84 }, { scale: 1, ease: "power2.out" }, 0)
      .fromTo(marker, { y: 24, opacity: 0 }, { y: 0, opacity: 1, ease: "power2.out" }, 0.35);
  }

  const glasses = qsa(".fly-glass");
  if (glasses.length) {
    const glassTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: "#glassesChapter",
        start: "top 82%",
        end: "bottom 30%",
        scrub: reducedMotion ? false : 0.55
      }
    });

    glasses.forEach((glass, index) => {
      const x = Number(glass.dataset.x);
      const y = Number(glass.dataset.y);
      const r = Number(glass.dataset.r);
      glassTimeline.fromTo(glass,
        { left: "50%", top: "50%", opacity: 0, scale: 0.25, rotation: 0 },
        { left: `${x}%`, top: `${y}%`, opacity: 0.88, scale: 1, rotation: r, ease: "none" },
        (index % 12) * 0.018
      );
    });
  }

  const moneyTitle = qs(".money-title");
  const moneyRain = qs("#moneyRain");
  const moneyFace = qs("#moneyChapter .saving-face");
  if (moneyTitle) {
    gsap.timeline({
      scrollTrigger: {
        trigger: "#moneyChapter",
        start: "top 75%",
        end: "top 10%",
        scrub: reducedMotion ? false : 0.55
      }
    })
      .fromTo(moneyTitle, { y: 28, scale: 0.92 }, { y: 0, scale: 1, ease: "power2.out" }, 0)
      .fromTo(moneyRain, { opacity: 0 }, { opacity: 1, ease: "none" }, 0.2)
      .fromTo(moneyFace, { y: 24, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1 }, 0.35);
  }

  qsa(".action-card").forEach((card, index) => {
    gsap.fromTo(card,
      { y: 55, opacity: 0, rotation: [-3, 3, -2][index] },
      {
        y: 0,
        opacity: 1,
        rotation: [-3, 3, -2][index],
        duration: reducedMotion ? 0.01 : 0.55,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 88%",
          toggleActions: "play none none reverse"
        }
      }
    );
  });

  const morphFrame = qs("#morphFrame");
  if (morphFrame) {
    ScrollTrigger.create({
      trigger: "#morphChapter",
      start: "top top",
      end: "bottom bottom",
      scrub: reducedMotion ? false : 0.45,
      onUpdate: self => {
        const frameIndex = Math.round(clamp(self.progress) * 28);
        if (morphFrame.dataset.frame === String(frameIndex)) return;
        morphFrame.src = `assets/morph_frames_webp/frame_${String(frameIndex).padStart(2, "0")}.webp`;
        morphFrame.dataset.frame = String(frameIndex);
      }
    });
  }

  const beforePanel = qs(".end-before-panel");
  const afterPanel = qs(".end-after-panel");
  const endRoom = qs(".end-room");
  const restart = qs("#restartBtn");
  if (beforePanel && afterPanel && endRoom) {
    gsap.timeline({
      scrollTrigger: {
        trigger: "#endChapter",
        start: "top top",
        end: "bottom bottom",
        scrub: reducedMotion ? false : 0.65,
        onEnter: () => setGlobalScrollCueVisible(false),
        onEnterBack: () => setGlobalScrollCueVisible(false)
      }
    })
      .to(beforePanel, { opacity: 0, ease: "none" }, 0.28)
      .to(afterPanel, { opacity: 1, ease: "none" }, 0.28)
      .to(endRoom, { backgroundColor: "#f4ecf8", ease: "none" }, 0.28)
      .to(restart, { autoAlpha: 1, pointerEvents: "auto", ease: "power2.out" }, 0.76);
  }

  ScrollTrigger.create({
    trigger: "#glassesChapter",
    start: "top 55%",
    end: "bottom 45%",
    onEnter: () => setBrowserTheme("#061935"),
    onEnterBack: () => setBrowserTheme("#061935"),
    onLeave: () => setBrowserTheme("#f4efe7"),
    onLeaveBack: () => setBrowserTheme("#f4efe7")
  });

  ScrollTrigger.create({
    trigger: "#endChapter",
    start: "top 55%",
    onEnter: () => setBrowserTheme("#070707"),
    onEnterBack: () => setBrowserTheme("#070707"),
    onLeaveBack: () => setBrowserTheme("#f4efe7")
  });
}

function setBrowserTheme(color) {
  const meta = qs("#themeColorMeta");
  meta?.setAttribute("content", color);
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;
}

/* -------------------------------------------------------------------------- */
/* Init                                                                         */
/* -------------------------------------------------------------------------- */

function preloadMorphFrames() {
  for (let i = 0; i < 29; i++) {
    const img = new Image();
    img.src = `assets/morph_frames_webp/frame_${String(i).padStart(2, "0")}.webp`;
  }
}

function resetInitialVisuals() {
  setGlobalScrollCueVisible(false);
  setSinkNextVisible(false);
  gsap.set("#dishMethodPanel", { autoAlpha: 0, y: 36, scale: 0.97 });
  gsap.set("#moneyRain", { opacity: 0 });
  gsap.set(".action-card", { opacity: 0 });
  gsap.set("#restartBtn", { autoAlpha: 0, pointerEvents: "none" });
}

function init() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

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
  setupSavingAutoStory();
  setupFutureAutoStory();
  setupScrollAnimations();

  lockPageScroll();

  qs("#restartBtn")?.addEventListener("click", () => {
    unlockPageScroll();
    window.location.reload();
  });

  requestAnimationFrame(() => {
    window.ScrollTrigger?.refresh();
    if (smoother) smoother.scrollTo(0, false);
  });
}

init();
