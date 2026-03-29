"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  Loader2Icon,
  XCircleIcon,
  XIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types (mirrors @/lib/flutter-types)                                */
/* ------------------------------------------------------------------ */

export type FlutterBuildStatus =
  | "idle"
  | "creating-sandbox"
  | "installing-deps"
  | "building"
  | "deploying"
  | "done"
  | "error";

/* ------------------------------------------------------------------ */
/*  Step config                                                        */
/* ------------------------------------------------------------------ */

interface BuildStep {
  key: FlutterBuildStatus;
  label: string;
}

const STEPS: BuildStep[] = [
  { key: "creating-sandbox", label: "Creating sandbox" },
  { key: "installing-deps", label: "Installing dependencies" },
  { key: "building", label: "Building" },
  { key: "deploying", label: "Deploying" },
  { key: "done", label: "Done" },
];

function stepIndex(status: FlutterBuildStatus): number {
  return STEPS.findIndex((s) => s.key === status);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface FlutterBuildProgressProps {
  status: FlutterBuildStatus;
  logs?: string[];
  error?: string;
  onComplete?: (previewUrl: string) => void;
  onCancel?: () => void;
}

export function FlutterBuildProgress({
  status,
  logs = [],
  error,
  onCancel,
}: FlutterBuildProgressProps) {
  const currentIdx = stepIndex(status);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const el = e.currentTarget;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setAutoScroll(atBottom);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Build progress</h3>
        {status !== "done" && status !== "error" && status !== "idle" && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground"
            onClick={onCancel}
          >
            <XIcon className="size-3" />
            Cancel
          </Button>
        )}
      </div>

      {/* Steps */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((step, i) => {
          const isActive = i === currentIdx;
          const isComplete = i < currentIdx || status === "done";
          const isError = status === "error" && isActive;

          return (
            <div key={step.key} className="flex items-center gap-1.5">
              {i > 0 && (
                <div
                  className={cn(
                    "h-px w-4 sm:w-6",
                    isComplete ? "bg-emerald-500" : "bg-border",
                  )}
                />
              )}
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                    isError
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : isComplete
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                        : isActive
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {isError ? (
                    <XCircleIcon className="size-3.5" />
                  ) : isComplete ? (
                    <CheckCircle2Icon className="size-3.5" />
                  ) : isActive ? (
                    <Loader2Icon className="size-3 animate-spin" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:inline",
                    isActive
                      ? "text-foreground"
                      : isComplete
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50",
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
          <XCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-destructive">
              Build failed
            </p>
            <p className="mt-0.5 text-xs text-destructive/70">{error}</p>
          </div>
        </div>
      )}

      {/* Log output */}
      {logs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Build logs
            </span>
            {logs.length > 0 && (
              <span className="text-[11px] text-muted-foreground/40">
                {logs.length} lines
              </span>
            )}
          </div>
          <div
            onScroll={handleScroll}
            className="h-40 overflow-y-auto rounded-lg border bg-muted/30 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground"
          >
            {logs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Done state */}
      {status === "done" && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
          <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Build completed successfully
          </p>
        </div>
      )}
    </div>
  );
}
