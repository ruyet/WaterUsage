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
