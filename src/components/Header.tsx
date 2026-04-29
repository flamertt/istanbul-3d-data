import { MapPin } from "lucide-react";

import type { ReactNode } from "react";

interface HeaderProps {
  generated: string | null;
  dateRange: { from: string; to: string } | null;
  themeToggle?: ReactNode;
}

export function Header({ generated, dateRange, themeToggle }: HeaderProps) {
  const freshness = generated
    ? new Date(generated).toLocaleDateString("tr-TR", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between gap-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-5 rounded-2xl bg-gray-950/88 backdrop-blur-md px-6 py-5 border border-gray-800/60 shadow-[0_12px_36px_rgba(0,0,0,0.35)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-400/10">
          <MapPin size={24} className="text-blue-400" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight leading-tight text-white">
            İstanbul <span className="font-light text-gray-400">Heatmap</span>
          </h1>
          {dateRange && <p className="text-base text-gray-400">{`${dateRange.from} - ${dateRange.to}`}</p>}
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        {themeToggle}
        {freshness && (
          <div className="rounded-2xl bg-gray-950/88 backdrop-blur-md px-4 py-3 border border-gray-800/60 text-sm text-gray-300 shadow-[0_12px_36px_rgba(0,0,0,0.28)]">
            Güncellendi: {freshness}
          </div>
        )}
      </div>
    </header>
  );
}
