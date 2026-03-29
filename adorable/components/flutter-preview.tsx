"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Maximize2Icon,
  MonitorIcon,
  RefreshCwIcon,
  SmartphoneIcon,
  TabletIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Viewport config                                                    */
/* ------------------------------------------------------------------ */

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORTS: {
  key: Viewport;
  label: string;
  icon: React.ElementType;
  width: number;
}[] = [
  { key: "desktop", label: "Desktop", icon: MonitorIcon, width: 1280 },
  { key: "tablet", label: "Tablet", icon: TabletIcon, width: 768 },
  { key: "mobile", label: "Mobile", icon: SmartphoneIcon, width: 375 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface FlutterPreviewProps {
  previewUrl: string;
  isLoading?: boolean;
  projectName?: string;
}

export function FlutterPreview({
  previewUrl,
  isLoading = false,
  projectName,
}: FlutterPreviewProps) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeViewport = VIEWPORTS.find((v) => v.key === viewport)!;

  const handleRefresh = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  const handleFullScreen = useCallback(() => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col overflow-hidden bg-card"
    >
      {/* Viewport selector */}
      <div className="flex items-center gap-1 border-b px-3 py-1.5">
        {VIEWPORTS.map((v) => {
          const Icon = v.icon;
          const isActive = v.key === viewport;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => setViewport(v.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {v.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCwIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={handleFullScreen}
            title="Full screen"
          >
            <Maximize2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex flex-1 items-start justify-center bg-muted/30 p-4">
        {isLoading ? (
          <div
            className="animate-pulse rounded-lg bg-muted"
            style={{ width: activeViewport.width, maxWidth: "100%", height: "100%" }}
          />
        ) : previewUrl ? (
          <div
            className="overflow-hidden rounded-lg border bg-background shadow-sm transition-all"
            style={{ width: activeViewport.width, maxWidth: "100%", height: "100%" }}
          >
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={previewUrl}
              title={projectName ? `${projectName} preview` : "Flutter preview"}
              className="size-full"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        ) : (
          <div className="flex h-full w-full max-w-md items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground/50">
              No preview URL available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
