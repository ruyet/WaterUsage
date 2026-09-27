# Water You Don’t See — v26

v26 is a stability hotfix for the GSAP version. The visual direction and interaction choices from v25 are kept, but the chapter handoff and pinned-scroll architecture are simplified so the transition cannot strand the user on the blue overlay and Laundry can always be driven by scrolling.

## What was fixed

- Removed the conflict where `ScrollSmoother.paused(true)` was used at the same time as a transition tried to reposition ScrollSmoother.
- The blue transition is now **one GSAP panel** that slides in, fully covers the viewport, moves the page underneath it, then slides out.
- Transition text is explicitly centered with GSAP transform percentages, so it no longer disappears during the wipe.
- Shower → Sink remains locked after the transition because the sink still requires answers.
- Sink → Laundry explicitly unlocks manual scrolling after the transition finishes.
- On touch/mobile layouts, native touch scrolling is used instead of ScrollSmoother. GSAP + ScrollTrigger still control all scroll-driven animations. This avoids the common mobile conflict between transformed smooth-scroll containers and pinned sections.
- Laundry, Your Water Story, Glasses, Money, Actions and Morph now pin the **whole chapter** with `pinSpacing: true`. ScrollTrigger creates exactly the space needed for the animation, so there is no fake 185–285svh blank background after a stage.
- The pinned stages use explicit viewport-based scroll distances in JavaScript and automatically release when their animation is complete.
- Scroll hints stay visible during the stage and change to the next instruction near the end instead of disappearing immediately.

## Adjusting how much scrolling a pinned stage needs

In `script.js`, inside `setupHeldStages()`, each stage has an `end: pinDistance(...)` value.

Examples:

```js
// Laundry
end: pinDistance(0.88)

// Your Water Story
end: pinDistance(0.78)

// Glasses
end: pinDistance(1.02)

// Money
end: pinDistance(0.84)

// Morph
end: pinDistance(1.85)
```

`1.0` is approximately one viewport of scrolling while the chapter remains pinned. Lower values make the interaction finish faster; higher values require more scrolling.

## Automatic story timing

Near the top of `script.js`:

```js
const AUTO_STORY_STEP = 1.72;
const FUTURE_STORY_STEP = 2.05;
```

These control how long each automatic savings/future-world beat stays on screen.

## Mobile scrolling architecture

Desktop/trackpad layouts can still use GSAP ScrollSmoother. Touch layouts intentionally use native scrolling plus ScrollTrigger. The scroll-driven visuals are still GSAP animations; only the physical touch scrolling is left native because it is more reliable for mobile pinned storytelling.

## GSAP dependency

GSAP, ScrollTrigger, ScrollToPlugin and ScrollSmoother are loaded from jsDelivr in `index.html`. The prototype therefore needs an internet connection when opened locally unless those libraries are hosted with the project.

## Prototype calculation

The water-use calculation is still a prototype estimate. Replace the assumptions with final sourced values before presenting the calculated litres/cost as factual measurements.
