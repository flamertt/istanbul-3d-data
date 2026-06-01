import type { ReactNode } from "react";
import logo from "../lib/images/logo.png";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar } from "lucide-react";

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
    <header className="absolute top-6 left-6 right-6 z-20 flex items-start justify-between gap-4 pointer-events-none select-none">
      <Card className="pointer-events-auto w-80 bg-background/90 backdrop-blur-md border border-border/40 shadow-2xl p-4 flex flex-col items-center justify-center gap-2 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
        <img
          src={logo}
          alt="Logo"
          className="h-14 w-full object-contain dark:invert transition-all hover:scale-105 duration-300"
        />
        {freshness && (
          <Badge variant="outline" className="text-[10px] font-medium tracking-tight bg-muted/20 border-border/40 text-muted-foreground gap-1.5 px-2 py-0.5">
            <Calendar size={10} />
            Güncellendi: {freshness}
          </Badge>
        )}
      </Card>

      <div className="pointer-events-auto flex items-center gap-3">
        {themeToggle}
      </div>
    </header>
  );
}
