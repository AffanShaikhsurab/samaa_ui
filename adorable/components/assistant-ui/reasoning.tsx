"use client";

import { memo, useCallback, useRef, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import {
  useScrollLock,
  useAssistantState,
  type ReasoningMessagePartComponent,
  type ReasoningGroupComponent,
} from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const ANIMATION_DURATION = 200;

const reasoningVariants = cva("aui-reasoning-root mb-4 w-full", {
  variants: {
    variant: {
      default: "",
      outline: "rounded-lg border px-3 py-2",
      muted: "rounded-lg bg-muted/50 px-3 py-2",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type ReasoningRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> &
  VariantProps<typeof reasoningVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
  };

function ReasoningRoot({
  className,
  variant,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  children,
  ...props
}: ReasoningRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        lockScroll();
      }
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      controlledOnOpenChange?.(open);
    },
    [lockScroll, isControlled, controlledOnOpenChange],
  );

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="reasoning-root"
      data-variant={variant}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(reasoningVariants({ variant, className }))}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </Collapsible>
  );
}

function ReasoningFade({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="reasoning-fade"
      className={cn(
        "aui-reasoning-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8",
        "bg-[linear-gradient(to_top,white,transparent)]",
        "fade-in-0 animate-in",
        "group-data-[state=open]/collapsible-content:animate-out",
        "group-data-[state=open]/collapsible-content:fade-out-0",
        "group-data-[state=open]/collapsible-content:delay-[calc(var(--animation-duration)*0.75)]",
        "group-data-[state=open]/collapsible-content:fill-mode-forwards",
        "duration-(--animation-duration)",
        "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        className,
      )}
      {...props}
    />
  );
}

function ReasoningTrigger({
  active,
  className,
  ...props
}: React.ComponentProps<typeof CollapsibleTrigger> & { active?: boolean }) {
  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn(
        "aui-reasoning-trigger flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors",
        className,
      )}
      {...props}
    >
      <div className="relative">
        <BrainIcon className="size-3.5" />
        {active && (
          <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-sky-500 animate-pulse" />
        )}
      </div>
      <span className="text-[12px] font-bold uppercase tracking-widest">Thought Process</span>
      <ChevronDownIcon className="size-3.5 transition-transform duration-(--animation-duration) [[data-slot=reasoning-root][data-state=open]_&]:rotate-180" />
    </CollapsibleTrigger>
  );
}

function ReasoningContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn(
        "aui-reasoning-content overflow-hidden text-sm transition-all duration-(--animation-duration) data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down",
        className,
      )}
      {...props}
    >
      <div className="aui-reasoning-content-inner relative mt-3 rounded-xl border border-black/5 bg-black/[0.02] px-4 py-3 text-slate-600">
        {children}
      </div>
    </CollapsibleContent>
  );
}

function ReasoningText({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="reasoning-text"
      className={cn(
        "aui-reasoning-text relative z-0 max-h-64 space-y-4 overflow-y-auto pt-2 pb-4 pl-6 leading-relaxed",
        "transform-gpu transition-[transform,opacity]",
        "group-data-[state=open]/collapsible-content:animate-in",
        "group-data-[state=closed]/collapsible-content:animate-out",
        "group-data-[state=open]/collapsible-content:fade-in-0",
        "group-data-[state=closed]/collapsible-content:fade-out-0",
        "group-data-[state=open]/collapsible-content:slide-in-from-top-4",
        "group-data-[state=closed]/collapsible-content:slide-out-to-top-4",
        "group-data-[state=open]/collapsible-content:duration-(--animation-duration)",
        "group-data-[state=closed]/collapsible-content:duration-(--animation-duration)",
        "[&_p]:-mb-2",
        className,
      )}
      {...props}
    />
  );
}

const ReasoningImpl: ReasoningMessagePartComponent = () => <MarkdownText />;

const ReasoningGroupImpl: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex,
}) => {
  const isReasoningStreaming = useAssistantState(({ message }) => {
    if (message.status?.type !== "running") return false;
    const lastIndex = message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  return (
    <ReasoningRoot defaultOpen={isReasoningStreaming}>
      <ReasoningTrigger active={isReasoningStreaming} />
      <ReasoningContent aria-busy={isReasoningStreaming}>
        <ReasoningText>{children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
};

const Reasoning = memo(
  ReasoningImpl,
) as unknown as ReasoningMessagePartComponent & {
  Root: typeof ReasoningRoot;
  Trigger: typeof ReasoningTrigger;
  Content: typeof ReasoningContent;
  Text: typeof ReasoningText;
  Fade: typeof ReasoningFade;
};

Reasoning.displayName = "Reasoning";
Reasoning.Root = ReasoningRoot;
Reasoning.Trigger = ReasoningTrigger;
Reasoning.Content = ReasoningContent;
Reasoning.Text = ReasoningText;
Reasoning.Fade = ReasoningFade;

const ReasoningGroup = memo(ReasoningGroupImpl);
ReasoningGroup.displayName = "ReasoningGroup";

export {
  Reasoning,
  ReasoningGroup,
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
  ReasoningFade,
  reasoningVariants,
};
