import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SentryGlobe — Real-Time DDoS Attack Visualization',
  description:
    'A high-performance, real-time 3D DDoS attack visualization dashboard. Monitor global cyber threats as they happen.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#030712] text-gray-200 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
