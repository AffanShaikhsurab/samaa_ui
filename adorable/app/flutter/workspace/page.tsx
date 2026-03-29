"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useAISDKRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { useChat } from "@ai-sdk/react";
import { type UIMessage } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiKeySettingsDialog } from "@/components/api-key-gate";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SkyBackground } from "@/components/sky-background";
import "../landing.css";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronLeft,
  Loader2,
  Monitor,
  MessageSquare,
  RotateCwIcon,
} from "lucide-react";

const EMPTY_MESSAGES: UIMessage[] = [];
const MIN_PANEL_WIDTH = 300; // px

// ── Preview URL extractor ─────────────────────────────────────────────────
// Scans message text for a URL that belongs to a Daytona preview tunnel
// (looks like https://<id>-<port>.<region>.daytona.app or similar).
const PREVIEW_URL_REGEX =
  /https?:\/\/[a-z0-9-]+(?:\.daytona\.app|\.style\.dev|\.trysamaa\.com|localhost:\d+)[^\s"')>]*/gi;

function extractPreviewUrl(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts ?? []) {
      if (part.type === "text" && "text" in part) {
        const matches = part.text.match(PREVIEW_URL_REGEX);
        if (matches && matches.length > 0) {
          return matches[matches.length - 1].replace(/[.,;:]+$/, "");
        }
      }
    }
  }
  return null;
}

// ── Browser control bar ───────────────────────────────────────────────────
function BrowserBar({
  previewUrl,
  iframeRef,
}: {
  previewUrl: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [urlInput, setUrlInput] = useState(previewUrl);

  useEffect(() => {
    setUrlInput(previewUrl);
  }, [previewUrl]);

  const reload = () => {
    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
  };
  const back = () => {
    try { iframeRef.current?.contentWindow?.history.back(); } catch { }
  };
  const forward = () => {
    try { iframeRef.current?.contentWindow?.history.forward(); } catch { }
  };
  const navigate = (url: string) => {
    if (iframeRef.current) iframeRef.current.src = url;
  };

  return (
    <div className="shrink-0 flex items-center gap-2 px-4 h-14 glass-card-deep !rounded-none border-x-0 border-t-0 border-b border-black/5">
      <div className="flex items-center gap-1.5 mr-2">
        <button
          type="button"
          onClick={back}
          className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-black/5 transition-all active:scale-95"
          title="Back"
        >
          <ArrowLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={forward}
          className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-black/5 transition-all active:scale-95"
          title="Forward"
        >
          <ArrowRightIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={reload}
          className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-black/5 transition-all active:scale-95"
          title="Reload"
        >
          <RotateCwIcon className="size-4" />
        </button>
      </div>

      {/* Live URL pill */}
      <div className="flex items-center gap-3 flex-1 rounded-full bg-black/5 border border-black/5 px-5 h-9 transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:bg-white/50">
        <div className="size-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse" />
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(urlInput);
          }}
        >
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full bg-transparent text-[13px] text-slate-600 outline-none placeholder:text-slate-300 font-semibold tracking-tight"
            aria-label="Preview URL"
          />
        </form>
      </div>

      {/* Open in new tab */}
      <a
        href={previewUrl}
        target="_blank"
        rel="noreferrer"
        className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-black/5 transition-all active:scale-95 ml-2"
        title="Open in new tab"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  );
}

// ── Blueprinting State ────────────────────────────────────────────────────
function BlueprintingState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden w-full h-full bg-slate-50/50">
      <div className="absolute inset-0 z-0 bg-white/20 backdrop-blur-[100px]" />
      
      {/* The Skeleton Preview */}
      <div className="phone-frame unblur-reveal relative z-10 shadow-2xl scale-110">
        <div className="skeleton-header animate-pulse bg-slate-100 h-14 mb-4 rounded-xl mx-4 mt-4"></div>
        <div className="skeleton-item animate-pulse bg-slate-50 h-32 mb-4 rounded-2xl mx-4"></div>
        <div className="skeleton-item animate-pulse bg-slate-100 h-12 mb-4 rounded-xl mx-4"></div>
        <div className="skeleton-item animate-pulse bg-slate-50 h-24 mb-4 rounded-2xl mx-4"></div>
        <div className="skeleton-fab animate-pulse bg-sky-100 size-14 rounded-full absolute bottom-6 right-6"></div>
      </div>

      <div className="status-container relative z-10 mt-16 text-center">
        <h1 className="status-title text-2xl font-bold text-slate-900 tracking-tight font-display mb-2">Blueprinting...</h1>
        <div className="flex items-center gap-2 justify-center">
          <Loader2 className="size-3 animate-spin text-sky-500" />
          <p className="status-sub text-xs font-bold text-sky-600/60 uppercase tracking-widest leading-none">Initializing Material Components</p>
        </div>
      </div>
    </div>
  );
}

// ── Preview panel ─────────────────────────────────────────────────────────
function PreviewPanel({
  previewUrl,
  isBuilding,
  hasMessages,
}: {
  previewUrl: string | null;
  isBuilding: boolean;
  hasMessages: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    setIframeLoaded(false);
  }, [previewUrl]);

  const agentFinished = hasMessages && !isBuilding && !previewUrl;

  if (isBuilding) {
    return <BlueprintingState />;
  }

  if (!previewUrl && !isBuilding) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-12 text-center">
        {agentFinished ? (
          <div className="w-full max-w-sm space-y-4">
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative size-24 flex items-center justify-center">
                <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full animate-pulse" />
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-16 relative z-10 text-white/40">
                  <path d="M32 4L10 14V30C10 43.5 19.4 56.1 32 60C44.6 56.1 54 43.5 54 30V14L32 4Z" fill="white" fillOpacity="0.2" stroke="white" strokeOpacity="0.4" strokeWidth="2" />
                  <path d="M32 16V32M32 40H32.01" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Preview unavailable</p>
                <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                  The Flutter app was built inside the sandbox but no preview domain was assigned.
                  Check the chat for details.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mt-2">
            <p className="font-semibold text-white/40 text-xl">Flutter Preview</p>
            <p className="text-sm text-white/30 mt-1">Your app will appear here once built</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {previewUrl && (
        <BrowserBar previewUrl={previewUrl} iframeRef={iframeRef} />
      )}
      <div className="relative flex-1 min-h-0 bg-white">
        {!iframeLoaded && previewUrl && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 backdrop-blur-md">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-6 animate-spin text-black/20" />
              <p className="text-sm text-black/30 font-medium">Loading preview…</p>
            </div>
          </div>
        )}
        {previewUrl && (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className={cn(
              "h-full w-full transition-opacity duration-300",
              iframeLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setIframeLoaded(true)}
            allow="cross-origin-isolated"
            title="Flutter App Preview"
          />
        )}
      </div>
    </div>
  );
}

// ── Main workspace ────────────────────────────────────────────────────────
function WorkspaceContent({ initialPrompt }: { initialPrompt: string }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const [runtimeKey] = useState(`flutter:workspace:${Date.now()}`);
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");

  const chat = useChat<UIMessage>({
    id: runtimeKey,
    transport: new AssistantChatTransport({ api: "/api/flutter/chat" }),
    messages: EMPTY_MESSAGES,
  });

  const runtime = useAISDKRuntime(chat);

  const hasSubmittedRef = useRef(false);
  useEffect(() => {
    if (initialPrompt && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      chat.sendMessage({ role: "user", parts: [{ type: "text", text: initialPrompt }] });
    }
  }, [initialPrompt, chat]);

  // Extract preview URL from messages — the AI embeds it after flutterServeWeb
  const previewUrl = extractPreviewUrl(chat.messages);
  const isBuilding =
    chat.status === "streaming" ||
    chat.status === "submitted";


  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="workspace-root relative flex h-screen w-full overflow-hidden bg-slate-50">
        <SkyBackground variant="workspace" />

        {/* Sidebar / Chat Area */}
        <aside
          className={cn(
            "workspace-sidebar h-full flex flex-col glass-card !rounded-none !border-y-0 !border-l-0 !shadow-none z-20 w-[400px] shrink-0",
            isMobile && mobileView === "preview" ? "hidden" : "flex"
          )}
        >
          <header className="flex flex-col gap-5 py-8 px-8 border-b border-black/5 bg-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between w-full">
              <nav className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                <button 
                  onClick={() => router.push("/flutter")}
                  className="hover:text-slate-900 transition-colors"
                >
                  Workspace
                </button>
                <span>/</span>
                <span className="text-slate-600">Project</span>
              </nav>
              
              {isBuilding ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-[10px] font-bold text-sky-600 border border-sky-100 shadow-sm">
                  <div className="size-1.5 rounded-full bg-sky-500 animate-pulse" />
                  BUILDING
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-600 border border-emerald-100 shadow-sm">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  LIVE
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-950 leading-tight tracking-tight font-display">
                  {initialPrompt ? (initialPrompt.length > 40 ? initialPrompt.substring(0, 40) + "..." : initialPrompt) : "Flutter Builder"}
                </h1>
                <p className="text-[11px] text-slate-500 font-bold tracking-widest uppercase mt-1 opacity-60">Samaa Cloud Console</p>
              </div>
              
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileView("preview")}
                  className="p-3 rounded-2xl bg-slate-900 text-white hover:bg-black transition-all active:scale-95 shadow-lg"
                >
                  <Monitor className="size-4" />
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 min-h-0 flex flex-col pt-4">
            <Thread />
          </div>
        </aside>

        {/* Preview Area */}
        <main
          className={cn(
            "workspace-content h-full flex-1 min-w-0 flex flex-col relative",
            isMobile && mobileView === "chat" ? "hidden" : "flex"
          )}
        >
          {isMobile && mobileView === "preview" && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
               <button
                  type="button"
                  onClick={() => setMobileView("chat")}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-black/5 text-slate-900 px-5 py-2.5 rounded-full shadow-xl hover:bg-white active:scale-95 transition-all outline-none"
                >
                  <MessageSquare className="size-4" />
                  <span className="text-sm font-semibold">Back to Chat</span>
                </button>
            </div>
          )}
          
          <div className="workspace-preview-container flex-1 m-4 rounded-3xl overflow-hidden border border-black/5 shadow-2xl bg-white/50 backdrop-blur-sm relative z-10">
            <PreviewPanel 
              previewUrl={previewUrl} 
              isBuilding={isBuilding} 
              hasMessages={chat.messages.length > 0} 
            />
          </div>

          <div className="absolute top-6 right-6 z-[20]">
            <ApiKeySettingsDialog />
          </div>
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}

function FlutterWorkspacePageInner() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") ?? "";
  return <WorkspaceContent initialPrompt={initialPrompt} />;
}

export default function FlutterWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="text-white/30 text-sm">Loading…</div>
        </div>
      }
    >
      <FlutterWorkspacePageInner />
    </Suspense>
  );
}
