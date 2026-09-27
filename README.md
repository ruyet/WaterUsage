# Water You Don't See v9

This version keeps the existing water-story prototype intact, but completely rebuilds the opening shower interaction from scratch.

## Shower redesign in v9

1. The old shower riser, shower head, control bar and separate Q2 shower chapter were removed.
2. A new simple front-view wall-mounted shower fixture was drawn as lightweight inline SVG.
3. The shower keeps the existing warm paper / black ink style, with a subtle bathroom-grid texture and blue water accents.
4. Q1 and Q2 now happen in one clear shower interface instead of two disconnected scroll screens.
5. Q1 asks for shower duration and highlights the right dial.
6. Q2 asks for shower frequency and highlights the left dial.
7. The inactive dial is visually muted so users immediately know which control to use.
8. Dials support touch / pointer turning, tap stepping, mouse wheel and keyboard arrows.
9. The selected value is shown directly inside the physical dial.
10. A connected Next button sits below the mixer, matching the physical-control metaphor.
11. Pressing Next after Q1 triggers a full-screen water transition: the water level rises, briefly covers the screen, then drains back down while Q2 replaces Q1.
12. The transition explicitly says “Answer saved / Next question” so the question change is clear.
13. After Q2, the button becomes Continue and moves the user into the sink chapter.
14. The shower answers still feed directly into the existing personalised litre calculation.
15. Reduced-motion and keyboard focus behaviour are retained for accessibility.

## Important prototype calculations

The personalised calculation is intentionally easy to edit in `script.js`.

Current assumptions:
- Shower flow: 8 L/min
- Dishwasher session: 10 L
- Filled sink session: 18 L
- Running-tap dishwashing session: 34 L
- Laundry load: 50 L
- Other household baseline: 28 L/day

These are prototype assumptions for interaction design. Replace them with the exact values from your chosen Dutch sources before presenting the final data as factual.

The monthly cost is also still a prototype visual calculation. Replace it once your final cost calculation is defined.

## Run locally

Open `index.html` directly or use:
- VS Code Live Server
- `python -m http.server`

Best viewport:
- 390 × 844
- 393 × 852
- similar modern mobile size
