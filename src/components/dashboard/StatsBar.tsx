'use client';

import { motion } from 'framer-motion';
import { SEVERITY_COLORS } from '@/types/attack';

interface StatsBarProps {
  stats: { total: number; low: number; medium: number; high: number };
}

export default function StatsBar({ stats }: StatsBarProps) {
  const items = [
    { label: 'Total Attacks', value: stats.total, color: '#00f0ff' },
    { label: 'Low', value: stats.low, color: SEVERITY_COLORS.low },
    { label: 'Medium', value: stats.medium, color: SEVERITY_COLORS.medium },
    { label: 'High', value: stats.high, color: SEVERITY_COLORS.high },
  ];

  return (
    <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl px-6 py-3 shadow-2xl shadow-cyan-500/5">
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
