# Water You Don't See

**Final commit: production-ready hand-in build**

This repository contains the final version of **Water You Don't See**, a mobile-first interactive visual story about everyday household water use in the Netherlands. The experience asks users about familiar routines, translates those answers into understandable water and cost estimates, and ends with practical actions and environmental consequences.

The final build is the result of iterative usability testing on real mobile devices. The interaction flow, chapter pacing, scroll behavior, iOS viewport handling, and environmental morphs should be treated as validated behavior unless a future requirement explicitly calls for a redesign.

## Project goal

The project is designed to make personal water use feel concrete rather than abstract. Instead of only presenting statistics, the story lets users enter parts of their own routine and then connects those choices to litres, familiar comparisons, estimated costs, possible yearly savings, and environmental examples.

The primary experience is mobile. Desktop is supported, but layout and interaction decisions prioritize touch devices and mobile Safari.

## Experience structure

1. **Shower routine:** shower duration and showers per week.
2. **Sink routine:** dishwashing frequency and washing method.
3. **Laundry routine:** laundry frequency.
4. **Personal result:** estimated daily water use and comparison with the Dutch average.
5. **Make it visible:** daily litres translated into 200 ml glasses.
6. **Cost:** rough monthly water + shower-heating estimate.
7. **Savings:** potential yearly savings and relatable subscription comparisons.
8. **Actions:** personalized suggestions based on the user's answers.
9. **Future story:** real-world environmental comparisons followed by two scroll-scrubbed drought morphs.
10. **Closing message:** final call to reduce unnecessary water use and restart the story.

## Technology

The project intentionally has no build step or framework. It uses:

- Semantic HTML for the complete story structure.
- CSS for the visual system, responsive layout, chapter scenes, and non-critical decorative motion.
- Vanilla JavaScript for state, calculations, interactions, and accessibility state.
- GSAP + ScrollTrigger for chapter transitions, pinned storytelling, autoplay sequences, and scroll-driven motion.
- H.264 MP4 morph videos for efficient scroll scrubbing on mobile browsers.

GSAP and ScrollTrigger are loaded from jsDelivr in `index.html`. Google Fonts provides Inter and Archivo Black.

## File structure

```text
water-story-mobile-final/
├── index.html
├── styles.css
├── script.js
├── README.md
└── assets/
    ├── lake_mead_only.png
    ├── lake_urmia_only.png
    ├── payday-cash.gif
    ├── shocked dog.gif
    ├── morph_veluwe_poster.webp
    ├── morph_veluwe_scrub.mp4
    ├── morph_nauyaca_poster.webp
    └── morph_nauyaca_scrub.mp4
```

## Running the project

No installation is required. For development, serve the folder through a local HTTP server rather than opening `index.html` directly. For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser on the same machine. For mobile testing, use the computer's local network address or deploy the folder to the project web server.

## Interaction architecture

### Scroll control

`script.js` keeps native scrolling as the base behavior and uses ScrollTrigger only where the story needs a held or pinned viewport. Touch normalization is enabled on coarse-pointer devices to prevent one iPhone flick from accidentally crossing several chapters.

Some chapters deliberately lock manual scrolling while the user must answer a question or while a guided transition is active. Programmatic chapter alignment still works while that input gate is active.

### iOS viewport handling

Mobile Safari changes the visible viewport when its browser bars expand or collapse. The shower chapter therefore reads `visualViewport.height` and stores it in `--shower-vvh`. Only the lower shower controls move upward when the visible area becomes short; the shower fixture remains visually anchored.

This behavior is important for smaller screens and in-app browsers and should not be replaced with a simple `100vh` assumption.

### Environmental morphs

The two final morphs use scroll-scrubbed H.264 videos rather than image sequences:

- `morph_veluwe_scrub.mp4`
- `morph_nauyaca_scrub.mp4`

Both files contain 120 frames at 25 fps and are encoded all-intra, meaning every frame is a keyframe. This allows Safari to seek directly to requested frames while scrolling without decoding a long chain of dependent frames.

JavaScript allows only one video seek at a time. If the user moves again while a frame is decoding, only the newest requested frame is kept. This prevents a backlog of obsolete seek requests and is important for smooth mobile performance.

The morph chapters are also hidden from painting until their own ScrollTrigger becomes active. This prevents Safari from briefly flashing the upcoming morph during the handoff from the Lake Urmia autoplay chapter.

## Calculation assumptions

The calculation constants are grouped near the top of `script.js` so they can be reviewed without searching through UI code.

Current assumptions include:

- Water tariff: **€1.51 per m³**.
- Shower target used for the savings story: **5 minutes**.
- Warm-water shower saving approximation: **€15 per avoided daily shower-minute per year**.
- Illustrative phone plan: **€25 per month**.
- Spotify Premium Individual comparison: **€13.99 per month**.
- Glass comparison: **200 ml per glass**.

The result is an educational estimate, not a utility-bill calculator. Research and story content were informed by Dutch government/CBS water-use data, Milieu Centraal guidance, and the project's own user research.

## Code conventions

- CSS classes use descriptive kebab-case names.
- JavaScript variables and functions use camelCase.
- State classes use the `is-*` convention, for example `is-selected` and `is-active`.
- Modifier classes describe their component, for example `action-card--lime` and `laundry-piece--shirt-pink`.
- IDs are reserved for unique interactive elements, chapter anchors, and JavaScript targets.
- Comments explain architecture, browser workarounds, calculations, or non-obvious interaction decisions rather than documenting version history.

## Maintenance notes

The current CSS cascade has been cleaned of unused prototype selectors while preserving the tested declaration order. Do not casually reorder later responsive/interaction overrides: several of them intentionally refine earlier chapter styles without changing the underlying visual composition.

When changing chapter heights or ScrollTrigger pin distances, always test the complete story from the beginning. Pin spacers affect the measured positions of every chapter below them, so changes to one held section can influence later handoffs.

When replacing a morph video, keep the same filename or update both `index.html` and the corresponding poster. For best mobile scrubbing performance, keep the source H.264-compatible and all-intra/keyframe-per-frame.

## Final QA checklist

Before deployment, verify the following on a real iPhone as well as desktop:

- The opening sequence remains visible long enough to read.
- Both shower questions are usable with touch dragging and the ± controls.
- The Next Question button remains visible with Safari browser chrome expanded.
- Sink and laundry answer gates cannot be skipped.
- Pinned chapters do not leave blank gaps or jump across multiple sections.
- Only one scroll instruction is visible at a time.
- Both environmental morphs scrub smoothly and do not flash before entry.
- The final black closing screen appears correctly and Start Over returns to the beginning.

---

**Status: FINAL.** This is the cleaned and documented final commit of the tested experience.
