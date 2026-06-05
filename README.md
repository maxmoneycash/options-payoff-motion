# Options Payoff Motion

A fullscreen ASCII options payoff atlas built with Next.js and a custom canvas renderer. The page scrolls through ten payoff structures, drawing each curve as red ASCII math over an off-white or black field.

Live site: https://options-payoff-motion.vercel.app

## What It Shows

- Long call
- Long put
- Call spread
- Short straddle
- Call butterfly
- Put spread
- Short strangle
- Risk reversal
- Jade lizard
- Iron condor

Each diagram is generated from real option legs, strikes, premiums, breakeven markers, and payoff math. The red curve is drawn from the structure's critical prices rather than from static artwork.

## Tech

- Next.js App Router
- React
- Canvas-based ASCII renderer
- Scroll-driven diagram transitions
- Off-white, black, and red visual system

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For a production build:

```bash
npm run build
npm run start
```

## Editing The Atlas

The main file is `components/CipherNative.tsx`.

High-value edit points:

- `payoffSetups`: option legs, strikes, premiums, breakevens, and stats
- `diagramConfigs`: visible labels, formulas, annotations, and layout mode
- `drawPayoffCurve`: payoff geometry and ASCII plotting
- `drawMathArtDiagram`: page-level ASCII composition
- `colorsForProgress`: off-white, black, muted text, and red curve palette

To add another diagram, add one entry to `payoffSetups` and one matching entry to `diagramConfigs`. The scroll sequence is generated from those arrays.

Supported layout modes:

- `monolith`
- `split`
- `field`
- `constellation`

## Deployment

This project is ready for Vercel:

```bash
vercel
```

For production:

```bash
vercel --prod
```
