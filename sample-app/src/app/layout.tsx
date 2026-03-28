import type { Metadata } from 'next';
import Link from 'next/link';
import { ReplayKitProvider } from 'replaykit-tracker';
import './globals.css';

export const metadata: Metadata = {
  title:       'ReplayKit Sample App',
  description: 'Demo Next.js app for ReplayKit session recording',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReplayKitProvider
          serverUrl={process.env.NEXT_PUBLIC_REPLAYKIT_URL ?? 'http://localhost:5000'}
          apiKey={process.env.NEXT_PUBLIC_REPLAYKIT_KEY ?? 'dev-api-key'}
          metadata={{ app: 'sample-app', version: '1.0.0' }}
        >
          <nav className="nav">
            <span className="nav-brand">ReplayKit Demo</span>
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/products">Products</Link>
          </nav>
          <div className="main">
            {children}
          </div>
        </ReplayKitProvider>
      </body>
    </html>
  );
}
