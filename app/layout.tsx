import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cipher Payoff Atlas',
  description: 'A fullscreen ASCII options payoff atlas rendered in red, off-white, and black.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
