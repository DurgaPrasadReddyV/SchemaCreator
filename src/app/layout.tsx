import type { Metadata } from 'next';
import './globals.css';
import { RootShell } from '@/shell/RootShell';

export const metadata: Metadata = {
  title: 'IT-Twin Designer',
  description: 'Browser-based digital-twin designer for IT infrastructure',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
