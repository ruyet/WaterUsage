# Water Story Mobile v28

## Stability changes

- Native browser scrolling is now the only scroll coordinate system. GSAP + ScrollTrigger still controls all chapter animation and pinning. ScrollSmoother and ScrollToPlugin were removed because this project is mostly pinned storytelling, where a second transformed scroll layer can create handoff drift.
- Every pinned chapter has an explicit `refreshPriority` matching document order. All triggers are created first, then one ordered `ScrollTrigger.refresh()` measures the complete page.
- The two timed autoplay chapters (08 savings and the future-world sequence) now use a hidden 2.2-viewport GSAP pin buffer. This prevents a strong wheel/touch gesture from skipping across the trigger before the input gate starts.
- When autoplay finishes, the document is moved to the final 2px of that buffer while the chapter is still pinned. The move is visually invisible; the next deliberate scroll releases the chapter immediately.
- Guided question transitions no longer refresh every ScrollTrigger after their overlay closes. Their geometry does not change, and avoiding mid-session refreshes prevents unrelated chapters from re-evaluating while the user is scrolling.

## Main pacing values

In `script.js`:

```js
const AUTO_STORY_STEP = 1.72;
const FUTURE_STORY_STEP = 2.05;
const AUTO_GATE_VIEWPORTS = 2.2;
```

`AUTO_GATE_VIEWPORTS` is a safety buffer, not visible scroll distance. Do not reduce it too aggressively; it protects autoplay sections against fast-scroll overshoot.
