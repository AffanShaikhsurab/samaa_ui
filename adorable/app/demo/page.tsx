"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Loader2, Sparkles, CheckCircle2, Play,
  FolderOpen,
  ChevronRight, ChevronDown, GripVertical,
  File, Folder
} from "lucide-react";
import { encode } from "gpt-tokenizer";

const DEMO_ANCL_CODE = `#n:InstaLite,d

 M:Story{ id:int, label:str, viewed:bool=false }
 M:Post{ id:int, author:str, handle:str, caption:str, mediaLabel:str, liked:bool=false, saved:bool=false }
 M:ExploreItem{ id:int, title:str, subtitle:str }
 M:Comment{ id:int, postId:int, author:str, body:str }

 N:InstaBloc{
   activeTab:String="home", shellTab:String="home", stories:List<Story>=[], posts:List<Post>=[],
   exploreItems:List<ExploreItem>=[], searchResults:List<ExploreItem>=[],
   profileTitle:String="@ari.vega", followers:int=12800, following:int=318

   init(){
     stories = [Story(id:1, label:"You"), Story(id:2, label:"Mia"), Story(id:3, label:"Noah"), Story(id:4, label:"Ari"), Story(id:5, label:"Zoe", viewed:true)];
     posts = [Post(id:1, author:"Mia Chen", handle:"@mia.design", caption:"Golden hour.", mediaLabel:"Studio shoot"), Post(id:2, author:"Noah Patel", handle:"@noah.codes", caption:"Building social surfaces.", mediaLabel:"Launch board", liked:true)];
     exploreItems = [ExploreItem(id:1, title:"Design systems", subtitle:"Reusable surfaces")];
     searchResults = exploreItems;
     comments = [Comment(id:1, postId:1, author:"Noah", body:"Polished.")];
   }

   SetPrimaryTab(tab:String){ activeTab = tab; shellTab = tab; }
   OpenStory(label:String){ activeTab = "story"; }
   ToggleLike(postId:int){ posts = posts.map((p) => p.id == postId ? Post(id:p.id, author:p.author, handle:p.handle, caption:p.caption, mediaLabel:p.mediaLabel, liked:!p.liked, saved:p.saved) : p).toList(); }
 }

 S(MainRoute)B[switch(InstaBloc.state.activeTab){ case "story": D{const StoryView()} default: D{const ShellView()} }]
 S(ShellView)B[C[Exp[IStack($InstaBloc.state.activeTabIndex)[D{const HomeView()}]], BottomTabShell()]]
 S(HomeView)B[L[Ctr(p:16)[R(main:spaceBetween)[T(Instagram, size:28, fw:800)]], StoryTray(), for($post)[PostCard()]]]`;

const BUILD_STEPS = [
  { label: "Creating sandbox", explanation: "Isolated cloud environment" },
  { label: "Installing dependencies", explanation: "Flutter SDK + BloC + 25 packages" },
  { label: "Compiling ANCL to Flutter", explanation: "Transpiling DSL to Dart AST" },
  { label: "Building web assets", explanation: "Compiling to HTML/CSS/JS" },
  { label: "Optimizing bundle", explanation: "Tree-shaking & minification" },
  { label: "Deploying to cloud", explanation: "Live preview ready! 🚀" },
];

const FILE_STRUCTURE = [
  {
    name: "lib",
    type: "folder" as const,
    children: [
      { name: "main.dart", type: "file" as const, path: "lib/main.dart", lines: 34 },
      {
        name: "bloc", type: "folder" as const,
        children: [
          { name: "insta_bloc_bloc.dart", type: "file" as const, path: "lib/bloc/insta_bloc_bloc.dart", lines: 450 },
          { name: "insta_bloc_event.dart", type: "file" as const, path: "lib/bloc/insta_bloc_event.dart", lines: 126 },
          { name: "insta_bloc_state.dart", type: "file" as const, path: "lib/bloc/insta_bloc_state.dart", lines: 226 },
        ]
      },
      {
        name: "data", type: "folder" as const,
        children: [
          {
            name: "models", type: "folder" as const,
            children: [
              { name: "comment.dart", type: "file" as const, path: "lib/data/models/comment.dart", lines: 45 },
              { name: "conversation_message.dart", type: "file" as const, path: "lib/data/models/conversation_message.dart", lines: 52 },
              { name: "conversation_thread.dart", type: "file" as const, path: "lib/data/models/conversation_thread.dart", lines: 48 },
              { name: "explore_item.dart", type: "file" as const, path: "lib/data/models/explore_item.dart", lines: 38 },
              { name: "highlight_item.dart", type: "file" as const, path: "lib/data/models/highlight_item.dart", lines: 42 },
              { name: "post.dart", type: "file" as const, path: "lib/data/models/post.dart", lines: 55 },
              { name: "relationship_user.dart", type: "file" as const, path: "lib/data/models/relationship_user.dart", lines: 44 },
              { name: "story.dart", type: "file" as const, path: "lib/data/models/story.dart", lines: 36 },
            ]
          },
          {
            name: "repositories", type: "folder" as const,
            children: [
              { name: "insta_bloc_local_repository.dart", type: "file" as const, path: "lib/data/repositories/insta_bloc_local_repository.dart", lines: 89 },
            ]
          }
        ]
      },
      {
        name: "presentation", type: "folder" as const,
        children: [
          {
            name: "components", type: "folder" as const,
            children: [
              { name: "action_pill.dart", type: "file" as const, path: "lib/presentation/components/action_pill.dart", lines: 67 },
              { name: "bottom_tab_shell.dart", type: "file" as const, path: "lib/presentation/components/bottom_tab_shell.dart", lines: 124 },
              { name: "comment_composer.dart", type: "file" as const, path: "lib/presentation/components/comment_composer.dart", lines: 95 },
              { name: "comment_row.dart", type: "file" as const, path: "lib/presentation/components/comment_row.dart", lines: 78 },
              { name: "comment_sheet_header.dart", type: "file" as const, path: "lib/presentation/components/comment_sheet_header.dart", lines: 52 },
              { name: "conversation_composer.dart", type: "file" as const, path: "lib/presentation/components/conversation_composer.dart", lines: 88 },
              { name: "conversation_header.dart", type: "file" as const, path: "lib/presentation/components/conversation_header.dart", lines: 64 },
              { name: "conversation_hint.dart", type: "file" as const, path: "lib/presentation/components/conversation_hint.dart", lines: 45 },
              { name: "conversation_thread_row.dart", type: "file" as const, path: "lib/presentation/components/conversation_thread_row.dart", lines: 92 },
              { name: "explore_grid.dart", type: "file" as const, path: "lib/presentation/components/explore_grid.dart", lines: 156 },
              { name: "explore_tile.dart", type: "file" as const, path: "lib/presentation/components/explore_tile.dart", lines: 89 },
              { name: "inbox_category_tabs.dart", type: "file" as const, path: "lib/presentation/components/inbox_category_tabs.dart", lines: 58 },
              { name: "inbox_header.dart", type: "file" as const, path: "lib/presentation/components/inbox_header.dart", lines: 71 },
              { name: "media_composer.dart", type: "file" as const, path: "lib/presentation/components/media_composer.dart", lines: 102 },
              { name: "media_detail_viewer.dart", type: "file" as const, path: "lib/presentation/components/media_detail_viewer.dart", lines: 134 },
              { name: "media_grid.dart", type: "file" as const, path: "lib/presentation/components/media_grid.dart", lines: 78 },
              { name: "message_bubble.dart", type: "file" as const, path: "lib/presentation/components/message_bubble.dart", lines: 98 },
              { name: "message_notice_banner.dart", type: "file" as const, path: "lib/presentation/components/message_notice_banner.dart", lines: 48 },
              { name: "post_actions.dart", type: "file" as const, path: "lib/presentation/components/post_actions.dart", lines: 112 },
              { name: "post_card.dart", type: "file" as const, path: "lib/presentation/components/post_card.dart", lines: 178 },
              { name: "post_draft_preview.dart", type: "file" as const, path: "lib/presentation/components/post_draft_preview.dart", lines: 67 },
              { name: "post_header.dart", type: "file" as const, path: "lib/presentation/components/post_header.dart", lines: 89 },
              { name: "post_media.dart", type: "file" as const, path: "lib/presentation/components/post_media.dart", lines: 94 },
              { name: "post_meta.dart", type: "file" as const, path: "lib/presentation/components/post_meta.dart", lines: 71 },
              { name: "privacy_state_badge.dart", type: "file" as const, path: "lib/presentation/components/privacy_state_badge.dart", lines: 42 },
              { name: "profile_action_row.dart", type: "file" as const, path: "lib/presentation/components/profile_action_row.dart", lines: 86 },
              { name: "profile_content_tabs.dart", type: "file" as const, path: "lib/presentation/components/profile_content_tabs.dart", lines: 154 },
              { name: "profile_highlights_row.dart", type: "file" as const, path: "lib/presentation/components/profile_highlights_row.dart", lines: 98 },
              { name: "profile_identity_header.dart", type: "file" as const, path: "lib/presentation/components/profile_identity_header.dart", lines: 112 },
              { name: "profile_metrics_bar.dart", type: "file" as const, path: "lib/presentation/components/profile_metrics_bar.dart", lines: 76 },
              { name: "profile_stat.dart", type: "file" as const, path: "lib/presentation/components/profile_stat.dart", lines: 58 },
              { name: "profile_top_bar.dart", type: "file" as const, path: "lib/presentation/components/profile_top_bar.dart", lines: 94 },
              { name: "publish_action_bar.dart", type: "file" as const, path: "lib/presentation/components/publish_action_bar.dart", lines: 82 },
              { name: "quick_reaction_bar.dart", type: "file" as const, path: "lib/presentation/components/quick_reaction_bar.dart", lines: 65 },
              { name: "reel_actions.dart", type: "file" as const, path: "lib/presentation/components/reel_actions.dart", lines: 108 },
              { name: "reel_card.dart", type: "file" as const, path: "lib/presentation/components/reel_card.dart", lines: 142 },
              { name: "reel_pager.dart", type: "file" as const, path: "lib/presentation/components/reel_pager.dart", lines: 118 },
              { name: "relationship_action_chip.dart", type: "file" as const, path: "lib/presentation/components/relationship_action_chip.dart", lines: 72 },
              { name: "search_surface.dart", type: "file" as const, path: "lib/presentation/components/search_surface.dart", lines: 135 },
              { name: "section_header.dart", type: "file" as const, path: "lib/presentation/components/section_header.dart", lines: 48 },
              { name: "social_list_sheet.dart", type: "file" as const, path: "lib/presentation/components/social_list_sheet.dart", lines: 165 },
              { name: "social_tab_bar.dart", type: "file" as const, path: "lib/presentation/components/social_tab_bar.dart", lines: 270 },
              { name: "story_bubble.dart", type: "file" as const, path: "lib/presentation/components/story_bubble.dart", lines: 88 },
              { name: "story_tray.dart", type: "file" as const, path: "lib/presentation/components/story_tray.dart", lines: 145 },
              { name: "story_viewer.dart", type: "file" as const, path: "lib/presentation/components/story_viewer.dart", lines: 189 },
              { name: "surface_header.dart", type: "file" as const, path: "lib/presentation/components/surface_header.dart", lines: 62 },
            ]
          },
          {
            name: "screens", type: "folder" as const,
            children: [
              { name: "comments_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/comments_view_screen.dart", lines: 156 },
              { name: "create_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/create_view_screen.dart", lines: 178 },
              { name: "followers_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/followers_view_screen.dart", lines: 134 },
              { name: "following_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/following_view_screen.dart", lines: 128 },
              { name: "home_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/home_view_screen.dart", lines: 198 },
              { name: "inbox_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/inbox_view_screen.dart", lines: 167 },
              { name: "main_route_screen.dart", type: "file" as const, path: "lib/presentation/screens/main_route_screen.dart", lines: 85 },
              { name: "media_viewer_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/media_viewer_view_screen.dart", lines: 145 },
              { name: "messages_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/messages_view_screen.dart", lines: 189 },
              { name: "profile_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/profile_view_screen.dart", lines: 173 },
              { name: "reels_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/reels_view_screen.dart", lines: 156 },
              { name: "search_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/search_view_screen.dart", lines: 142 },
              { name: "shell_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/shell_view_screen.dart", lines: 92 },
              { name: "story_view_screen.dart", type: "file" as const, path: "lib/presentation/screens/story_view_screen.dart", lines: 168 },
            ]
          }
        ]
      }
    ]
  }
];

const ANCL_TOKENS = encode(DEMO_ANCL_CODE).length;
const REAL_FLUTTER_TOKENS = 52169;
const COMPRESSION_RATIO = Math.round((1 - ANCL_TOKENS / REAL_FLUTTER_TOKENS) * 100);
const TOTAL_GENERATED_LINES = 2250;

interface FileNode {
  name: string;
  type: "file" | "folder";
  path?: string;
  lines?: number;
  children?: FileNode[];
}

function highlightDartCode(code: string): React.ReactNode[] {
  return code.split("\n").map((line, i) => {
    let result: React.ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;

    const patterns: { regex: RegExp; className: string }[] = [
      { regex: /\b(import|export|class|extends|implements|with|mixin|typedef|enum|void|int|String|bool|var|dynamic|final|const|static|abstract|override| covariant|late|required|this|super|return|if|else|for|while|do|switch|case|break|continue|new|await|async|future|stream|set|get|operator)\b/g, className: "kw" },
      { regex: /'[^']*'|"[^"]*"/g, className: "st" },
      { regex: /\b[A-Z][a-zA-Z0-9_]*\b/g, className: "cl" },
    ];

    const segments: { text: string; className: string }[] = [];
    let cursor = 0;

    const allMatches: { start: number; end: number; text: string; className: string }[] = [];

    patterns.forEach(({ regex, className }) => {
      let match;
      const r = new RegExp(regex.source, 'g');
      while ((match = r.exec(line)) !== null) {
        allMatches.push({ start: match.index, end: match.index + match[0].length, text: match[0], className });
      }
    });

    allMatches.sort((a, b) => a.start - b.start);

    const filtered: typeof allMatches = [];
    let lastEnd = -1;
    allMatches.forEach(m => {
      if (m.start >= lastEnd) {
        filtered.push(m);
        lastEnd = m.end;
      }
    });

    lastEnd = 0;
    filtered.forEach(m => {
      if (m.start > lastEnd) {
        segments.push({ text: line.slice(lastEnd, m.start), className: "" });
      }
      segments.push({ text: m.text, className: m.className });
      lastEnd = m.end;
    });
    if (lastEnd < line.length) {
      segments.push({ text: line.slice(lastEnd), className: "" });
    }

    if (segments.length === 0) {
      segments.push({ text: line || " ", className: "" });
    }

    return (
      <div key={i} className="flex">
        <span className="ln w-[35px] text-right pr-4 text-[#475569] select-none shrink-0">{i + 1}</span>
        <span className="flex-1">
          {segments.map((seg, j) => (
            <span key={j} className={seg.className}>{seg.text}</span>
          ))}
        </span>
      </div>
    );
  });
}

function FileTree({ files, level = 0, selectedFile, onFileSelect, expandedFolders, toggleFolder }: {
  files: FileNode[];
  level?: number;
  selectedFile: string | null;
  onFileSelect: (file: FileNode) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  return (
    <div className="select-none scrollbar-hide">
      {files.map((file) => {
        const isExpanded = expandedFolders.has(file.path || file.name);
        const isSelected = selectedFile === file.path;

        if (file.type === "folder") {
          return (
            <div key={file.path || file.name}>
              <button
                onClick={() => toggleFolder(file.path || file.name)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all hover:bg-black/[0.04]",
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="w-[18px] h-[18px] shrink-0" style={{ color: '#374151' }} />
                ) : (
                  <ChevronRight className="w-[18px] h-[18px] shrink-0" style={{ color: '#374151' }} />
                )}
                <Folder className="w-[18px] h-[18px] shrink-0" style={{ color: '#374151' }} />
                <span className="truncate" style={{ color: '#374151' }}>{file.name}</span>
              </button>
              {isExpanded && file.children && (
                <div className="ml-5 pl-4 border-l-2 border-black/[0.08]">
                  <FileTree
                    files={file.children}
                    level={level + 1}
                    selectedFile={selectedFile}
                    onFileSelect={onFileSelect}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                  />
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={file.path}
            onClick={() => onFileSelect(file)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all mb-0.5",
              isSelected ? "bg-[#1e293b] text-white shadow-lg" : "hover:bg-black/[0.04]"
            )}
            style={!isSelected ? { color: '#374151' } : {}}
          >
            <File className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate flex-1 text-left">{file.name}</span>
            <span className="text-xs opacity-60 shrink-0">{file.lines}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function InvestorDemoPage() {
  const [stage, setStage] = useState<"intro" | "ancl" | "building" | "editor">("intro");
  const [currentBuildStep, setCurrentBuildStep] = useState(0);
  const [codeLines, setCodeLines] = useState<string[]>([]);
  const [codeComplete, setCodeComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // Desktop by default in editor
  const [leftPanelWidth, setLeftPanelWidth] = useState(420);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["lib", "lib/bloc", "lib/data", "lib/data/models", "lib/data/repositories", "lib/presentation", "lib/presentation/components", "lib/presentation/screens"]));
  const [codeEditorHeight, setCodeEditorHeight] = useState(400);
  const [isResizingCode, setIsResizingCode] = useState(false);
  const [codeEditorExpanded, setCodeEditorExpanded] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<"code" | "preview">("code");
  const [mobileViewTab, setMobileViewTab] = useState<"code" | "files" | "preview">("code");
  const [mobileScale, setMobileScale] = useState(1);
  const codeEditorRef = useRef<HTMLDivElement>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);

  const calculateMobileScale = useCallback(() => {
    if (!previewAreaRef.current || !isMobile) {
      setMobileScale(1);
      return;
    }
    const container = previewAreaRef.current;
    const padding = 48;
    const availableHeight = container.clientHeight - padding;
    const availableWidth = container.clientWidth - padding;
    const targetHeight = 896;
    const targetWidth = 414;
    const scaleH = availableHeight / targetHeight;
    const scaleW = availableWidth / targetWidth;
    const newScale = Math.min(scaleH, scaleW, 1);
    setMobileScale(newScale);
  }, [isMobile]);

  useEffect(() => {
    if (stage === "editor" && rightPanelView === "preview") {
      const timer = setTimeout(calculateMobileScale, 50);
      window.addEventListener("resize", calculateMobileScale);
      return () => {
        window.removeEventListener("resize", calculateMobileScale);
        clearTimeout(timer);
      };
    }
  }, [stage, rightPanelView, calculateMobileScale]);

  useEffect(() => {
    if (isMobile && rightPanelView === "preview") {
      calculateMobileScale();
    }
  }, [isMobile, rightPanelView, calculateMobileScale]);

  const handleCodeResizeMouseDown = useCallback(() => {
    setIsResizingCode(true);
  }, []);

  const handleCodeResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingCode || !codeEditorRef.current) return;
    const rect = codeEditorRef.current.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const newHeight = e.clientY - rect.top;
    setCodeEditorHeight(Math.max(200, Math.min(600, newHeight)));
  }, [isResizingCode]);

  const handleCodeResizeMouseUp = useCallback(() => {
    setIsResizingCode(false);
  }, []);

  useEffect(() => {
    if (isResizingCode) {
      window.addEventListener("mousemove", handleCodeResizeMouseMove);
      window.addEventListener("mouseup", handleCodeResizeMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleCodeResizeMouseMove);
        window.removeEventListener("mouseup", handleCodeResizeMouseUp);
      };
    }
  }, [isResizingCode, handleCodeResizeMouseMove, handleCodeResizeMouseUp]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const newWidth = e.clientX - rect.left;
    setLeftPanelWidth(Math.max(280, Math.min(700, newWidth)));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [codeLines]);

  useEffect(() => {
    if (stage !== "ancl") return;
    const lines = DEMO_ANCL_CODE.split("\n");
    let i = 0;
    const timer = setInterval(() => {
      if (i < lines.length) {
        setCodeLines(lines.slice(0, i + 1));
        i++;
      } else {
        setCodeComplete(true);
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "building") return;
    let step = 0;
    const timer = setInterval(() => {
      if (step < BUILD_STEPS.length) {
        setCurrentBuildStep(step);
        step++;
      } else {
        clearInterval(timer);
        setTimeout(() => setStage("editor"), 1000);
      }
    }, 1200);
    return () => clearInterval(timer);
  }, [stage]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleFileSelect = useCallback(async (file: FileNode) => {
    if (file.type !== "file" || !file.path) return;
    setSelectedFile(file);
    try {
      const response = await fetch(`/generated-code/${file.path}`);
      if (response.ok) {
        const text = await response.text();
        setFileContent(text);
      } else {
        setFileContent(`// File not found: ${file.path}`);
      }
    } catch {
      setFileContent(`// Error loading file: ${file.path}`);
    }
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-[#6fbdfd] to-[#479ff8] font-sans" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Fira+Code:wght@400;500&display=swap');
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .glass-editorial { background: rgba(255, 255, 255, 0.55); backdrop-filter: blur(40px) saturate(120%); -webkit-backdrop-filter: blur(40px) saturate(120%); border: 1px solid rgba(255, 255, 255, 0.7); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06); }
        .glass-card { background: rgba(255, 255, 255, 0.55); backdrop-filter: blur(40px) saturate(120%); -webkit-backdrop-filter: blur(40px) saturate(120%); border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 28px; padding: 28px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06); }
        .kw { color: #a78bfa; font-weight: 500; }
        .st { color: #34d399; }
        .cl { color: #60a5fa; font-weight: 500; }
        .code-editor-resize { cursor: row-resize; }
        @keyframes float-hero { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes core-shimmer { from { transform: scale(0.9); opacity: 0.6; } to { transform: scale(1.1); opacity: 1; } }
        @keyframes rotate-aura { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes typing { 0%, 60%, 100% { transform: translateY(0); opacity: 0.3; } 30% { transform: translateY(-6px); opacity: 1; } }
        @keyframes pulse-blob { from { transform: scale(1); opacity: 0.4; } to { transform: scale(1.15); opacity: 0.7; } }
        .aura-ring { position: absolute; border: 1px solid rgba(255,255,255,0.3); border-radius: 50%; animation: rotate-aura 15s linear infinite; }
        .aura-ring-1 { width: 350px; height: 350px; opacity: 0.2; }
        .aura-ring-2 { width: 450px; height: 450px; opacity: 0.1; animation-duration: 25s; animation-direction: reverse; }
        .blob { position: absolute; background: white; border-radius: 50%; filter: blur(40px); opacity: 0.6; animation: pulse-blob 4s infinite alternate ease-in-out; }
        .blob-1 { width: 180px; height: 180px; top: -20px; left: 20px; animation-delay: 0s; }
        .blob-2 { width: 220px; height: 160px; top: 20px; right: -10px; opacity: 0.5; animation-delay: 1s; }
        .blob-3 { width: 150px; height: 150px; bottom: -10px; left: 60px; opacity: 0.7; animation-delay: 2s; }
        .cloud-core { position: absolute; width: 100px; height: 100px; background: white; border-radius: 50%; filter: blur(20px); box-shadow: 0 0 60px 20px white; z-index: 5; opacity: 0.8; }
      `}</style>

      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [-40, 40], y: [-10, 10] }} transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }} className="absolute top-[-5%] left-[-5%] w-[800px] h-[500px] bg-white/40 blur-[100px] rounded-full" />
        <motion.div animate={{ x: [40, -40], y: [10, -10] }} transition={{ duration: 25, repeat: Infinity, repeatType: "mirror" }} className="absolute bottom-[-10%] right-[-5%] w-[700px] h-[600px] bg-white/30 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex h-full w-full">
        <AnimatePresence>
          {(stage === "ancl" || stage === "building") && (
            <motion.aside
              initial={{ x: -420 }}
              animate={{ x: 0 }}
              exit={{ x: -420 }}
              ref={panelRef}
              className="h-full bg-white/10 backdrop-blur-[30px] border-r border-white/20 flex flex-col shadow-2xl z-20"
              style={{ width: leftPanelWidth }}
            >
              <header className="p-6 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-semibold text-white/90">Flutter Builder</span>
                  <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
                </div>
                <button onClick={() => setStage("intro")} className="text-white/70 hover:text-white transition-colors text-sm font-medium">
                  Back
                </button>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
                <AnimatePresence>
                  <>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="self-end max-w-[85%] bg-white px-5 py-4 rounded-3xl rounded-br-md shadow-lg text-slate-800 text-[15px] font-medium ml-auto">
                      "Build me an Instagram clone app with stories, posts, and a profile section"
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="max-w-full bg-[#1e293b]/85 backdrop-blur-md px-5 py-4 rounded-3xl rounded-bl-md shadow-xl border border-white/10">
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                        <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Generating ANCL Blueprint</span>
                      </div>
                      <pre className="font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap scrollbar-hide">
                        {codeLines.map((line, i) => (
                          <div key={i} className={cn(
                            line.startsWith("M:") ? "text-sky-300 font-bold" :
                            line.startsWith("N:") ? "text-sky-300 font-bold" :
                            line.startsWith("S(") ? "text-sky-300 font-bold" : ""
                          )}>{line || " "}</div>
                        ))}
                        {!codeComplete && <span className="animate-pulse text-sky-400">▋</span>}
                      </pre>
                    </motion.div>
                  </>
                </AnimatePresence>
              </div>

              <footer className="p-6 border-t border-white/10">
                {stage === "ancl" && codeComplete ? (
                  <button onClick={() => setStage("building")} className="w-full py-4 bg-sky-500 text-white rounded-full font-semibold shadow-xl hover:bg-sky-600 transition-all flex items-center justify-center gap-2">
                    Compile Project <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-full py-4 bg-white/15 border border-white/20 rounded-full text-white/70 text-sm text-center font-medium flex items-center justify-center gap-3">
                    {stage === "building" ? <><Loader2 className="w-4 h-4 animate-spin" /> Compiling Assets</> : "Ready to Build"}
                  </div>
                )}
              </footer>
            </motion.aside>
          )}
        </AnimatePresence>

        {(stage === "ancl" || stage === "building") && (
          <div
            className={cn("w-1.5 bg-white/20 hover:bg-sky-400/50 cursor-col-resize flex items-center justify-center transition-colors flex-shrink-0 z-20", isDragging && "bg-sky-400/50")}
            onMouseDown={handleMouseDown}
          >
            <GripVertical className="w-4 h-4 text-white/50" />
          </div>
        )}

        <main className="flex-1 relative flex flex-col min-w-0">
          <AnimatePresence mode="wait">

            {stage === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-8 border border-white/30 backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-white" />
                  <span className="text-xs font-semibold text-white uppercase tracking-widest">AI Engine v2.4</span>
                </div>
                <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight mb-6 drop-shadow-2xl">Prompt to App.<br />In Seconds.</h1>
                <p className="text-lg text-white/90 font-normal leading-relaxed mb-10">Watch ANCL transform human intent into 2,000+ lines of production Dart code instantly.</p>
                <button onClick={() => setStage("ancl")} className="px-12 py-5 bg-white text-sky-600 rounded-full font-bold text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                  Launch Builder <Play className="w-5 h-5 fill-current" />
                </button>
              </motion.div>
            )}

            {stage === "building" && (
              <motion.div key="building" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center px-6">
                <div className="relative w-[300px] h-[200px] flex items-center justify-center animate-[float-hero_6s_ease-in-out_infinite]">
                  <div className="aura-ring aura-ring-1" />
                  <div className="aura-ring aura-ring-2" />
                  <div className="blob blob-1" />
                  <div className="blob blob-2" />
                  <div className="blob blob-3" />
                  <div className="cloud-core animate-[core-shimmer_2s_ease-in-out_infinite alternate]" />
                </div>
                <div className="mt-16 text-center z-10">
                  <h2 className="text-4xl font-bold text-white tracking-tight mb-3">Manifesting your vision</h2>
                  <div className="flex items-center justify-center gap-2 text-white/90">
                    <span>{BUILD_STEPS[currentBuildStep].label}</span>
                    <div className="flex gap-1 ml-2">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-[typing_1.4s_infinite]" />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-[typing_1.4s_infinite_0.2s]" />
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-[typing_1.4s_infinite_0.4s]" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {stage === "editor" && (
              <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                {/* Desktop Header - Hidden on Mobile */}
                <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                      <span className="text-sm font-semibold text-white/90">Flutter Builder</span>
                    </div>
                    <div className="h-4 w-px bg-white/20" />
                    <span className="text-xs text-white/50">InstaLite • Instagram Clone</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex bg-white/10 p-1 rounded-full border border-white/20">
                      <button onClick={() => setRightPanelView("code")} className={cn("px-5 py-2 rounded-full text-xs font-bold transition-all", rightPanelView === "code" ? "bg-white text-slate-800 shadow-md" : "text-white/70 hover:text-white")}>
                        Code Base
                      </button>
                      <button onClick={() => setRightPanelView("preview")} className={cn("px-5 py-2 rounded-full text-xs font-bold transition-all", rightPanelView === "preview" ? "bg-white text-slate-800 shadow-md" : "text-white/70 hover:text-white")}>
                        Preview
                      </button>
                    </div>
                    
                    {rightPanelView === "preview" && (
                      <div className="flex bg-white/10 p-1 rounded-full border border-white/20">
                        <button onClick={() => setIsMobile(false)} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all", !isMobile ? "bg-white text-slate-800 shadow-md" : "text-white/70 hover:text-white")}>
                          Desktop
                        </button>
                        <button onClick={() => setIsMobile(true)} className={cn("px-4 py-2 rounded-full text-xs font-bold transition-all", isMobile ? "bg-white text-slate-800 shadow-md" : "text-white/70 hover:text-white")}>
                          Mobile
                        </button>
                      </div>
                    )}
                    
                    <button className="px-5 py-2.5 bg-white text-sky-600 rounded-full font-bold text-xs shadow-xl hover:scale-105 active:scale-95 transition-all">
                      Export
                    </button>
                  </div>
                </div>
                
                {/* Desktop Content - Hidden on Mobile */}
                <div className="hidden md:flex flex-1 min-h-0">
                  {rightPanelView === "code" ? (
                    <div className="flex-1 grid grid-cols-[280px_1fr] gap-4 p-4 min-h-0">
                      <aside className="glass-editorial rounded-[20px] p-5 flex flex-col text-[#374151] overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-extrabold tracking-[1.5px] uppercase" style={{ color: 'rgba(15, 23, 42, 0.6)' }}>Project Files</span>
                          <span className="text-[10px] font-extrabold tracking-[1.5px] uppercase" style={{ color: 'rgba(15, 23, 42, 0.6)' }}>{TOTAL_GENERATED_LINES.toLocaleString()} Lines</span>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-hide">
                          <FileTree
                            files={FILE_STRUCTURE}
                            selectedFile={selectedFile?.path || null}
                            onFileSelect={handleFileSelect}
                            expandedFolders={expandedFolders}
                            toggleFolder={toggleFolder}
                          />
                        </div>
                      </aside>
                      
                      <div className="flex flex-col gap-4 min-h-0">
                        <div className="flex-1 flex flex-col rounded-[16px] overflow-hidden" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                          <div className="px-4 py-3 flex justify-between items-center shrink-0" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex gap-3 items-center">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              <span className="text-sm font-semibold text-white truncate max-w-[200px]">{selectedFile?.path || 'lib/main.dart'}</span>
                              <span className="text-xs text-white/50">{selectedFile?.lines || 34} lines</span>
                            </div>
                            <div className="flex gap-2 items-center">
                              <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                              <div className="w-3 h-3 rounded-full" style={{ background: '#eab308' }} />
                              <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
                            </div>
                          </div>
                          <div className="flex-1 overflow-auto p-4 scrollbar-hide" style={{ fontFamily: "'Fira Code', monospace", fontSize: '13px', lineHeight: '1.7', color: '#e2e8f0' }}>
                            {selectedFile && fileContent ? (
                              highlightDartCode(fileContent)
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full" style={{ color: '#64748b' }}>
                                <FolderOpen className="w-10 h-10 mb-3 opacity-40" />
                                <p className="text-sm font-medium">Select a file to view its contents</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="glass-editorial rounded-[20px] p-5 text-[#374151]">
                            <span className="text-[10px] font-extrabold tracking-[1.5px] uppercase block mb-3" style={{ color: 'rgba(15, 23, 42, 0.6)' }}>Compression</span>
                            <div className="flex items-baseline gap-2 mb-3">
                              <span className="text-[42px] font-black tracking-[-2px] leading-[0.9]" style={{ color: '#374151' }}>{COMPRESSION_RATIO}%</span>
                              <span className="text-sm font-bold" style={{ color: '#374151' }}>Token<br />Reduction</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '2px solid rgba(0,0,0,0.08)' }}>
                              <div>
                                <span className="text-[9px] font-extrabold uppercase tracking-[1px] block mb-1" style={{ color: 'rgba(15, 23, 42, 0.6)' }}>ANCL</span>
                                <span className="text-sm font-extrabold" style={{ color: '#374151' }}>{ANCL_TOKENS}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-extrabold uppercase tracking-[1px] block mb-1" style={{ color: 'rgba(15, 23, 42, 0.6)' }}>Flutter</span>
                                <span className="text-sm font-extrabold" style={{ color: '#374151' }}>{REAL_FLUTTER_TOKENS.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="glass-editorial rounded-[20px] p-5 text-[#374151]">
                            <span className="text-[10px] font-extrabold tracking-[1.5px] uppercase block mb-3" style={{ color: 'rgba(15, 23, 42, 0.6)' }}>Engine Benefits</span>
                            <div className="space-y-3">
                              {["Production-ready BloC", "~8 second build", "Live preview"].map((text, i) => (
                                <div key={i} className="flex items-center gap-3 text-[13px] font-bold" style={{ color: '#374151' }}>
                                  <div className="w-5 h-5 rounded-full bg-[#374151] flex items-center justify-center shrink-0">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  </div>
                                  {text}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div ref={previewAreaRef} className="flex-1 flex items-center justify-center p-6">
                      <div 
                        className={cn(
                          "relative bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] transition-all duration-500 overflow-hidden flex items-center justify-center",
                          !isMobile && "w-full h-full max-w-[1200px] rounded-[24px] border-[6px] border-white/30 shadow-2xl"
                        )}
                        style={isMobile ? {
                          height: '896px',
                          transform: `scale(${mobileScale})`,
                          transformOrigin: 'center center',
                          borderWidth: '12px',
                          borderColor: '#0f172a',
                          borderRadius: '50px',
                          borderStyle: 'solid'
                        } : {}}
                      >
                        {isMobile && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140px] h-[32px] bg-[#0f172a] rounded-b-[20px] z-50 flex items-center justify-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#1e293b]" />
                            <div className="w-10 h-1 rounded-full bg-[#1e293b]" />
                          </div>
                        )}

                        <iframe src="/flutter-demo/web/index.html" className="border-0" style={isMobile ? { width: '414px', height: '896px' } : { width: '100%', height: '100%' }} />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Mobile UI - Completely Redesigned from First Principles */}
                <div className="flex-1 md:hidden flex flex-col bg-[#f8fafc]">
                  {/* Mobile Content Area */}
                  <div className="flex-1 relative overflow-hidden">
                    {/* Mobile Code View */}
                    <div className={cn("absolute inset-0 transition-all duration-300", mobileViewTab === "code" ? "translate-x-0" : mobileViewTab === "files" ? "-translate-x-full" : "translate-x-full")}>
                      <div className="h-full flex flex-col">
                        {/* Code Editor Header */}
                        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between shrink-0">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <span className="text-xs font-medium text-white/80 truncate max-w-[160px]">{selectedFile?.path || 'lib/main.dart'}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          </div>
                        </div>
                        
                        {/* Code Content */}
                        <div className="flex-1 overflow-auto p-4 bg-[#1e1e1e]" style={{ fontFamily: "'Fira Code', monospace", fontSize: '12px', lineHeight: '1.6' }}>
                          {selectedFile && fileContent ? (
                            highlightDartCode(fileContent)
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                              <FolderOpen className="w-10 h-10 mb-2 opacity-50" />
                              <p className="text-xs">Tap files to view code</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Stats Bar */}
                        <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wide">Compression</span>
                                <span className="ml-2 text-sm font-bold text-slate-900">{COMPRESSION_RATIO}%</span>
                              </div>
                              <div className="h-4 w-px bg-slate-200" />
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wide">Lines</span>
                                <span className="ml-2 text-sm font-bold text-slate-900">{TOTAL_GENERATED_LINES.toLocaleString()}</span>
                              </div>
                            </div>
                            <button onClick={() => setMobileViewTab("files")} className="flex items-center gap-1.5 text-xs font-medium text-sky-600">
                              <FolderOpen className="w-4 h-4" />
                              Files
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile Files View - Bottom Sheet Style */}
                    <div className={cn("absolute inset-0 transition-all duration-300 bg-white", mobileViewTab === "files" ? "translate-x-0" : "translate-x-full")}>
                      <div className="h-full flex flex-col">
                        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between shrink-0">
                          <span className="text-sm font-semibold text-white">Project Files</span>
                          <button onClick={() => setMobileViewTab("code")} className="text-white/60 hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          <FileTree
                            files={FILE_STRUCTURE}
                            selectedFile={selectedFile?.path || null}
                            onFileSelect={(file) => { handleFileSelect(file); setMobileViewTab("code"); }}
                            expandedFolders={expandedFolders}
                            toggleFolder={toggleFolder}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile Preview View */}
                    <div className={cn("absolute inset-0 transition-all duration-300", mobileViewTab === "preview" ? "translate-x-0" : "translate-x-full")}>
                      <div className="h-full flex flex-col bg-gradient-to-b from-sky-100 to-sky-200">
                        {/* Device Frame */}
                        <div className="flex-1 flex items-center justify-center p-4">
                          <div 
                            className={cn(
                              "relative bg-white rounded-[40px] shadow-2xl overflow-hidden transition-all duration-500",
                              isMobile ? "w-[280px] h-[580px] border-[10px] border-slate-900" : "w-full max-w-3xl h-full max-h-[700px] border-4 border-white/50"
                            )}
                          >
                            {/* Notch */}
                            {isMobile && (
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-slate-900 rounded-b-[16px] z-50 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-slate-700" />
                              </div>
                            )}

                            <iframe src="/flutter-demo/web/index.html" className="w-full h-full border-0" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Bottom Tab Bar */}
                  <div className="bg-white border-t border-slate-200 px-2 py-2 shrink-0">
                    <div className="flex justify-around">
                      <button onClick={() => setMobileViewTab("code")} className={cn("flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all", mobileViewTab === "code" ? "text-sky-600" : "text-slate-400")}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        <span className="text-[10px] font-medium">Code</span>
                      </button>
                      <button onClick={() => setMobileViewTab("preview")} className={cn("flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all", mobileViewTab === "preview" ? "text-sky-600" : "text-slate-400")}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                        <span className="text-[10px] font-medium">Preview</span>
                      </button>
                      <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-slate-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span className="text-[10px] font-medium">Export</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}