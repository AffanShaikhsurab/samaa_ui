"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { FlutterBuildStatus, FlutterProjectFile } from "@/lib/flutter-types";

interface FlutterBuildState {
  status: FlutterBuildStatus;
  logs: string[];
  previewUrl: string | null;
  error: string | null;
  projectName: string | null;
  sandboxId: string | null;
}

interface FlutterBuildContextValue {
  state: FlutterBuildState;
  startBuild: (projectName: string, codeFiles: FlutterProjectFile[]) => Promise<string | null>;
  cancelBuild: () => Promise<void>;
  clearState: () => void;
}

const INITIAL_STATE: FlutterBuildState = {
  status: "idle",
  logs: [],
  previewUrl: null,
  error: null,
  projectName: null,
  sandboxId: null,
};

const FlutterBuildContext = createContext<FlutterBuildContextValue | null>(null);

export function FlutterBuildProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlutterBuildState>(INITIAL_STATE);
  const sandboxIdRef = useRef<string | null>(null);

  const startBuild = useCallback(
    async (projectName: string, codeFiles: FlutterProjectFile[]): Promise<string | null> => {
      setState({
        status: "creating-sandbox",
        logs: ["Creating Flutter sandbox..."],
        previewUrl: null,
        error: null,
        projectName,
        sandboxId: null,
      });

      try {
        const response = await fetch("/api/flutter/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectName, codeFiles }),
        });

        const data = await response.json();

        if (data.success && data.previewUrl) {
          setState((prev) => ({
            ...prev,
            status: "done",
            logs: [...prev.logs, "Build completed successfully!"],
            previewUrl: data.previewUrl,
            sandboxId: data.sandboxId,
          }));
          sandboxIdRef.current = data.sandboxId;
          return data.previewUrl;
        }

        setState((prev) => ({
          ...prev,
          status: "error",
          error: data.error || "Build failed with unknown error.",
          logs: [...prev.logs, `Error: ${data.error}`],
        }));
        return null;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          logs: [...prev.logs, `Error: ${err}`],
        }));
        return null;
      }
    },
    [],
  );

  const cancelBuild = useCallback(async () => {
    if (sandboxIdRef.current) {
      try {
        await fetch(`/api/flutter/cleanup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sandboxId: sandboxIdRef.current }),
        });
      } catch (err) {
        console.error("Failed to cleanup sandbox:", err);
      }
    }
    setState({
      ...INITIAL_STATE,
      status: "idle",
      logs: [],
      error: null,
    });
    sandboxIdRef.current = null;
  }, []);

  const clearState = useCallback(() => {
    setState(INITIAL_STATE);
    sandboxIdRef.current = null;
  }, []);

  return (
    <FlutterBuildContext.Provider
      value={{ state, startBuild, cancelBuild, clearState }}
    >
      {children}
    </FlutterBuildContext.Provider>
  );
}

export function useFlutterBuild(): FlutterBuildContextValue {
  const ctx = useContext(FlutterBuildContext);
  if (!ctx) {
    throw new Error("useFlutterBuild must be used within FlutterBuildProvider");
  }
  return ctx;
}
