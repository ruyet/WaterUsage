# Water You Don't See — v24

v24 moves the interaction and storytelling motion to GSAP 3.15.0 using ScrollTrigger, ScrollToPlugin and ScrollSmoother.

## What changed

- Replaced the old manual scroll-animation loop with GSAP ScrollTrigger timelines.
- Added ScrollSmoother for smoother page movement, including light touch smoothing on mobile.
- Shower answers no longer require dragging a rotary control. The knobs are now visual feedback and answers use large tap targets.
- The inactive shower knob is non-interactive and no longer says `FLOW` before question 2.
- Shower questions require an actual answer before the Next button is enabled.
- Moved the shower Next button below the control panel, matching the sink interaction pattern.
- Shower → Sink and Sink → Laundry now use a GSAP transition plus a locked, animated page movement instead of jumping to the next chapter.
- Screen 08 is now an automatic story: €12 monthly → kapsalons → beers → yearly saving changes automatically after entering the section.
- The automatic savings text uses staggered rolling word motion rather than simple fades.
- The “Otherwise... this will be the new world” title and the two lake comparisons now form one automatic sequence, so users do not have to scroll through three separate long screens.
- The waterfall morph is still controlled by scrolling, but its range is shorter and uses ScrollTrigger scrubbing.
- Decorative water, money rain and scroll-cue movement are driven by GSAP instead of CSS keyframe animations.
- The site still respects `prefers-reduced-motion`.

## Easy timing adjustments

In `script.js` near the top:

```js
const AUTO_STORY_STEP = 1.08;
const FUTURE_STORY_STEP = 1.55;
```

- `AUTO_STORY_STEP` controls how quickly the Screen 08 saving messages change.
- `FUTURE_STORY_STEP` controls the title/Lake Mead/Lake Urmia automatic sequence.

In `styles.css` inside the `v24` section:

```css
--saving-auto-height: 125svh;
--future-auto-height: 125svh;
--morph-scroll: 245svh;
```

The first two control how much page distance the two automatic sections occupy. `--morph-scroll` controls how much scrolling is needed to scrub through the waterfall morph.

## GSAP dependency

GSAP and the three GSAP plugins are loaded from jsDelivr in `index.html`. The project therefore needs an internet connection when opened locally, or those CDN files can later be hosted with the site.

## Prototype calculation

The water-use calculation is still the existing prototype model. Replace prototype assumptions with final sourced values before presenting them as factual data.
