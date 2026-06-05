'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

type Cell = {
  char: string;
  alpha: number;
  tone: Tone;
};

type Tone = 'ink' | 'muted' | 'red';

type Frame = Cell[][];

type Particle = {
  char: string;
  tone: Tone;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  a0: number;
  a1: number;
  begin: number;
  end: number;
  seed: number;
};

type Panel = {
  eyebrow: string;
  title: string;
  body: string;
  reviews: Array<{
    quote: string;
    author: string;
    role: string;
  }>;
  cta: string;
  meta: string;
};

type Layout = {
  positionLeft: number;
  positionRight: number;
  frameYCentered: number;
  textLeftX: number;
  textRightX: number;
  textColW: number;
  textTopY: number;
};

type TransitionPack = {
  entrance: Particle[];
  positions: Array<{ x: number; y: number }>;
  pairs: Array<{ out: Particle[]; in: Particle[] }>;
};

const OFFWHITE = '#f1ede3';
const BLACK = '#11100e';
const RED = '#c51f2b';
const MUTED = '#7a746b';
const ASH = ['.', ':', '*', '+', '-', '`', "'"];
const BARS = '▁▂▃▄▅▆▇█';

type Palette = {
  bg: string;
  ink: string;
  muted: string;
  red: string;
};

type OptionLeg = {
  label: string;
  type: 'call' | 'put';
  side: 'long' | 'short';
  strike: number;
  premium: number;
  quantity: number;
};

type PayoffSetup = {
  symbol: string;
  subtitle: string;
  spot: number;
  range: [number, number];
  legs: OptionLeg[];
  marks: Array<{ value: number; label: string }>;
  stats: Array<{ label: string; value: string }>;
};

type DiagramConfig = {
  signature: string;
  formulas: string[];
  annotations: string[];
  layout: 'monolith' | 'split' | 'field' | 'constellation';
};

const payoffSetups: PayoffSetup[] = [
  {
    symbol: 'SPY · LONG CALL',
    subtitle: '21 jun · expiry payoff',
    spot: 524,
    range: [480, 570],
    legs: [
      { label: '+1 520C', type: 'call', side: 'long', strike: 520, premium: 8.4, quantity: 1 },
    ],
    marks: [
      { value: 520, label: 'K' },
      { value: 528.4, label: 'BE' },
      { value: 524, label: '' },
    ],
    stats: [
      { label: 'debit', value: '8.40' },
      { label: 'max loss', value: '-840' },
      { label: 'max gain', value: 'open' },
    ],
  },
  {
    symbol: 'SPY · LONG PUT',
    subtitle: '21 jun · downside convexity',
    spot: 524,
    range: [470, 550],
    legs: [
      { label: '+1 515P', type: 'put', side: 'long', strike: 515, premium: 7.2, quantity: 1 },
    ],
    marks: [
      { value: 507.8, label: 'BE' },
      { value: 515, label: 'K' },
      { value: 524, label: '' },
    ],
    stats: [
      { label: 'debit', value: '7.20' },
      { label: 'max loss', value: '-720' },
      { label: 'max gain', value: '+50780' },
    ],
  },
  {
    symbol: 'SPY · CALL SPREAD',
    subtitle: 'long 520C / short 540C',
    spot: 524,
    range: [495, 565],
    legs: [
      { label: '+1 520C', type: 'call', side: 'long', strike: 520, premium: 8.4, quantity: 1 },
      { label: '-1 540C', type: 'call', side: 'short', strike: 540, premium: 2.1, quantity: 1 },
    ],
    marks: [
      { value: 520, label: 'K1' },
      { value: 526.3, label: 'BE' },
      { value: 540, label: 'K2' },
    ],
    stats: [
      { label: 'debit', value: '6.30' },
      { label: 'max loss', value: '-630' },
      { label: 'max gain', value: '+1370' },
    ],
  },
  {
    symbol: 'SPY · SHORT STRADDLE',
    subtitle: 'short 525C / short 525P',
    spot: 524,
    range: [485, 565],
    legs: [
      { label: '-1 525C', type: 'call', side: 'short', strike: 525, premium: 9.6, quantity: 1 },
      { label: '-1 525P', type: 'put', side: 'short', strike: 525, premium: 8.9, quantity: 1 },
    ],
    marks: [
      { value: 506.5, label: 'BE' },
      { value: 525, label: 'K' },
      { value: 543.5, label: 'BE' },
    ],
    stats: [
      { label: 'credit', value: '18.50' },
      { label: 'max gain', value: '+1850' },
      { label: 'max loss', value: 'open' },
    ],
  },
  {
    symbol: 'SPY · CALL BUTTERFLY',
    subtitle: '510/525/540 broken symmetry',
    spot: 524,
    range: [490, 560],
    legs: [
      { label: '+1 510C', type: 'call', side: 'long', strike: 510, premium: 18.2, quantity: 1 },
      { label: '-2 525C', type: 'call', side: 'short', strike: 525, premium: 8.4, quantity: 2 },
      { label: '+1 540C', type: 'call', side: 'long', strike: 540, premium: 2.9, quantity: 1 },
    ],
    marks: [
      { value: 514.3, label: 'BE' },
      { value: 525, label: 'K' },
      { value: 535.7, label: 'BE' },
    ],
    stats: [
      { label: 'debit', value: '4.30' },
      { label: 'max loss', value: '-430' },
      { label: 'max gain', value: '+1070' },
    ],
  },
  {
    symbol: 'SPY · PUT SPREAD',
    subtitle: 'long 515P / short 495P',
    spot: 524,
    range: [470, 545],
    legs: [
      { label: '+1 515P', type: 'put', side: 'long', strike: 515, premium: 7.2, quantity: 1 },
      { label: '-1 495P', type: 'put', side: 'short', strike: 495, premium: 2.15, quantity: 1 },
    ],
    marks: [
      { value: 494.95, label: 'K2' },
      { value: 509.95, label: 'BE' },
      { value: 515, label: 'K1' },
    ],
    stats: [
      { label: 'debit', value: '5.05' },
      { label: 'max loss', value: '-505' },
      { label: 'max gain', value: '+1495' },
    ],
  },
  {
    symbol: 'SPY · SHORT STRANGLE',
    subtitle: 'short 500P / short 545C',
    spot: 524,
    range: [465, 580],
    legs: [
      { label: '-1 500P', type: 'put', side: 'short', strike: 500, premium: 4.65, quantity: 1 },
      { label: '-1 545C', type: 'call', side: 'short', strike: 545, premium: 5.4, quantity: 1 },
    ],
    marks: [
      { value: 489.95, label: 'BE' },
      { value: 500, label: 'P' },
      { value: 545, label: 'C' },
      { value: 555.05, label: 'BE' },
    ],
    stats: [
      { label: 'credit', value: '10.05' },
      { label: 'max gain', value: '+1005' },
      { label: 'max loss', value: 'open' },
    ],
  },
  {
    symbol: 'SPY · RISK REVERSAL',
    subtitle: 'long 535C / short 505P',
    spot: 524,
    range: [470, 575],
    legs: [
      { label: '+1 535C', type: 'call', side: 'long', strike: 535, premium: 4.2, quantity: 1 },
      { label: '-1 505P', type: 'put', side: 'short', strike: 505, premium: 4.1, quantity: 1 },
    ],
    marks: [
      { value: 505, label: 'P' },
      { value: 535.1, label: 'BE' },
      { value: 535, label: 'C' },
    ],
    stats: [
      { label: 'debit', value: '0.10' },
      { label: 'downside', value: 'short put' },
      { label: 'upside', value: 'long call' },
    ],
  },
  {
    symbol: 'SPY · JADE LIZARD',
    subtitle: 'short 505P + 535/550C spread',
    spot: 524,
    range: [470, 570],
    legs: [
      { label: '-1 505P', type: 'put', side: 'short', strike: 505, premium: 5.35, quantity: 1 },
      { label: '-1 535C', type: 'call', side: 'short', strike: 535, premium: 4.9, quantity: 1 },
      { label: '+1 550C', type: 'call', side: 'long', strike: 550, premium: 1.75, quantity: 1 },
    ],
    marks: [
      { value: 496.5, label: 'BE' },
      { value: 505, label: 'P' },
      { value: 535, label: 'C1' },
      { value: 550, label: 'C2' },
    ],
    stats: [
      { label: 'credit', value: '8.50' },
      { label: 'call risk', value: '6.50' },
      { label: 'put risk', value: 'open' },
    ],
  },
  {
    symbol: 'SPX · IRON CONDOR',
    subtitle: '4600/4700/5200/5300',
    spot: 4968,
    range: [4400, 5500],
    legs: [
      { label: '+1 4600P', type: 'put', side: 'long', strike: 4600, premium: 9.2, quantity: 1 },
      { label: '-1 4700P', type: 'put', side: 'short', strike: 4700, premium: 25.6, quantity: 1 },
      { label: '-1 5200C', type: 'call', side: 'short', strike: 5200, premium: 21.8, quantity: 1 },
      { label: '+1 5300C', type: 'call', side: 'long', strike: 5300, premium: 7.6, quantity: 1 },
    ],
    marks: [
      { value: 4669.8, label: 'BE' },
      { value: 4700, label: 'P' },
      { value: 5200, label: 'C' },
      { value: 5230.2, label: 'BE' },
    ],
    stats: [
      { label: 'credit', value: '30.60' },
      { label: 'max loss', value: '-6940' },
      { label: 'max gain', value: '+3060' },
    ],
  },
];

const btcCandles = [
  { o: 105820, h: 106180, l: 105640, c: 106100, v: 0.42 },
  { o: 106100, h: 106340, l: 105980, c: 105985, v: 0.31 },
  { o: 105985, h: 106220, l: 105760, c: 106210, v: 0.55 },
  { o: 106210, h: 106560, l: 106180, c: 106540, v: 0.62 },
  { o: 106540, h: 106940, l: 106420, c: 106880, v: 0.78 },
  { o: 106880, h: 107120, l: 106700, c: 106710, v: 0.48 },
  { o: 106710, h: 106820, l: 106280, c: 106340, v: 0.61 },
  { o: 106340, h: 106480, l: 106020, c: 106040, v: 0.52 },
  { o: 106040, h: 106400, l: 105920, c: 106380, v: 0.44 },
  { o: 106380, h: 106820, l: 106340, c: 106760, v: 0.71 },
  { o: 106760, h: 107240, l: 106720, c: 107180, v: 0.83 },
  { o: 107180, h: 107540, l: 107080, c: 107520, v: 0.92 },
  { o: 107520, h: 107860, l: 107420, c: 107460, v: 0.66 },
  { o: 107460, h: 107640, l: 107240, c: 107290, v: 0.51 },
  { o: 107290, h: 107520, l: 107220, c: 107480, v: 0.58 },
  { o: 107480, h: 107900, l: 107440, c: 107820, v: 0.74 },
  { o: 107820, h: 108180, l: 107780, c: 107432, v: 0.88 },
];

const orderBook = [
  { price: 107448, size: 0.184, side: 'ask' },
  { price: 107446, size: 0.092, side: 'ask' },
  { price: 107440, size: 0.451, side: 'ask' },
  { price: 107436, size: 0.218, side: 'ask' },
  { price: 107432, size: 0.238, side: 'bid' },
  { price: 107430, size: 0.117, side: 'bid' },
  { price: 107428, size: 0.892, side: 'bid' },
  { price: 107424, size: 0.314, side: 'bid' },
];

const optionsRows = [
  { strike: 2640, callBid: 56.4, callAsk: 56.8, callIv: 14.2, putBid: 3.05, putAsk: 3.15, putIv: 13.8, highlight: false },
  { strike: 2650, callBid: 48.2, callAsk: 48.5, callIv: 13.9, putBid: 5.2, putAsk: 5.35, putIv: 13.5, highlight: false },
  { strike: 2660, callBid: 40.4, callAsk: 40.65, callIv: 13.6, putBid: 8.1, putAsk: 8.25, putIv: 13.4, highlight: false },
  { strike: 2670, callBid: 32.9, callAsk: 33.15, callIv: 13.3, putBid: 12.3, putAsk: 12.5, putIv: 13.6, highlight: false },
  { strike: 2680, callBid: 25.85, callAsk: 26.05, callIv: 13.4, putBid: 16.95, putAsk: 17.2, putIv: 13.9, highlight: true },
  { strike: 2690, callBid: 19.4, callAsk: 19.6, callIv: 13.7, putBid: 22.5, putAsk: 22.75, putIv: 14.3, highlight: false },
  { strike: 2700, callBid: 14.05, callAsk: 14.2, callIv: 14.2, putBid: 29.1, putAsk: 29.35, putIv: 14.8, highlight: false },
  { strike: 2710, callBid: 9.6, callAsk: 9.75, callIv: 14.8, putBid: 36.95, putAsk: 37.2, putIv: 15.4, highlight: false },
];

const equityCurve = [100, 104, 108, 113, 119, 124, 122, 127, 131, 128, 122, 116, 118, 121, 119, 113, 106, 99, 95, 91, 88, 86, 83, 87, 92, 95, 93, 96, 99, 102];

const bigDigits: Record<string, string[]> = {
  '0': ['╭─╮', '│ │', '│ │', '│ │', '╰─╯'],
  '1': ['╶┐ ', ' │ ', ' │ ', ' │ ', '╶┴╴'],
  '2': ['╭─╮', '  │', '╭─╯', '│  ', '╰─╴'],
  '3': ['╭─╮', '  │', ' ─┤', '  │', '╰─╯'],
  '4': ['╷ ╷', '│ │', '╰─┤', '  │', '  ╵'],
  '5': ['╭─╴', '│  ', '╰─╮', '  │', '╰─╯'],
  '6': ['╭─╴', '│  ', '├─╮', '│ │', '╰─╯'],
  '7': ['╶─╮', '  │', '  │', '  │', '  ╵'],
  '8': ['╭─╮', '│ │', '├─┤', '│ │', '╰─╯'],
  '9': ['╭─╮', '│ │', '╰─┤', '  │', '╶─╯'],
  '.': ['   ', '   ', '   ', '   ', ' ▪ '],
  ',': ['   ', '   ', '   ', '  ╷', ' ╶╯'],
  '-': ['   ', '   ', '╶─╴', '   ', '   '],
  '%': ['▪ ╱', ' ╱ ', ' ╱ ', '╱  ', '╱ ▪'],
  '$': [' ╭╴', '╶┼╮', ' │ ', '╶┼╯', ' ╰╴'],
  '+': ['   ', ' │ ', '╶┼╴', ' │ ', '   '],
  ' ': ['   ', '   ', '   ', '   ', '   '],
};

const panels: Panel[] = [
  {
    eyebrow: '01 · single leg · expiry',
    title: 'Start with the hockey stick.',
    body: 'A long call is the cleanest payoff shape on the board: fixed debit below the strike, convex upside above breakeven. Every other options structure starts by bending this line.',
    reviews: [
      {
        quote: 'The moment a new trader can sketch the hockey stick, they stop memorizing options and start seeing them.',
        author: 'Marcus Chen',
        role: 'Options educator, Helix Capital · 2025',
      },
      {
        quote: 'The ASCII payoff shape makes risk obvious before the Greeks make it precise.',
        author: 'Yelena Krasniqi',
        role: 'Derivatives strategist, Veriton · 2025',
      },
    ],
    cta: 'Sketch a call',
    meta: 'spy · long 520c · debit 8.40 · breakeven 528.40',
  },
  {
    eyebrow: '02 · vertical · defined risk',
    title: 'Cap the tail. Keep the thesis.',
    body: 'A vertical spread turns one open-ended curve into a defined-risk shape. The long strike buys convexity, the short strike sells back some upside, and the flat top shows the tradeoff.',
    reviews: [
      {
        quote: "The curve tells you the trade before the ticket does: what you paid, where you break even, and where the upside stops.",
        author: 'Tomas Reinhardt',
        role: 'Volatility trader, Lattice Markets · 2025',
      },
      {
        quote: "This is the right abstraction: payoff first, Greeks second, order ticket last.",
        author: 'Adetokunbo Adeyemi',
        role: 'Vol trader, Meridian Quant · 2024',
      },
    ],
    cta: 'Build a spread',
    meta: 'spy · 520/540 call vertical · debit 6.30 · max gain 13.70',
  },
  {
    eyebrow: '03 · four legs · income zone',
    title: 'Shape the range.',
    body: 'Multi-leg structures are geometry. The iron condor draws a plateau of profit between the short strikes and two cliffs outside the wings. The diagram should make that instantly legible.',
    reviews: [
      {
        quote: "A good payoff diagram is risk management compressed into a picture. You can see the danger zones without touching a calculator.",
        author: 'Hana Muller',
        role: 'Portfolio manager, Northstar Derivatives · 2025',
      },
      {
        quote: 'Once the payoff shape is visible, position sizing becomes a much more honest conversation.',
        author: 'Diego Ferrera',
        role: 'Systematic fund, Aresel Capital · 2024',
      },
    ],
    cta: 'Map the condor',
    meta: 'spx · 4600/4700/5200/5300 · credit 30.60',
  },
];

function createFrame(width = 40, height = 60): Frame {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ char: ' ', alpha: 0, tone: 'ink' as Tone })),
  );
}

function put(frame: Frame, row: number, col: number, char: string, alpha: number, tone: Tone = 'ink') {
  if (row < 0 || row >= frame.length || col < 0 || col >= frame[0].length || alpha <= 0 || char === ' ' || char === '') {
    return;
  }
  const current = frame[row][col];
  if (current.alpha <= alpha || current.char === ' ' || (tone === 'red' && current.tone !== 'red' && alpha >= 0.45)) {
    frame[row][col] = { char, alpha, tone };
  }
}

function write(frame: Frame, row: number, col: number, text: string, alpha = 1, tone: Tone = 'ink') {
  for (let index = 0; index < text.length; index++) {
    put(frame, row, col + index, text[index], alpha, tone);
  }
}

function line(frame: Frame, row: number, col: number, length: number, char = '─', alpha = 0.25, tone: Tone = 'ink') {
  for (let index = 0; index < length; index++) {
    put(frame, row, col + index, char, alpha, tone);
  }
}

function block(frame: Frame, row: number, col: number, length: number, char = '▒', alpha = 0.55, tone: Tone = 'ink') {
  for (let index = 0; index < length; index++) {
    put(frame, row, col + index, char, alpha, tone);
  }
}

function box(frame: Frame, row: number, col: number, width: number, height: number, alpha = 0.7) {
  put(frame, row, col, '╭', alpha);
  put(frame, row, col + width - 1, '╮', alpha);
  put(frame, row + height - 1, col, '╰', alpha);
  put(frame, row + height - 1, col + width - 1, '╯', alpha);
  for (let index = 1; index < width - 1; index++) {
    put(frame, row, col + index, '─', alpha);
    put(frame, row + height - 1, col + index, '─', alpha);
  }
  for (let index = 1; index < height - 1; index++) {
    put(frame, row + index, col, '│', alpha);
    put(frame, row + index, col + width - 1, '│', alpha);
  }
}

function phoneShell(frame: Frame) {
  const width = frame[0].length;
  const height = frame.length;
  const left = 1;
  const right = width - 2;
  const innerRight = width - 3;
  put(frame, 0, left, '▗', 1);
  put(frame, 0, right, '▖', 1);
  for (let col = 2; col < right; col++) put(frame, 0, col, '▀', 1);
  for (let row = 1; row < height - 1; row++) {
    put(frame, row, left, '▌', 1);
    put(frame, row, left + 1, '█', 1);
    put(frame, row, innerRight, '█', 1);
    put(frame, row, right, '▐', 1);
  }
  put(frame, height - 1, left, '▝', 1);
  put(frame, height - 1, right, '▘', 1);
  for (let col = 2; col < right; col++) put(frame, height - 1, col, '▄', 1);
  for (const row of [8, 9, 13, 14, 15, 17, 18, 19]) put(frame, row, 0, '▌', 1);
  for (let row = 14; row <= 19; row++) put(frame, row, width - 1, '▐', 1);
  const notch = Math.floor((width - 14) / 2);
  for (let col = 0; col < 14; col++) put(frame, 1, notch + col, '▄', 1);
  for (let col = 0; col < 14; col++) if (col !== 2 && col !== 11) put(frame, 2, notch + col, '█', 1);
  for (let col = 0; col < 14; col++) put(frame, 3, notch + col, '▀', 1);
}

function statusBar(frame: Frame) {
  write(frame, 2, 5, '9:41', 0.85);
  write(frame, 2, 38, '●●●', 0.55);
  write(frame, 2, 42, '78%', 0.8);
  put(frame, 2, 46, '▮', 0.85);
}

function bottomNav(frame: Frame, active: number) {
  line(frame, 50, 2, 36, '─', 0.18);
  const icons = ['◇', '◇', '◇', '◇', '◇'];
  icons[active] = '◆';
  const labels = ['home', 'trade', 'book', 'acct', 'more'];
  const cols = [4, 12, 20, 28, 35];
  for (let index = 0; index < icons.length; index++) {
    const selected = index === active;
    write(frame, 51, cols[index], icons[index], selected ? 1 : 0.42);
    write(frame, 52, cols[index] - 1, labels[index], selected ? 0.95 : 0.32);
  }
  for (let col = 16; col < 24; col++) put(frame, 53, col, '▬', 0.45);
}

function mergeFrame(target: Frame, source: Frame, rowOffset: number, colOffset: number) {
  for (let row = 0; row < source.length; row++) {
    for (let col = 0; col < source[0].length; col++) {
      const cell = source[row][col];
      if (cell.alpha > 0 && cell.char !== ' ') {
        target[row + rowOffset][col + colOffset] = cell;
      }
    }
  }
}

function formatPrice(price: number) {
  return price.toLocaleString('en-US');
}

function drawBigNumber(frame: Frame, row: number, col: number, value: string, alpha = 1) {
  let cursor = col;
  for (const char of value) {
    const glyph = bigDigits[char] ?? bigDigits[' '];
    const width = char === '.' || char === ',' ? 2 : 3;
    for (let lineIndex = 0; lineIndex < 5; lineIndex++) {
      write(frame, row + lineIndex, cursor, glyph[lineIndex], alpha);
    }
    cursor += width + 1;
  }
}

function optionLegPayoff(leg: OptionLeg, price: number) {
  const intrinsic = leg.type === 'call'
    ? Math.max(0, price - leg.strike)
    : Math.max(0, leg.strike - price);
  const perShare = leg.side === 'long'
    ? intrinsic - leg.premium
    : leg.premium - intrinsic;
  return perShare * leg.quantity * 100;
}

function totalPayoff(setup: PayoffSetup, price: number) {
  return setup.legs.reduce((sum, leg) => sum + optionLegPayoff(leg, price), 0);
}

function labelMoney(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
}

function uniqueSorted(values: number[]) {
  return Array.from(new Set(values.map(value => Number(value.toFixed(4))))).sort((a, b) => a - b);
}

function drawAsciiSegment(frame: Frame, x0: number, y0: number, x1: number, y1: number, alpha = 0.98) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const char = absDy === 0
    ? '━'
    : absDx === 0
      ? '┃'
      : absDx >= absDy * 1.8
        ? '━'
        : absDy >= absDx * 1.8
          ? '┃'
        : dy < 0
          ? '╱'
          : '╲';

  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = Math.round(x0 + dx * t);
    const y = Math.round(y0 + dy * t);
    put(frame, y, x, char, alpha, 'red');
  }
}

function drawPayoffCurve(frame: Frame, setup: PayoffSetup, row: number, col: number, width: number, height: number) {
  const [minPrice, maxPrice] = setup.range;
  const criticalPrices = uniqueSorted([
    minPrice,
    maxPrice,
    setup.spot,
    ...setup.legs.map(leg => leg.strike),
    ...setup.marks.map(mark => mark.value),
  ]).filter(price => price >= minPrice && price <= maxPrice);
  const values = criticalPrices.map(price => totalPayoff(setup, price));
  const minPayoff = Math.min(0, ...values);
  const maxPayoff = Math.max(0, ...values);
  const pad = Math.max(150, (maxPayoff - minPayoff) * 0.12);
  const lo = minPayoff - pad;
  const hi = maxPayoff + pad;
  const yFor = (value: number) => row + Math.round((hi - value) / Math.max(1, hi - lo) * (height - 1));
  const xFor = (price: number) => col + Math.round((price - minPrice) / Math.max(1, maxPrice - minPrice) * (width - 1));
  const zeroRow = yFor(0);

  write(frame, row, col - 4, labelMoney(maxPayoff), 0.45, 'muted');
  write(frame, row + height - 1, col - 4, labelMoney(minPayoff), 0.45, 'muted');

  for (let y = row; y < row + height; y++) {
    put(frame, y, col, '│', 0.22, 'muted');
  }
  for (let x = col; x < col + width; x++) {
    put(frame, zeroRow, x, x % 2 === 0 ? '─' : '.', 0.32, 'muted');
  }
  for (let y = row; y < row + height; y += 3) {
    for (let x = col + 2; x < col + width; x += 4) {
      put(frame, y, x, '.', 0.08, 'muted');
    }
  }

  for (const mark of setup.marks) {
    if (!mark.label) continue;
    const x = Math.max(col, Math.min(col + width - 1, xFor(mark.value)));
    for (let y = row; y < row + height; y++) put(frame, y, x, '┊', 0.28, 'muted');
    const label = mark.label;
    write(frame, row + height + 1, Math.max(1, Math.min(frame[0].length - label.length - 1, x - Math.floor(label.length / 2))), label, 0.68, 'muted');
  }

  const points = criticalPrices.map(price => ({
    x: Math.max(col, Math.min(col + width - 1, xFor(price))),
    y: Math.max(row, Math.min(row + height - 1, yFor(totalPayoff(setup, price)))),
  }));
  for (let index = 1; index < points.length; index++) {
    drawAsciiSegment(frame, points[index - 1].x, points[index - 1].y, points[index].x, points[index].y);
  }
  for (const point of points) put(frame, point.y, point.x, '■', 1, 'red');

  const spotX = Math.max(col, Math.min(col + width - 1, xFor(setup.spot)));
  for (let y = row; y < row + height; y++) put(frame, y, spotX, '│', 0.48, 'ink');
  write(frame, row - 1, Math.max(1, Math.min(frame[0].length - 10, spotX - 4)), `spot ${setup.spot}`, 0.62, 'ink');
}

function writePayoffLegs(frame: Frame, setup: PayoffSetup, row: number) {
  write(frame, row, 2, 'LEGS', 0.85);
  write(frame, row, 17, 'K', 0.45);
  write(frame, row, 24, 'prem', 0.45);
  line(frame, row + 1, 2, 36, '─', 0.18);
  setup.legs.forEach((leg, index) => {
    const legRow = row + 2 + index;
    const side = leg.side === 'long' ? '+' : '-';
    const kind = leg.type === 'call' ? 'C' : 'P';
    write(frame, legRow, 2, `${side}${leg.quantity}`, 0.75);
    write(frame, legRow, 6, `${leg.strike}${kind}`, 0.95);
    write(frame, legRow, 16, String(leg.strike), 0.45);
    write(frame, legRow, 24, leg.premium.toFixed(2), 0.6);
    put(frame, legRow, 34, leg.side === 'long' ? '╱' : '╲', 0.52);
  });
}

function writePayoffStats(frame: Frame, setup: PayoffSetup, row: number) {
  setup.stats.forEach((stat, index) => {
    const col = 2 + index * 12;
    write(frame, row, col, stat.label, 0.42);
    write(frame, row + 1, col, stat.value, 0.9);
  });
}

function writeLegTerms(frame: Frame, setup: PayoffSetup, row: number, col: number, alpha = 0.52) {
  setup.legs.slice(0, 5).forEach((leg, index) => {
    const side = leg.side === 'long' ? '+' : '-';
    const kind = leg.type === 'call' ? 'C' : 'P';
    const term = `${side}${leg.quantity > 1 ? leg.quantity : ''}${kind}${leg.strike}`;
    write(frame, row + Math.floor(index / 3), col + (index % 3) * 18, term, alpha);
  });
}

function drawTexture(frame: Frame, dense = false) {
  for (let row = 3; row < frame.length - 2; row += dense ? 3 : 5) {
    for (let col = 4; col < frame[0].length - 2; col += dense ? 5 : 8) {
      put(frame, row, col, row % 2 ? '.' : '+', dense ? 0.05 : 0.06, 'muted');
    }
  }
}

function drawMathArtDiagram(setup: PayoffSetup, config: DiagramConfig) {
  const frame = createFrame(96, 54);
  drawTexture(frame, config.layout === 'field');

  if (config.layout === 'split') {
    drawPayoffCurve(frame, setup, 12, 5, 52, 28);
    for (let row = 5; row < 48; row++) put(frame, row, 61, '┊', 0.16, 'muted');
    write(frame, 4, 64, config.signature, 0.9);
    config.formulas.forEach((formula, index) => write(frame, 8 + index * 3, 64, formula.slice(0, 30), index === 0 ? 0.82 : 0.56));
    config.annotations.forEach((annotation, index) => write(frame, 31 + index * 3, 64, annotation.slice(0, 29), 0.55 - index * 0.07));
    writeLegTerms(frame, setup, 45, 64, 0.56);
    write(frame, 47, 5, 'S ->', 0.52);
    return frame;
  }

  if (config.layout === 'field') {
    write(frame, 2, 4, config.signature, 0.82);
    config.formulas.forEach((formula, index) => write(frame, 5 + index * 2, 4, formula.slice(0, 52), index === 0 ? 0.82 : 0.52));
    for (let col = 18; col < 86; col += 9) {
      put(frame, 14, col, '+', 0.12, 'muted');
      put(frame, 45, col, '.', 0.1, 'muted');
    }
    drawPayoffCurve(frame, setup, 14, 15, 68, 27);
    config.annotations.forEach((annotation, index) => write(frame, 45 + index * 2, 16, annotation.slice(0, 58), 0.55 - index * 0.08));
    writeLegTerms(frame, setup, 50, 18, 0.5);
    return frame;
  }

  if (config.layout === 'constellation') {
    for (let index = 0; index < 42; index++) {
      const x = 8 + (index * 17) % 80;
      const y = 12 + (index * 11) % 30;
      put(frame, y, x, index % 3 === 0 ? 'x' : index % 3 === 1 ? '.' : '+', 0.05 + (index % 5) * 0.01, 'muted');
    }
    write(frame, 3, 5, config.signature, 0.82);
    write(frame, 6, 5, config.formulas[0]?.slice(0, 36) ?? '', 0.72);
    write(frame, 9, 63, config.formulas[1]?.slice(0, 28) ?? '', 0.52);
    write(frame, 43, 7, config.formulas[2]?.slice(0, 34) ?? '', 0.48);
    drawPayoffCurve(frame, setup, 13, 16, 64, 28);
    config.annotations.forEach((annotation, index) => write(frame, 47 + index * 2, 24, annotation.slice(0, 46), 0.54 - index * 0.08));
    writeLegTerms(frame, setup, 51, 28, 0.5);
    return frame;
  }

  write(frame, 2, 28, config.signature, 0.86);
  line(frame, 4, 28, 34, '─', 0.18, 'muted');
  config.formulas.forEach((formula, index) => write(frame, 7 + index * 2, 28, formula.slice(0, 48), index === 0 ? 0.9 : 0.6));
  for (let row = 10; row < 46; row += 4) {
    for (let col = 18; col < 78; col += 7) put(frame, row, col, '.', 0.06, 'muted');
  }
  drawPayoffCurve(frame, setup, 15, 16, 66, 28);
  config.annotations.forEach((annotation, index) => write(frame, 46 + index * 2, 30, annotation.slice(0, 42), 0.58 - index * 0.08));
  writeLegTerms(frame, setup, 51, 30, 0.52);
  return frame;
}

const diagramConfigs: DiagramConfig[] = [
  {
    layout: 'monolith',
    signature: 'LONG CALL 520C',
    formulas: [
      'PL(S) = 100 * (max(S-520,0) - 8.40)',
      'slope = 0 below K, +100 above K',
      'floor = -840, upside = open',
    ],
    annotations: [
      'one kink, one floor, no ceiling',
      'delta turns on at the strike',
    ],
  },
  {
    layout: 'field',
    signature: 'LONG PUT 515P',
    formulas: [
      'PL(S) = 100 * (max(515-S,0) - 7.20)',
      'slope = -100 below K, 0 above K',
      'floor = -720, left tail = convex',
    ],
    annotations: [
      'same kink mirrored through the strike',
      'protection is a negative-slope line',
    ],
  },
  {
    layout: 'split',
    signature: 'CALL SPREAD 520C/540C',
    formulas: [
      'PL = 100 * (call520 - call540)',
      '     - 630 debit',
      'slope: 0 -> +100 -> 0',
    ],
    annotations: [
      'two kinks turn convexity into a shelf',
      'defined debit, defined ceiling',
    ],
  },
  {
    layout: 'constellation',
    signature: 'SHORT STRADDLE 525C/525P',
    formulas: [
      'PL = 1850 - 100 * abs(S-525)',
      'peak at K, loss opens both ways',
      'two tails, one credit peak',
    ],
    annotations: [
      'maximum profit is one price',
      'short volatility becomes tail risk',
    ],
  },
  {
    layout: 'field',
    signature: 'CALL BUTTERFLY 510/525/540',
    formulas: [
      'PL = tent(510,525,540) - 430 debit',
      'center peak, two flat loss wings',
      'best case lives near the middle strike',
    ],
    annotations: [
      'three strikes fold a triangle from calls',
      'the peak is a narrow price hypothesis',
    ],
  },
  {
    layout: 'split',
    signature: 'PUT SPREAD 515P/495P',
    formulas: [
      'PL = 100 * (put515 - put495)',
      '     - 505 debit',
      'slope: 0 -> -100 -> 0',
    ],
    annotations: [
      'the put spread mirrors the vertical call',
      'crash convexity becomes a bounded shelf',
    ],
  },
  {
    layout: 'constellation',
    signature: 'SHORT STRANGLE 500P/545C',
    formulas: [
      'PL = 1005 - put_tail - call_tail',
      'flat center, open loss tails',
      'breakevens surround the credit',
    ],
    annotations: [
      'income is wide, risk is wider',
      'variance sold becomes tail exposure',
    ],
  },
  {
    layout: 'monolith',
    signature: 'RISK REVERSAL 505P/535C',
    formulas: [
      'PL = max(S-535,0) - max(505-S,0)',
      '     - 0.10 debit',
      'long call financed by short put risk',
    ],
    annotations: [
      'risk reversal rotates the payoff line',
      'bullish delta with a borrowed floor',
    ],
  },
  {
    layout: 'field',
    signature: 'JADE LIZARD 505P/535C/550C',
    formulas: [
      'PL = 850 credit - put_tail - call_spread',
      'upside capped; downside remains open',
      'credit is larger than the call width',
    ],
    annotations: [
      'short put plus short call spread',
      'asymmetry is the whole trade',
    ],
  },
  {
    layout: 'monolith',
    signature: 'IRON CONDOR 4600/4700/5200/5300',
    formulas: [
      'PL = 3060 credit - left_tail - right_tail',
      'flat max between 4700 and 5200',
      'wings make both tails finite',
    ],
    annotations: [
      'profit is an interval, not a direction',
      'four strikes carve a bounded plateau',
    ],
  },
];

function buildDiagramFrame(index: number) {
  return drawMathArtDiagram(payoffSetups[index], diagramConfigs[index]);
}

function buildBtcFrame() {
  return buildDiagramFrame(0);
}

function buildOptionsFrame() {
  return buildDiagramFrame(2);
}

function buildRiskFrame() {
  return buildDiagramFrame(5);
}

function clamp(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function smooth(value: number) {
  const n = clamp(value);
  return n * n * (3 - n * 2);
}

function seededRandom(seed: number) {
  let value = seed | 0 || 1;
  return () => {
    let next = (value = (value + 1831565813) | 0);
    next = Math.imul(next ^ (next >>> 15), next | 1);
    return (((next ^= next + Math.imul(next ^ (next >>> 7), next | 61)) ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function noise(seed: number, progress: number, axis: number) {
  const n = seed * 0.0173 + axis * 7.91;
  return Math.sin(n + progress * 5.21) * 0.6 + Math.sin(n * 1.6 + progress * 11.4) * 0.4;
}

function scatterOut(frame: Frame, layout: { cellW: number; cellH: number; frameX: number; frameY: number; windDir: number; rngSeed: number; viewportW: number; viewportH: number }) {
  const random = seededRandom(layout.rngSeed);
  const particles: Particle[] = [];
  const centerX = layout.viewportW * 0.5 + layout.windDir * 60;
  const centerY = layout.viewportH * 0.5;
  for (let row = 0; row < frame.length; row++) {
    for (let col = 0; col < frame[0].length; col++) {
      const cell = frame[row][col];
      if (cell.alpha < 0.04 || cell.char === ' ') continue;
      const x = layout.frameX + col * layout.cellW;
      const y = layout.frameY + row * layout.cellH;
      const drift = 60 + random() * 110;
      const jitter = (random() - 0.5) * 180;
      const progressCol = col / Math.max(1, frame[0].length - 1);
      const begin = (layout.windDir > 0 ? (1 - progressCol) * 0.55 : progressCol * 0.55) + random() * 0.04;
      particles.push({
        char: cell.char,
        tone: cell.tone,
        x0: x,
        y0: y,
        x1: centerX + layout.windDir * drift * (random() < 0.5 ? -0.4 : 1),
        y1: centerY + jitter,
        a0: cell.alpha,
        a1: 0,
        begin,
        end: Math.min(0.72, begin + 0.28 + random() * 0.1),
        seed: Math.floor(random() * 10000000),
      });
    }
  }
  return particles;
}

function scatterIn(frame: Frame, layout: { cellW: number; cellH: number; frameX: number; frameY: number; windDir: number; rngSeed: number; viewportW: number; viewportH: number }) {
  const random = seededRandom(layout.rngSeed);
  const particles: Particle[] = [];
  const centerX = layout.viewportW * 0.5 - layout.windDir * 60;
  const centerY = layout.viewportH * 0.5;
  for (let row = 0; row < frame.length; row++) {
    for (let col = 0; col < frame[0].length; col++) {
      const cell = frame[row][col];
      if (cell.alpha < 0.04 || cell.char === ' ') continue;
      const x = layout.frameX + col * layout.cellW;
      const y = layout.frameY + row * layout.cellH;
      const drift = 60 + random() * 110;
      const jitter = (random() - 0.5) * 180;
      const progressCol = col / Math.max(1, frame[0].length - 1);
      const begin = 0.35 + (layout.windDir > 0 ? progressCol * 0.5 : (1 - progressCol) * 0.5) + random() * 0.04;
      particles.push({
        char: cell.char,
        tone: cell.tone,
        x0: centerX - layout.windDir * drift * (random() < 0.5 ? -0.4 : 1),
        y0: centerY + jitter,
        x1: x,
        y1: y,
        a0: 0,
        a1: cell.alpha,
        begin,
        end: Math.min(0.96, begin + 0.28 + random() * 0.1),
        seed: Math.floor(random() * 10000000),
      });
    }
  }
  return particles;
}

function entranceParticles(frame: Frame, layout: { cellW: number; cellH: number; frameX: number; frameY: number; rngSeed: number; viewportW: number; viewportH: number }) {
  const random = seededRandom(layout.rngSeed);
  const particles: Particle[] = [];
  const centerX = layout.frameX + frame[0].length * layout.cellW / 2;
  const centerY = layout.frameY + frame.length * layout.cellH / 2;
  const radius = Math.hypot(frame[0].length * layout.cellW, frame.length * layout.cellH) / 2;
  for (let row = 0; row < frame.length; row++) {
    for (let col = 0; col < frame[0].length; col++) {
      const cell = frame[row][col];
      if (cell.alpha < 0.04 || cell.char === ' ') continue;
      const targetX = layout.frameX + col * layout.cellW;
      const targetY = layout.frameY + row * layout.cellH;
      const angle = random() * Math.PI * 2;
      const spread = Math.min(layout.viewportW, layout.viewportH) * 0.5 + random() * 320;
      const startCenterX = centerX + (random() - 0.5) * 220;
      const startCenterY = layout.viewportH * 0.5 + (random() - 0.5) * 180;
      const distance = Math.min(1, Math.hypot(targetX - centerX, targetY - centerY) / radius);
      const begin = (1 - distance) * 0.5 + random() * 0.1;
      particles.push({
        char: cell.char,
        tone: cell.tone,
        x0: startCenterX + Math.cos(angle) * spread,
        y0: startCenterY + Math.sin(angle) * spread,
        x1: targetX,
        y1: targetY,
        a0: 0,
        a1: cell.alpha,
        begin,
        end: Math.min(0.98, begin + 0.34 + random() * 0.16),
        seed: Math.floor(random() * 10000000),
      });
    }
  }
  return particles;
}

function hexToRgb(hex: string) {
  const raw = hex.replace('#', '');
  const parsed = parseInt(raw.length === 3 ? raw.split('').map(char => char + char).join('') : raw, 16);
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}

function mixColor(from: string, to: string, amount: number) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return `rgb(${Math.round(a.r + (b.r - a.r) * amount)}, ${Math.round(a.g + (b.g - a.g) * amount)}, ${Math.round(a.b + (b.b - a.b) * amount)})`;
}

function colorsForProgress(progress: number): Palette {
  if (progress < 0.86) {
    return {
      bg: OFFWHITE,
      ink: BLACK,
      muted: MUTED,
      red: RED,
    };
  }
  return {
    bg: BLACK,
    ink: OFFWHITE,
    muted: '#9a9288',
    red: '#ff3344',
  };
}

function colorForTone(palette: Palette, tone: Tone) {
  if (tone === 'red') return palette.red;
  if (tone === 'muted') return palette.muted;
  return palette.ink;
}

function phaseFor(progress: number, total: number) {
  const count = Math.max(1, total);
  if (count === 1) return { kind: 'hold' as const, phase: 1 };
  const scaled = clamp(progress) * count;
  const index = Math.min(count - 1, Math.floor(scaled));
  const local = scaled - index;
  if (index >= count - 1) return { kind: 'hold' as const, phase: count };
  if (local < 0.46) return { kind: 'hold' as const, phase: index + 1 };
  return {
    kind: 'trans' as const,
    fromPhase: index + 1,
    toPhase: index + 2,
    local: (local - 0.46) / 0.54,
  };
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], progress: number, palette: Palette, curlAmp: number, scorchAmp: number) {
  const phase = clamp(progress);
  for (const particle of particles) {
    ctx.fillStyle = colorForTone(palette, particle.tone);
    if (phase <= particle.begin) {
      if (particle.a0 > 0) {
        ctx.globalAlpha = particle.a0;
        ctx.fillText(particle.char, particle.x0, particle.y0);
      }
      continue;
    }
    if (phase >= particle.end) {
      if (particle.a1 > 0) {
        ctx.globalAlpha = particle.a1;
        ctx.fillText(particle.char, particle.x1, particle.y1);
      }
      continue;
    }
    const local = (phase - particle.begin) / (particle.end - particle.begin);
    const eased = local < 0.5 ? 4 * local * local * local : 1 - Math.pow(-2 * local + 2, 3) / 2;
    const x = particle.x0 + (particle.x1 - particle.x0) * eased + noise(particle.seed, local, 0) * curlAmp;
    const y = particle.y0 + (particle.y1 - particle.y0) * eased + noise(particle.seed, local, 1) * curlAmp * 0.7;
    let alpha = particle.a1 === 0
      ? local < 0.7 ? particle.a0 : particle.a0 * (1 - (local - 0.7) / 0.3)
      : local < 0.25 ? particle.a1 * (local / 0.25) : particle.a1;
    let char = particle.char;
    if (scorchAmp > 0 && local > 0.32 && local < 0.72) {
      const seed = (particle.seed * 2654435761) >>> 0;
      const index = (seed + Math.floor(local * 64)) % ASH.length;
      if (((seed >>> 8) & 255) / 255 < scorchAmp) char = ASH[index];
    }
    ctx.globalAlpha = alpha;
    ctx.fillText(char, x, y);
  }
  ctx.globalAlpha = 1;
}

function drawFrame(ctx: CanvasRenderingContext2D, frame: Frame, origin: { x: number; y: number }, cellW: number, cellH: number, palette: Palette) {
  for (let row = 0; row < frame.length; row++) {
    for (let col = 0; col < frame[0].length; col++) {
      const cell = frame[row][col];
      if (cell.alpha < 0.04 || cell.char === ' ') continue;
      ctx.fillStyle = colorForTone(palette, cell.tone);
      ctx.globalAlpha = cell.alpha;
      ctx.fillText(cell.char, origin.x + col * cellW, origin.y + row * cellH);
    }
  }
  ctx.globalAlpha = 1;
}

function useViewportSize() {
  const [size, setSize] = useState({ w: 1440, h: 900 });

  useLayoutEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
}

function PanelCopy({ panel, compact }: { panel: Panel; compact: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const reviews = compact ? panel.reviews.slice(0, 1) : panel.reviews;
  const textAlign = compact ? 'center' : 'left';
  const offset = pressed ? 1 : hovered ? 14 : 6;

  return (
    <>
      <div style={{ textAlign }}>
        <div style={{ opacity: 0.6, marginBottom: compact ? '0.75rem' : '1.25rem', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.32em' }}>
          {panel.eyebrow}
        </div>
        <h2 style={{
          fontFamily: '"Pixelify Sans", "Courier New", monospace',
          fontWeight: 600,
          fontSize: compact ? 'clamp(1.75rem, 7.5vw, 2.4rem)' : 'clamp(2.6rem, 6vw, 4.6rem)',
          lineHeight: 0.96,
          margin: 0,
          marginBottom: compact ? '0.85rem' : 'clamp(1.2rem, 2vw, 1.6rem)',
        }}>
          {panel.title}
        </h2>
        {!compact && (
          <p style={{
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: 'clamp(0.95rem, 1.02vw, 1.05rem)',
            lineHeight: 1.6,
            opacity: 0.82,
            maxWidth: '40rem',
            margin: 0,
          }}>
            {panel.body}
          </p>
        )}
      </div>
      <div style={{ marginTop: compact ? '1rem' : 0, textAlign }}>
        <div style={{ fontSize: 10, marginBottom: compact ? '1rem' : '1.5rem' }} aria-label="Verified reviews">
          {!compact && (
            <div style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '0.75rem' }} aria-hidden>
              verified · n = 2 of 318
            </div>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {reviews.map((review, index) => (
              <li
                key={review.author}
                style={{
                  borderLeft: compact ? 'none' : '2px solid currentColor',
                  paddingLeft: compact ? 0 : '0.9rem',
                  marginBottom: index === reviews.length - 1 ? 0 : '1rem',
                  opacity: 0.85,
                }}
              >
                <p style={{
                  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                  fontSize: compact ? '0.82rem' : 'clamp(0.85rem, 0.95vw, 0.98rem)',
                  lineHeight: 1.45,
                  margin: 0,
                  fontStyle: 'italic',
                }}>
                  "{review.quote}"
                </p>
                <div style={{ marginTop: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: 9, opacity: 0.65 }}>
                  <span style={{ fontWeight: 600 }}>{review.author}</span>
                  <span style={{ opacity: 0.55 }}> · </span>
                  <span>{review.role}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <a
          href="#cipher-cta"
          onClick={event => event.preventDefault()}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => {
            setHovered(false);
            setPressed(false);
          }}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => {
            setHovered(false);
            setPressed(false);
          }}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontFamily: '"Pixelify Sans", "Courier New", monospace',
            fontWeight: 600,
            fontSize: 'clamp(1rem, 1.2vw, 1.2rem)',
            padding: '0.95rem 1.7rem',
            background: hovered ? 'var(--cipher-bg, transparent)' : 'var(--cipher-fg, currentColor)',
            color: hovered ? 'var(--cipher-fg, currentColor)' : 'var(--cipher-bg, transparent)',
            border: '2px solid var(--cipher-fg, currentColor)',
            boxShadow: `${offset}px ${offset}px 0 var(--cipher-shadow, currentColor)`,
            textDecoration: 'none',
            transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease, color 180ms ease',
            cursor: 'pointer',
            transform: pressed ? 'translate(5px, 5px)' : hovered ? 'translate(-5px, -5px)' : 'translate(0, 0)',
            userSelect: 'none',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span>{panel.cta}</span>
          <span aria-hidden style={{ marginLeft: '0.6rem', transform: hovered ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 180ms ease', display: 'inline-block' }}>
            -&gt;
          </span>
        </a>
        {!compact && (
          <div style={{ marginTop: '1.25rem', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.42 }}>
            {panel.meta}
          </div>
        )}
      </div>
    </>
  );
}

function setPanelState(ref: RefObject<HTMLDivElement>, phase: number, progress: number, entranceReady: number, active: boolean) {
  const element = ref.current;
  if (!element) return;
  const opacityByPhase = (() => {
    switch (phase) {
      case 1:
        if (progress <= 0.01) return 1;
        if (progress <= 0.11) return 1 - smooth((progress - 0.01) / 0.1);
        return 0;
      case 2:
        if (progress < 0.3) return 0;
        if (progress < 0.4) return smooth((progress - 0.3) / 0.1);
        if (progress < 0.53) return 1;
        if (progress < 0.63) return 1 - smooth((progress - 0.53) / 0.1);
        return 0;
      case 3:
        if (progress < 0.79) return 0;
        if (progress < 0.89) return smooth((progress - 0.79) / 0.1);
        return 1;
      default:
        return 0;
    }
  })() * entranceReady;
  const x = (() => {
    switch (phase) {
      case 1:
        return progress < 0.03 ? 0 : -80 * smooth((progress - 0.03) / 0.12);
      case 2:
        if (progress < 0.3) return 80;
        if (progress < 0.4) return 80 * (1 - smooth((progress - 0.3) / 0.1));
        if (progress < 0.55) return 0;
        return 80 * smooth((progress - 0.55) / 0.12);
      case 3:
        if (progress < 0.79) return -80;
        if (progress < 0.89) return -80 * (1 - smooth((progress - 0.79) / 0.1));
        return 0;
      default:
        return 0;
    }
  })();
  element.style.opacity = String(opacityByPhase);
  element.style.transform = `translate3d(${x}px, 0, 0)`;
  const blur = opacityByPhase < 1 ? (1 - opacityByPhase) * 6 : 0;
  element.style.filter = blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : 'none';
  element.style.pointerEvents = opacityByPhase > 0.55 && active ? 'auto' : 'none';
  element.style.zIndex = opacityByPhase > 0.55 && active ? '1000' : '0';
}

export default function CipherNative() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const size = useViewportSize();
  const frames = useMemo(() => payoffSetups.map((_, index) => buildDiagramFrame(index)), []);
  const frameRows = frames[0]?.length ?? 60;
  const frameCols = frames[0]?.[0]?.length ?? 50;

  const cell = useMemo(() => {
    const compact = size.w < 768;
    const maxH = size.h * (compact ? 0.74 : 0.84);
    const maxW = size.w * (compact ? 0.94 : 0.9);
    let cellH = Math.floor(Math.min(maxH / frameRows, maxW / (frameCols * 0.572)));
    cellH = Math.max(compact ? 5 : 8, Math.min(compact ? 8 : 18, cellH));
    const cellW = Math.round(cellH * 0.572 * 100) / 100;
    return { cellH, cellW, canvasW: cellW * frameCols, canvasH: cellH * frameRows };
  }, [frameCols, frameRows, size]);

  const diagramOrigin = useMemo(() => ({
    x: (size.w - cell.canvasW) / 2,
    y: (size.h - cell.canvasH) / 2,
  }), [cell, size]);

  const transitions: TransitionPack = useMemo(() => {
    const positions = frames.map(() => diagramOrigin);
    return {
      entrance: entranceParticles(frames[0], { cellW: cell.cellW, cellH: cell.cellH, frameX: diagramOrigin.x, frameY: diagramOrigin.y, rngSeed: 90210, viewportW: size.w, viewportH: size.h }),
      positions,
      pairs: frames.slice(0, -1).map((frame, index) => {
        const windDir = index % 2 === 0 ? 1 : -1;
        return {
          out: scatterOut(frame, { cellW: cell.cellW, cellH: cell.cellH, frameX: diagramOrigin.x, frameY: diagramOrigin.y, windDir, rngSeed: 1300 + index * 811, viewportW: size.w, viewportH: size.h }),
          in: scatterIn(frames[index + 1], { cellW: cell.cellW, cellH: cell.cellH, frameX: diagramOrigin.x, frameY: diagramOrigin.y, windDir, rngSeed: 2300 + index * 977, viewportW: size.w, viewportH: size.h }),
        };
      }),
    };
  }, [cell, diagramOrigin, frames, size]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = size.w * ratio;
    canvas.height = size.h * ratio;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.textBaseline = 'top';
    }
  }, [size]);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let scrollProgress = 0;
    let needsDraw = true;
    let startedAt = 0;
    let entranceProgress = 0;
    let entranceDone = false;

    const computeScrollProgress = () => {
      const rect = section.getBoundingClientRect();
      const total = Math.max(1, section.offsetHeight - window.innerHeight);
      scrollProgress = clamp(-rect.top / total);
      needsDraw = true;
    };

    const render = (now: number) => {
      if (startedAt === 0) startedAt = now;
      if (!entranceDone) {
        entranceProgress = Math.min(1, (now - startedAt) / 2000);
        if (entranceProgress >= 1) entranceDone = true;
        needsDraw = true;
      }
      if (needsDraw) {
        const progress = entranceDone ? scrollProgress : 0;
        const palette = colorsForProgress(progress);
        const phase = phaseFor(progress, frames.length);
        const fontSize = Math.round(cell.cellH * 0.92);
        ctx.font = `500 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.textBaseline = 'top';
        ctx.clearRect(0, 0, size.w, size.h);

        if (bgRef.current) bgRef.current.style.backgroundColor = palette.bg;
        if (sectionRef.current) {
          sectionRef.current.style.color = palette.ink;
          sectionRef.current.style.setProperty('--cipher-fg', palette.ink);
          sectionRef.current.style.setProperty('--cipher-bg', palette.bg);
          sectionRef.current.style.setProperty('--cipher-red', palette.red);
          sectionRef.current.style.setProperty('--cipher-shadow', mixColor(palette.ink, '#000000', 0.5));
        }

        if (!entranceDone) {
          drawParticles(ctx, transitions.entrance, entranceProgress, palette, 52.8, 0.585);
        } else if (phase.kind === 'hold') {
          const frame = frames[phase.phase - 1];
          const origin = transitions.positions[phase.phase - 1] ?? diagramOrigin;
          drawFrame(ctx, frame, origin, cell.cellW, cell.cellH, palette);
        } else {
          const pair = transitions.pairs[phase.fromPhase - 1];
          if (pair) {
            drawParticles(ctx, pair.out, phase.local, palette, 22, 0.45);
            drawParticles(ctx, pair.in, phase.local, palette, 22, 0.45);
          }
        }

        const activePhase = phase.kind === 'hold' ? phase.phase : phase.local < 0.5 ? phase.fromPhase : phase.toPhase;
        if (phaseRef.current) phaseRef.current.textContent = `${String(activePhase).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')}`;
        if (progressRef.current) progressRef.current.style.transform = `scaleY(${progress})`;
        const entranceReady = entranceDone ? 1 : entranceProgress < 0.5 ? 0 : (entranceProgress - 0.5) / 0.5;
        if (eyebrowRef.current) eyebrowRef.current.style.opacity = String(entranceReady * 0.55);
        if (hintRef.current) hintRef.current.style.opacity = String(entranceReady * 0.4);
        if (ruleRef.current) ruleRef.current.style.opacity = String(entranceReady * 0.18);

        needsDraw = false;
      }
      raf = requestAnimationFrame(render);
    };

    computeScrollProgress();
    window.addEventListener('scroll', computeScrollProgress, { passive: true });
    window.addEventListener('resize', computeScrollProgress);
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', computeScrollProgress);
      window.removeEventListener('resize', computeScrollProgress);
    };
  }, [cell, frames, size, transitions]);

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        width: '100%',
        height: `${Math.max(620, frames.length * 150)}vh`,
        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
        color: BLACK,
        background: OFFWHITE,
      }}
    >
      <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100dvh', overflow: 'hidden' }}>
        <div ref={bgRef} style={{ position: 'absolute', inset: 0, background: OFFWHITE, pointerEvents: 'none' }} />
        <canvas ref={canvasRef} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div ref={eyebrowRef} style={{ position: 'absolute', top: 24, left: 24, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.25em', color: 'currentColor', opacity: 0 }}>
          <span aria-hidden>payoff atlas</span>
          <span aria-hidden style={{ opacity: 0.35, margin: '0 0.5rem' }}>/</span>
          <span ref={phaseRef}>01 / {String(frames.length).padStart(2, '0')}</span>
        </div>
        <div ref={hintRef} style={{ position: 'absolute', bottom: 24, left: 24, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0 }}>
          scroll / scatter / resolve
        </div>
        <div ref={ruleRef} aria-hidden style={{ position: 'absolute', left: 16, top: '7vh', bottom: '7vh', width: 2, background: 'currentColor', opacity: 0, pointerEvents: 'none' }} />
        <div ref={progressRef} aria-hidden style={{ position: 'absolute', left: 16, top: '7vh', bottom: '7vh', width: 2, background: 'currentColor', transformOrigin: 'top', transform: 'scaleY(0)', pointerEvents: 'none' }} />
      </div>
    </section>
  );
}
