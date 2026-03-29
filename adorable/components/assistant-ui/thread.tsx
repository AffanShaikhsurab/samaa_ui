import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { Reasoning, ReasoningGroup } from "@/components/assistant-ui/reasoning";
import {
  AppendToFileToolCard,
  BashToolCard,
  CheckAppToolCard,
  CommitToolCard,
  DevServerLogsToolCard,
  DeletePathToolCard,
  FlutterBuildWebToolCard,
  FlutterCreateToolCard,
  FlutterDoctorToolCard,
  FlutterPubGetToolCard,
  FlutterServeWebToolCard,
  ListFilesToolCard,
  MakeDirectoryToolCard,
  MovePathToolCard,
  ReadFileToolCard,
  ReplaceInFileToolCard,
  SearchFilesToolCard,
  WriteFileToolCard,
} from "@/components/assistant-ui/tool-cards";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import {
  groupConsecutiveToolCalls,
  ToolCallGroup,
} from "@/components/assistant-ui/tool-group";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AssistantIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import type { FC, ReactNode } from "react";

export const Thread: FC<{ welcome?: ReactNode }> = ({ welcome }) => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root workspace-thread-root @container flex h-full flex-col bg-transparent"
    >
      <ThreadPrimitive.Viewport className="aui-thread-viewport aui-no-scrollbar relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto px-6 py-8 scroll-smooth">
        {welcome && (
          <AssistantIf condition={({ thread }) => thread.isEmpty}>
            {welcome}
          </AssistantIf>
        )}

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            EditComposer,
            AssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer sticky bottom-0 mx-auto mt-auto flex w-full flex-col gap-4 overflow-visible bg-transparent pb-4">
          <ThreadScrollToBottom />
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:bg-background dark:hover:bg-accent"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};
const Composer: FC = () => {
  return (
    <div className="w-full px-4 py-4">
      <ComposerPrimitive.Root className="relative flex w-full flex-col">
        <ComposerPrimitive.AttachmentDropzone className="flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-black/5 rounded-2xl px-4 py-2.5 shadow-sm focus-within:border-sky-500/30 transition-all">
          <ComposerAttachments />
          <ComposerPrimitive.Input
            data-composer-textarea="true"
            placeholder="Add custom logic..."
            className="flex-1 bg-transparent border-none outline-none text-slate-900 text-[14px] py-1.5 placeholder:text-slate-400"
            rows={1}
            aria-label="Message input"
          />
          <div className="z-10 shrink-0">
            <ComposerAction />
          </div>
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Root>
    </div>
  );
};

const ComposerAction: FC = () => {
  return (
    <>
      <AssistantIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button type="submit" className="flex size-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm hover:bg-slate-800 transition-all active:scale-95">
             <ArrowUpIcon className="size-4" />
          </button>
        </ComposerPrimitive.Send>
      </AssistantIf>

      <AssistantIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button type="button" className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all">
            <SquareIcon className="size-3 fill-current" />
          </button>
        </ComposerPrimitive.Cancel>
      </AssistantIf>
    </>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="relative mx-auto w-full animate-in py-4 duration-150 fade-in slide-in-from-bottom-1"
      data-role="assistant"
    >
      <div className="prose prose-slate prose-sm max-w-none">
        <MessagePrimitive.Unstable_PartsGrouped
          groupingFunction={groupConsecutiveToolCalls}
          components={{
            Text: MarkdownText,
            Reasoning,
            Group: ToolCallGroup,
            tools: {
              by_name: {
                bash: BashToolCard,
                readFile: ReadFileToolCard,
                writeFile: WriteFileToolCard,
                listFiles: ListFilesToolCard,
                replaceInFile: ReplaceInFileToolCard,
                flutterDoctor: FlutterDoctorToolCard,
                flutterCreate: FlutterCreateToolCard,
                flutterPubGet: FlutterPubGetToolCard,
                flutterBuildWeb: FlutterBuildWebToolCard,
                flutterServeWeb: FlutterServeWebToolCard,
                // Legacy names (kept for backwards compat)
                bashTool: BashToolCard,
                readFileTool: ReadFileToolCard,
                writeFileTool: WriteFileToolCard,
                listFilesTool: ListFilesToolCard,
                searchFilesTool: SearchFilesToolCard,
                replaceInFileTool: ReplaceInFileToolCard,
                appendToFileTool: AppendToFileToolCard,
                makeDirectoryTool: MakeDirectoryToolCard,
                movePathTool: MovePathToolCard,
                deletePathTool: DeletePathToolCard,
                commitTool: CommitToolCard,
                checkAppTool: CheckAppToolCard,
                devServerLogsTool: DevServerLogsToolCard,
              },
              Fallback: ToolFallback,
            },
          }}
        />
        <MessageError />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="aui-assistant-action-bar-root col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground data-floating:absolute data-floating:rounded-md data-floating:border data-floating:bg-background data-floating:p-1 data-floating:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AssistantIf condition={({ message }) => message.isCopied}>
            <CheckIcon />
          </AssistantIf>
          <AssistantIf condition={({ message }) => !message.isCopied}>
            <CopyIcon />
          </AssistantIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton
            tooltip="More"
            className="data-[state=open]:bg-accent"
          >
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
              <DownloadIcon className="size-4" />
              Export as Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="relative mx-auto grid w-full animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 py-4 duration-150 fade-in slide-in-from-bottom-1 [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="relative col-start-2 min-w-0 max-w-[85%] bg-sky-500 text-white rounded-2xl px-4 py-2.5 shadow-sm">
        <div className="text-[14px] leading-relaxed font-medium">
          <MessagePrimitive.Parts />
        </div>
      </div>

      <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root className="aui-edit-composer-root ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-sm text-foreground outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">Update</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-xs text-muted-foreground",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
