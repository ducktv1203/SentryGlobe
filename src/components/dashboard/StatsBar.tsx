'use client';

import { motion } from 'framer-motion';
import { SEVERITY_COLORS, SeverityColors } from '@/types/attack';

interface StatsBarProps {
  stats: { total: number; low: number; medium: number; high: number };
  severityColors?: SeverityColors;
}

export default function StatsBar({ stats, severityColors }: StatsBarProps) {
  const palette = severityColors || SEVERITY_COLORS;
  const items = [
    { label: 'Total Attacks', value: stats.total, color: 'var(--accent-primary)' },
    { label: 'Low', value: stats.low, color: palette.low },
    { label: 'Medium', value: stats.medium, color: palette.medium },
    { label: 'High', value: stats.high, color: palette.high },
  ];

  return (
    <div
      className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl px-6 py-3 shadow-2xl"
      style={{ boxShadow: '0 18px 40px -24px var(--accent-shadow)' }}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center min-w-[60px]">
          <motion.span
            className="text-xl font-bold font-mono tabular-nums"
            style={{ color: item.color, textShadow: `0 0 12px ${item.color}50` }}
            key={item.value}
            initial={{ scale: 1.3, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {item.value.toLocaleString()}
          </motion.span>
          <span className="text-[9px] uppercase tracking-[0.15em] text-gray-500 mt-0.5">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
