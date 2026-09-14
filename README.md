# Habit Grid

A mobile-first daily habit tracker prototype.

## What it does

- 8 habit rows
- continuous date timeline across month boundaries
- opens around the current day
- scroll left for previous days
- future days remain visible but cannot be checked
- five-circle flower animation on completion
- completed cells resolve into flat color
- sticky habit labels
- saves completion state in `localStorage`
- reduced-motion support

## Run it

Open `index.html` directly in a browser.

For local development, you can also run a tiny server:

```bash
python3 -m http.server
```

Then visit:

```text
http://localhost:8000
```

## Files

- `index.html`
- `styles.css`
- `app.js`

The habit names and temporary palette are at the top of `app.js`.
