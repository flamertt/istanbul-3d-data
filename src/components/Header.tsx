import type { ReactNode } from "react";
import logo from "../lib/images/logo.png";

interface HeaderProps {
  generated: string | null;
  themeToggle?: ReactNode;
}

export function Header({ generated, themeToggle }: HeaderProps) {
  const freshness = generated
    ? new Date(generated).toLocaleDateString("tr-TR", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between gap-4 pointer-events-none">
      <div className="pointer-events-auto w-80 rounded-2xl bg-gray-950/88 backdrop-blur-md p-3 border border-gray-800/60 shadow-[0_12px_36px_rgba(0,0,0,0.35)]">
        <img
          src={logo}
          alt="Logo"
          className="h-14 w-full object-contain [filter:invert(1)]"
        />
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
