# Water You Don't See v16

This version continues from v14 and focuses on the transition from the sink into the scrolling story.

## Changes in v16

- After Q4 is answered, a clear **SCROLL TO CONTINUE** cue appears so the interaction pattern deliberately changes from clicking back to scrolling.
- The old **Down the Drain / Follow It** 3D tunnel chapter was removed completely.
- Laundry now follows the sink directly and becomes the start of the scrolling part of the story.
- The washing-machine water now has a subtle moving surface, shimmer, and small vertical movement similar to the sink water.
- Only the laundry/clothes rotate during the scroll animation; the water stays level like real water.
- The laundry screen was visually refined to use the same warm paper, grid, black-line and soft metal language as the shower and sink screens.
- The daily-result screen was redesigned as a cleaner measurement card with a large litres-per-day value and a readable comparison to the Dutch average.
- The result comparison updates with the user's calculated value.
- The glasses particle section and money section keep their existing scroll behaviour.
- The later savings content was otherwise left alone for a later pass.

## Prototype calculations

The water-use calculation remains the same prototype model as v14. Replace prototype assumptions with the final sourced values before presenting them as factual data.


Additional changes in v16:
- Rebuilt the money/savings/future ending flow to match the Gen Z Figma direction.
- Added GIF placeholder cards for sections where you will replace them later.
- Added a single sticky savings-story sequence (monthly savings, kapsalons, beers, yearly amount, outfit).
- Kept action cards as the practical follow-up section.
- Reworked the future section into staged drought visuals, a waterfall before/after change, and a reaction panel.
- Rebuilt the end into a dark 'before changes' screen transitioning into a bright 'after changes' screen with restart button.


## v18 ending sequence
- Rebuilt the final future section to match the user's red-border storyboard: every non-morph beat is a full 100svh screen.
- Added exact comparison visuals cropped from the supplied storyboard image.
- `morph.gif` is decoded into 29 lightweight WebP frames so scroll position can scrub the animation deterministically.
- The morph chapter is 360svh, making frame progression deliberately slower than a normal GIF playback.
- The reaction visual is centered on its own full screen. The uploaded ZIP only contained `figma_6.png` for this reaction, not an animated GIF, so that still is used as the fallback.
- The warning copy has its own full screen.
- The final before/after section uses `before.png` and `after.png` in the exact same position and crossfades with opacity only. No vertical movement or scaling is applied.
- The Start Again button is absolutely positioned below the image/title composition and fades in later, so it never pushes the final visual upward.


## v19
- Rebuilt savings beats as individual 240svh sticky scenes so each answer/meme remains truly centered and requires deliberate scrolling.
- Added lightweight native proximity snapping; no GSAP dependency or heavy effects.
- Rebuilt future title/comparison/reaction/warning beats as 220svh sticky scenes.
- Cropped comparison source screenshots to imagery only and recreated captions as real italic HTML text.
- Preserved the existing scroll-scrubbed morph animation and slowed its scroll range further.
- Shortened the shower fixture and raised the control unit on mobile so Safari browser chrome does not cover as much of the controls.
