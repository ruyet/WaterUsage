# Water You Don't See v3

This version follows the supplied Figma concept much more closely while keeping the animated collage and halftone direction from v2.

## Main changes from v2

1. Starts with a large shower head instead of a generic title page.
2. Q1 sits inside a shower-control bar.
3. Shower duration is chosen with the right rotary control.
4. Scroll reveals water from the shower head.
5. Water intensity changes based on the selected shower duration and frequency.
6. Q2 uses the left rotary control.
7. Sink section uses clickable stacked plates for washing frequency.
8. A second sink question lets the user choose dishwasher, filled sink, or running tap.
9. Scroll transitions into a perspective drain tunnel.
10. Washing-machine question uses the machine's own circular buttons.
11. The washing-machine drum fills and rotates while scrolling.
12. Results are personalised from the selected habits.
13. The main litre result is full-screen, bold, and centered.
14. Glasses fly into the viewport during the scale comparison.
15. Euro symbols fall during the money section.
16. The Figma placeholder memes and reference assets are reused from the uploaded SVG.
17. Savings are translated into relatable items.
18. Action section uses large tilted paper-cut cards.
19. Future-consequence section uses the before/after dry-land imagery from the concept.
20. The visual style uses halftone texture, cream paper, hard black outlines, lime, blue, pink, red, cutout collage, and oversized typography.
21. No em dashes are used in the website copy.

## Important prototype calculations

The personalised calculation is intentionally easy to edit in `script.js`.

Current assumptions:
- Shower flow: 8 L/min
- Dishwasher session: 10 L
- Filled sink session: 18 L
- Running-tap dishwashing session: 34 L
- Laundry load: 50 L
- Other household baseline: 28 L/day

These are prototype assumptions for interaction design. Replace them with the exact values from your chosen Dutch sources before you present the final data as factual.

The monthly cost is also still a prototype visual calculation. Replace it once your final cost calculation is defined.

## Run locally

Open `index.html` directly or use:
- VS Code Live Server
- `python -m http.server`

Best viewport:
- 390 × 844
- 393 × 852
- similar modern mobile size
