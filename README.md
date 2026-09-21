# Follow the Flow — Mobile Water Story

A mobile-first scrollytelling prototype for a Fontys Visual Storytelling project.

## Files
- `index.html` — page structure
- `styles.css` — complete mobile styling
- `script.js` — scroll interactions and editable data constants

## How to run
Open `index.html` in a browser. For the intended design, use a mobile viewport around 390 × 844 px.

For best results, run it through a simple local server, for example:
- VS Code Live Server
- `python -m http.server`

## Important data note
The design is production-ready as a prototype, but not every number in the experience is presented as a final researched fact.

In `script.js`, the `DATA` object contains:
- `dailyLitres: 118`
- `targetLitres: 100`
- `exampleShowerFlow: 8`
- `exampleShowerMinutes: 10`
- `showerFrequencyPerWeek: 6`
- `shorterByMinutes: 2`

The shower flow is explicitly treated as an example assumption in the UI. Replace it with the flow rate you decide to use from your final source.

The usage breakdown percentages in the 'Where does it go?' section are also clearly marked as illustrative placeholders. Replace those with the values from your selected Dutch dataset before presenting this as a data-backed final MVP.

## Design direction
- editorial / data journalism
- warm neutral background
- water-blue as the main semantic colour
- large typography
- almost no conventional app chrome
- story controlled primarily through scrolling
- zoom/scale used to explain quantity

## Suggested next iterations
1. Replace the placeholder breakdown percentages with exact values from your dataset.
2. Test whether glasses, bottles, or another object communicates scale best.
3. Validate the three shower-behaviour cards with target users.
4. Test whether the 'music as a timer' concept feels useful or gimmicky.
5. Replace generic labels with your final research-backed wording.
