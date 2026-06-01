import * as React from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button" // I should probably create Button too if it's missing, but I'll use raw buttons for now or create Button
import { Plus, Minus, Locate, Maximize2, Compass } from "lucide-react"

export interface MapControlProps {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onLocate?: () => void
  onFullscreen?: () => void
  onResetBearing?: () => void
  showZoom?: boolean
  showLocate?: boolean
  showFullscreen?: boolean
  showCompass?: boolean
  className?: string
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left"
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onLocate,
  onFullscreen,
  onResetBearing,
  showZoom = true,
  showLocate = true,
  showFullscreen = true,
  showCompass = true,
  className,
  position = "bottom-right",
}: MapControlProps) {
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  }

  return (
    <div
      className={cn(
        "absolute z-10 flex flex-col gap-2",
        positionClasses[position],
        className
      )}
    >
      {showZoom && (
        <div className="flex flex-col overflow-hidden rounded-md border border-border/40 bg-background/80 shadow-sm backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            className="h-9 w-9 rounded-none hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border/40"
            title="Yakınlaştır"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            className="h-9 w-9 rounded-none hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Uzaklaştır"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showCompass && (
        <div className="flex flex-col overflow-hidden rounded-md border border-border/40 bg-background/80 shadow-sm backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={onResetBearing}
            className="h-9 w-9 rounded-none hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Kuzeye Yönel"
          >
            <Compass className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showLocate && (
        <div className="flex flex-col overflow-hidden rounded-md border border-border/40 bg-background/80 shadow-sm backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={onLocate}
            className="h-9 w-9 rounded-none hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Konumumu Bul"
          >
            <Locate className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showFullscreen && (
        <div className="flex flex-col overflow-hidden rounded-md border border-border/40 bg-background/80 shadow-sm backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={onFullscreen}
            className="h-9 w-9 rounded-none hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Tam Ekran"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
