# Riso Camera

A real-time risograph camera effect built with [p5.js](https://p5js.org/) and [p5.riso](https://antiboredom.github.io/p5.riso/). Point your webcam at anything and see it rendered as a two-color risograph print — live.

https://riso.cam

## What it does

The app processes your webcam feed through two simulated Riso ink layers, applying dithering and halftone effects to mimic the look of a risograph-printed photograph.

- **Ink 1** — rendered with a dither algorithm (Atkinson, Bayer, Floyd-Steinberg, or plain threshold)
- **Ink 2** — rendered with a halftone pattern (circle, line, square, or cross)
- Both layers are composited with transparency to create color mixing, just like a real Riso print

## Features

- Live webcam feed processed in real time at 6 fps
- Two independently configurable ink layers with 15 Riso ink colors
- Effect modes: Dither + Halftone, Dither only, or Halftone only
- Dither algorithms: Atkinson, Bayer, Floyd-Steinberg, Threshold
- Halftone shapes: Circle, Line, Square, Cross
- Adjustable threshold and frequency parameters
- Freeze frame — capture a still and tweak the settings before saving
- Save the result as a PNG
- Front/rear camera flip (great on mobile)
- Mobile-friendly layout with safe area support

## Ink palette

Fluorescent Pink, Blue, Yellow, Orange, Red, Teal, Purple, Green, Cornflower, Sunflower, Aqua, Bubblegum, Orchid, Mint, Black

## Controls

| Control | Action |
|---|---|
| Shutter button | Freeze frame |
| Retake | Return to live camera |
| Save | Download as PNG |
| Flip button | Switch front/rear camera |
| ⚙ | Open settings panel |

## Dependencies

- [p5.js](https://p5js.org/) v1.9.0 (loaded from CDN)
- [p5.riso](https://github.com/antiboredom/p5.riso) (local)
