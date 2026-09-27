# Water Story Mobile v33

Changes in v33:

- Shorter, consistent touch momentum on mobile so a single iPhone flick does not jump across several pinned chapters.
- Pinned chapters still begin at `top top`; no forced early scroll-to alignment.
- Action/tip cards are back to compact, content-driven card heights instead of stretched full-screen rows.
- Savings story is now only two beats: personalized yearly saving, then a rounded phone-plan / Spotify comparison, then straight to the tips.
- Spotify Premium Individual NL comparison uses EUR 13.99/month (checked September 2026). Phone plan remains an illustrative EUR 25/month assumption.
- Daily-estimate comparison starts earlier while the litre number is still filling.
- Existing 200 ml glass calculation remains in place.
- Existing morph now has an `EXAMPLE NAME` caption underneath, ready to replace with the official location/source name.

Easy values in `script.js`:

- `PHONE_PLAN_EUR = 25`
- `SPOTIFY_EUR = 13.99`
- Touch momentum is controlled in `setupSmoothScrolling()` by the `momentum` callback.

## v35 morph sequencing hotfix
- Nationaal Park Veluwezoom and Nauyaca Waterfalls now use one shared `MORPH_SCROLL_VIEWPORTS` value.
- Pin refresh order follows DOM order: Veluwezoom is measured before Nauyaca, so Nauyaca includes the first morph's pin spacing.
- The final morph hides the scroll cue and hands the background directly to the black ending when it releases.


## v41 final scroll-cue cleanup
- Every scroll instruction now says `SCROLL DOWN TO CONTINUE`.
- Morph progress no longer swaps between different cue messages.
- Scroll cues are no longer pill-shaped: border, background, blur and shadow-card styling were removed.
- The cue is now a small vertical instruction with a down arrow, making it read as a scroll affordance instead of a button.


## v42 final morph + iOS shower fit
- Replaced both environmental morph sequences with the two supplied 120-frame GIF sources, exported as 120 WebP frames each.
- Both morph ScrollTriggers now scrub all 120 frames while keeping the existing scroll distance.
- Morph files are cache-warmed with a six-request worker pool instead of retaining 240 decoded images in memory.
- The shower controls use `visualViewport.height` for Safari/in-app browser chrome. The shower fixture stays fixed; mixer, answer panel, and Next Question move upward only when the actually visible viewport is shorter.

## v43 — smoother touch morph scrubbing
- Mobile morphs use a longer 2.75-viewport scroll distance; desktop keeps 1.85 viewports.
- The 120-frame morph sequence now runs from a real GSAP playhead tween. Numeric scrub therefore smooths touch deltas instead of reading raw ScrollTrigger progress frame-by-frame.
- Touch morphs use 0.18s scrub smoothing; desktop uses 0.08s.
- iPhone/Android flick momentum is slightly longer only while a morph is active; all other chapters keep the existing short momentum behavior.
- Final/first frames are forced at section boundaries so smoothing cannot bleed into the next chapter.


## v45
Replaced both morph sources with the user-supplied higher-quality MP4s. They are re-encoded as H.264/yuv420p all-intra video (every frame a keyframe) at their native 25 fps / 120 frames so the existing iOS scroll-scrub seeking remains responsive while avoiding extra quality loss. Posters were regenerated from the new videos.


## v46
Prevents Safari from briefly flashing the upcoming morph canvas during the Lake Urmia autoplay-to-scroll handoff. Morph chapters remain laid out for ScrollTrigger but are paint-hidden until their own trigger actually starts.
