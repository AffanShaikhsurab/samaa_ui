"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SkyBackground } from "@/components/sky-background";
import {
  Loader2,
  FileCode2,
  Sparkles,
  CheckCircle2,
  Play,
  Monitor,
  Smartphone,
  ArrowLeft,
  Zap,
} from "lucide-react";
import "../flutter/landing.css";

const DEMO_ANCL_CODE = `#n:InstaLite,d
 
 M:Story{ 
   id:int, 
   label:str, 
   viewed:bool=false 
 } 
 
 M:Post{ 
   id:int, 
   author:str, 
   handle:str, 
   caption:str, 
   mediaLabel:str, 
   liked:bool=false, 
   saved:bool=false 
 } 
 
 M:ExploreItem{ 
   id:int, 
   title:str, 
   subtitle:str 
 } 
 
 M:Comment{ 
   id:int, 
   postId:int, 
   author:str, 
   body:str 
 } 
 
 N:InstaBloc{ 
   activeTab:String="home", 
   shellTab:String="home", 
   stories:List<Story>=[], 
   selectedStoryIndex:int=0, 
   posts:List<Post>=[], 
   exploreItems:List<ExploreItem>=[], 
   searchQuery:String="", 
   searchResults:List<ExploreItem>=[], 
   recentSearches:List<String>=[], 
   selectedStoryLabel:String="Story", 
   selectedPostId:int=0, 
   comments:List<Comment>=[], 
   visibleComments:List<Comment>=[], 
   commentDraft:String="", 
   selectedMediaLabel:String="No media selected yet", 
   draftCaption:String="", 
   publishStatus:String="", 
   isPublishing:bool=false, 
   profileAvatarText:String="AV", 
   profileTitle:String="@ari.vega", 
   profileSubtitle:String="Art direction, campaigns, and motion-led product stories", 
   isFollowingProfile:bool=false, 
   profilePosts:int=42, 
   followers:int=12800, 
   following:int=318 
 
   init() { 
     stories = [Story(id:1, label:"You"), Story(id:2, label:"Mia"), Story(id:3, label:"Noah"), Story(id:4, label:"Ari"), Story(id:5, label:"Zoe", viewed:true)]; 
     posts = [Post(id:1, author:"Mia Chen", handle:"@mia.design", caption:"Golden hour, strong contrast.", mediaLabel:"Studio shoot"), Post(id:2, author:"Noah Patel", handle:"@noah.codes", caption:"Building social surfaces.", mediaLabel:"Launch board", liked:true), Post(id:3, author:"Luna Rivera", handle:"@luna.motion", caption:"Motion studies.", mediaLabel:"Color study", saved:true)]; 
     exploreItems = [ExploreItem(id:1, title:"Design systems", subtitle:"Reusable social surfaces"), ExploreItem(id:2, title:"Creator motion", subtitle:"Short-form storytelling"), ExploreItem(id:3, title:"Product launch", subtitle:"Campaign assets"), ExploreItem(id:4, title:"Editorial portrait", subtitle:"Photography direction"), ExploreItem(id:5, title:"Brand motion", subtitle:"Story-first loops"), ExploreItem(id:6, title:"UI moodboard", subtitle:"Dark surfaces")]; 
     searchResults = exploreItems; 
     comments = [Comment(id:1, postId:1, author:"Noah", body:"Polished."), Comment(id:2, postId:1, author:"Ari", body:"Love this."), Comment(id:3, postId:2, author:"Mia", body:"ANCL primitives.") ]; 
   } 
 
   SetPrimaryTab(tab:String) { activeTab = tab; shellTab = tab; } 
   CloseOverlay() { activeTab = shellTab; } 
   OpenStory(label:String) { selectedStoryLabel = label; selectedStoryIndex = stories.indexWhere((s) => s.label == label); activeTab = "story"; } 
   NextStory() { if (selectedStoryIndex < stories.length - 1) { selectedStoryIndex++; selectedStoryLabel = stories[selectedStoryIndex].label; } else { CloseOverlay(); } } 
   OpenComments(postId:int) { selectedPostId = postId; activeTab = "comments"; } 
   ToggleLike(postId:int) { posts = posts.map((p) => p.id == postId ? Post(id:p.id, author:p.author, handle:p.handle, caption:p.caption, mediaLabel:p.mediaLabel, liked:!p.liked, saved:p.saved) : p).toList(); } 
   ToggleSave(postId:int) { posts = posts.map((p) => p.id == postId ? Post(id:p.id, author:p.author, handle:p.handle, caption:p.caption, mediaLabel:p.mediaLabel, liked:p.liked, saved:!p.saved) : p).toList(); } 
   ToggleProfileFollow() { isFollowingProfile = !isFollowingProfile; followers = isFollowingProfile ? followers + 1 : followers - 1; } 
 
   get activeTabIndex(): shellTab == "home" ? 0 : shellTab == "search" ? 1 : shellTab == "create" ? 2 : shellTab == "profile" ? 3 : 0; 
 } 
 
 S(MainRoute)B[switch(InstaBloc.state.activeTab) { case "story": D{const StoryView()} case "comments": D{const CommentsView()} default: D{const ShellView()} }] 
 
 S(ShellView)B[C[Exp[IStack($InstaBloc.state.activeTabIndex)[D{const HomeView()}, D{const SearchView()}, D{const CreateView()}, D{const ProfileView()}]], BottomTabShell(activeTab:$InstaBloc.state.shellTab, onHome:InstaBloc.SetPrimaryTab("home"), onSearch:InstaBloc.SetPrimaryTab("search"), onCreate:InstaBloc.SetPrimaryTab("create"), onProfile:InstaBloc.SetPrimaryTab("profile"))]] 
 
 S(HomeView)B[L[Ctr(p:16)[R(main:spaceBetween, cross:center)[T(Instagram, c:white, size:28, fw:800), R(gap:8)[ActionPill(label:"Create", onTap:InstaBloc.SetPrimaryTab("create")), ActionPill(label:"Profile", onTap:InstaBloc.SetPrimaryTab("profile"))]]], Ctr(p:0x16x8x16)[StoryTray(stories:$InstaBloc.state.stories, onStoryTap:InstaBloc.OpenStory)], Spc(h:8), for($InstaBloc.state.posts as $post)[Ctr(p:0x16x16x16)[PostCard(author:$post.author, handle:$post.handle, caption:$post.caption, liked:$post.liked, saved:$post.saved, onLike:InstaBloc.ToggleLike($post.id), onComment:InstaBloc.OpenComments($post.id), onSave:InstaBloc.ToggleSave($post.id))]]]] 
 
 S(SearchView)B[L[Ctr(p:16)[SearchSurface(title:"Explore", queryText:$InstaBloc.state.searchQuery, onQueryChanged:InstaBloc.SetSearchQuery)], Ctr(p:0x16x12x16)[ExploreGrid(items:$InstaBloc.state.searchResults)]]] 
 
 S(CreateView)B[L[Ctr(p:16)[MediaComposer(title:"New post", selectedLabel:$InstaBloc.state.selectedMediaLabel, draftCaption:$InstaBloc.state.draftCaption, captionPlaceholder:"Write a caption", onCaptionChanged:InstaBloc.UpdateDraftCaption)]]] 
 
 S(ProfileView)B[L[Ctr(p:16)[ProfileHeader(avatarText:$InstaBloc.state.profileAvatarText, title:$InstaBloc.state.profileTitle, subtitle:$InstaBloc.state.profileSubtitle, posts:$InstaBloc.state.profilePosts, followers:$InstaBloc.state.followers, following:$InstaBloc.state.following)], Ctr(p:0x16x0x16)[ProfileActionBar(primaryLabel:{$InstaBloc.state.isFollowingProfile ? "Following" : "Follow"}, onPrimary:InstaBloc.ToggleProfileFollow)]]] 
 
 S(StoryView)B[C[Exp[Ctr(p:0)[StoryViewer(title:$InstaBloc.state.selectedStoryLabel, onPrimary:InstaBloc.CloseOverlay, onSecondary:InstaBloc.NextStory)]]]] 
 
 S(CommentsView)B[L[Ctr(p:16)[SectionHeader(title:"Comments")], for($InstaBloc.state.visibleComments as $comment)[Ctr(p:0x16x12x16)[CommentRow(author:$comment.author, body:$comment.body)]]]]`;

const BUILD_STEPS = [
  { label: "Creating sandbox", duration: 1200 },
  { label: "Installing dependencies", duration: 1800 },
  { label: "Compiling ANCL", duration: 2200 },
  { label: "Building Flutter app", duration: 2800 },
  { label: "Optimizing assets", duration: 1000 },
  { label: "Deploying preview", duration: 1500 },
];

type Viewport = "desktop" | "mobile";

function FlutterPreview({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";
  const containerWidth = isMobile ? "w-[375px]" : "w-full max-w-[1280px]";
  const containerHeight = isMobile ? "h-[700px]" : "h-[800px]";

  return (
    <div className={cn("bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-2xl transition-all duration-500", containerWidth, containerHeight)}>
      <iframe
        src="/flutter-demo/web/index.html"
        className="w-full h-full border-0"
        title="Flutter App Preview"
        allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write"
      />
    </div>
  );
}

function InstagramPreview({ viewport }: { viewport: Viewport }) {
  const [activeTab, setActiveTab] = useState("home");
  const [stories, setStories] = useState([
    { id: 1, label: "You", viewed: false },
    { id: 2, label: "Mia", viewed: false },
    { id: 3, label: "Noah", viewed: false },
    { id: 4, label: "Ari", viewed: false },
    { id: 5, label: "Zoe", viewed: true },
  ]);
  const [posts, setPosts] = useState([
    { id: 1, author: "Mia Chen", handle: "@mia.design", caption: "Golden hour, strong contrast.", mediaLabel: "Studio shoot", liked: false, saved: false },
    { id: 2, author: "Noah Patel", handle: "@noah.codes", caption: "Building social surfaces.", mediaLabel: "Launch board", liked: true, saved: false },
    { id: 3, author: "Luna Rivera", handle: "@luna.motion", caption: "Motion studies.", mediaLabel: "Color study", liked: false, saved: true },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStory, setShowStory] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const toggleLike = (postId: number) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, liked: !p.liked } : p));
  };

  const toggleSave = (postId: number) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, saved: !p.saved } : p));
  };

  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setStories(stories.map((s, i) => i === currentStoryIndex + 1 ? { ...s, viewed: true } : s));
    } else {
      setShowStory(false);
    }
  };

  const exploreItems = [
    { id: 1, title: "Design systems", subtitle: "Reusable surfaces" },
    { id: 2, title: "Creator motion", subtitle: "Short-form" },
    { id: 3, title: "Product launch", subtitle: "Campaign assets" },
    { id: 4, title: "Editorial portrait", subtitle: "Photography" },
    { id: 5, title: "Brand motion", subtitle: "Story-first loops" },
    { id: 6, title: "UI moodboard", subtitle: "Dark surfaces" },
  ];

  const filteredItems = searchQuery
    ? exploreItems.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : exploreItems;

  const isMobile = viewport === "mobile";
  const containerWidth = isMobile ? "w-full max-w-[375px]" : "w-full max-w-[1280px]";
  const containerHeight = isMobile ? "h-[700px]" : "h-[800px]";

  return (
    <div className={cn("bg-gradient-to-b from-slate-900 via-slate-800 to-black rounded-[32px] overflow-hidden border border-white/10 shadow-2xl transition-all duration-500", containerWidth, containerHeight)}>
      {showStory ? (
        <div className="h-full bg-black flex flex-col">
          <div className="flex items-center gap-3 p-4 bg-black/80 backdrop-blur-xl border-b border-white/5">
            <button onClick={() => setShowStory(false)} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
              {stories[currentStoryIndex].label[0]}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{stories[currentStoryIndex].label}</p>
              <p className="text-white/50 text-xs">{stories[currentStoryIndex].label === "You" ? "Your story" : `${stories[currentStoryIndex].label}'s story`}</p>
            </div>
          </div>
          <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative cursor-pointer" onClick={nextStory}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="text-center z-10">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-500 mx-auto mb-4 flex items-center justify-center text-white/30">
                <span className="text-6xl font-bold opacity-50">{stories[currentStoryIndex].label[0]}</span>
              </div>
              <p className="text-white/50 text-sm">{stories[currentStoryIndex].label}'s story</p>
            </div>
            <button className="absolute right-6 bottom-6 px-6 py-3 bg-white text-black font-semibold rounded-full" onClick={(e) => { e.stopPropagation(); nextStory(); }}>
              {currentStoryIndex < stories.length - 1 ? "Next" : "Close"}
            </button>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col bg-black">
          {activeTab === "home" && (
            <>
              <header className="flex items-center justify-between p-4 bg-black/90 backdrop-blur-xl border-b border-white/5">
                <h1 className="text-white font-bold text-xl tracking-tight">Instagram</h1>
                <div className="flex gap-3">
                  <button onClick={() => setActiveTab("create")} className="text-white/70 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <button onClick={() => setActiveTab("profile")} className="text-white/70 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </button>
                </div>
              </header>
              <div className="flex gap-4 p-4 overflow-x-auto border-b border-white/5 bg-black/50 no-scrollbar">
                {stories.map((story, i) => (
                  <div key={story.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer" onClick={() => { setCurrentStoryIndex(i); setShowStory(true); }}>
                    <div className={cn("w-14 h-14 rounded-full p-[3px]", story.viewed ? "bg-slate-600" : "bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-500")}>
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">{story.label[0]}</span>
                      </div>
                    </div>
                    <span className="text-white/70 text-xs">{story.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {posts.map(post => (
                  <div key={post.id} className="border-b border-white/5">
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                        {post.author[0]}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{post.handle}</p>
                        <p className="text-white/50 text-xs">{post.author}</p>
                      </div>
                    </div>
                    <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                      <span className="text-white/20 text-sm font-medium">{post.mediaLabel}</span>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-4 mb-3">
                        <button onClick={() => toggleLike(post.id)} className={cn("transition-colors", post.liked ? "text-red-500" : "text-white/70 hover:text-white")}>
                          <svg className="w-6 h-6" fill={post.liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        </button>
                        <button className="text-white/70 hover:text-white">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </button>
                        <button className="text-white/70 hover:text-white">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                        <button onClick={() => toggleSave(post.id)} className={cn("ml-auto transition-colors", post.saved ? "text-yellow-500" : "text-white/70 hover:text-white")}>
                          <svg className="w-6 h-6" fill={post.saved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        </button>
                      </div>
                      <p className="text-white text-sm font-semibold mb-1">{post.author}</p>
                      <p className="text-white/70 text-sm">{post.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {activeTab === "search" && (
            <>
              <header className="p-4 bg-black/90 backdrop-blur-xl border-b border-white/5">
                <h1 className="text-white font-bold text-xl mb-3">Explore</h1>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search creators, posts, or ideas"
                  className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-white/20"
                />
              </header>
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                  {filteredItems.map(item => (
                    <div key={item.id} className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 flex flex-col justify-end border border-white/5 hover:border-white/20 transition-colors cursor-pointer">
                      <div className="bg-gradient-to-br from-pink-500 to-purple-600 w-10 h-10 rounded-lg mb-2 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-white font-semibold text-sm">{item.title}</p>
                      <p className="text-white/50 text-xs">{item.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {activeTab === "create" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black">
              <div className="w-full max-w-sm">
                <h1 className="text-white font-bold text-2xl mb-2 text-center">New post</h1>
                <p className="text-white/50 text-sm text-center mb-8">Draft and publish from one flow</p>
                <div className="border-2 border-dashed border-white/20 rounded-[24px] p-12 flex flex-col items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-white/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  <p className="text-white/50 text-sm font-medium">Select media</p>
                </div>
                <button className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl">
                  Publish draft
                </button>
              </div>
            </div>
          )}
          {activeTab === "profile" && (
            <>
              <header className="p-6 bg-black/90 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                    AV
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white font-bold text-lg">@ari.vega</h2>
                    <p className="text-white/50 text-sm">Art direction, campaigns</p>
                  </div>
                </div>
                <div className="flex justify-around mt-6">
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">42</p>
                    <p className="text-white/50 text-xs">posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">12.8K</p>
                    <p className="text-white/50 text-xs">followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg">318</p>
                    <p className="text-white/50 text-xs">following</p>
                  </div>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                <div className="grid grid-cols-3 gap-1">
                  {posts.map(post => (
                    <div key={post.id} className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-white/5">
                      <span className="text-white/20 text-xs">{post.mediaLabel.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <nav className="flex justify-around py-3 bg-black/90 border-t border-white/5">
            {[
              { key: "home", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
              { key: "search", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> },
              { key: "create", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /> },
              { key: "profile", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={cn("p-2 transition-colors", activeTab === item.key ? "text-white" : "text-white/40")}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

export default function DemoPage() {
  const [stage, setStage] = useState<"input" | "ancl" | "building" | "preview">("input");
  const [inputValue, setInputValue] = useState("");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [currentBuildStep, setCurrentBuildStep] = useState(0);
  const [codeLines, setCodeLines] = useState<string[]>([]);
  const [codeComplete, setCodeComplete] = useState(false);
  const codeContainerRef = useRef<HTMLDivElement>(null);

  const handleStartDemo = () => {
    if (!inputValue.trim()) return;
    setStage("ancl");
  };

  useEffect(() => {
    if (stage !== "ancl") return;

    const fullCode = DEMO_ANCL_CODE;
    let lineIndex = 0;
    const lines = fullCode.split("\n");

    const interval = setInterval(() => {
      if (lineIndex < lines.length) {
        setCodeLines(lines.slice(0, lineIndex + 1));
        lineIndex++;
        if (codeContainerRef.current) {
          codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
        }
      } else {
        setCodeComplete(true);
        clearInterval(interval);
        setTimeout(() => setStage("building"), 1500);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    if (stage !== "building") return;

    let stepIndex = 0;
    const totalDuration = BUILD_STEPS.reduce((acc, step) => acc + step.duration, 0);
    const stepDuration = totalDuration / BUILD_STEPS.length;

    const interval = setInterval(() => {
      if (stepIndex < BUILD_STEPS.length) {
        setCurrentBuildStep(stepIndex);
        stepIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => setStage("preview"), 500);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [stage]);

  return (
    <div className="sama-landing-page no-scrollbar">
      <SkyBackground variant="landing" />

      <div className="cloud-burst-overlay" />

      <div className="content w-full flex flex-col items-center">
        <nav className={cn(
          "w-full max-w-[1400px] flex justify-between items-center px-6 md:px-12 py-6 z-50 transition-opacity duration-300",
          stage !== "input" ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          <div className="logo text-2xl font-extrabold tracking-tighter">samaa</div>
          <div className="nav-links flex gap-6">
            <a href="/flutter" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">Back to Builder</a>
          </div>
        </nav>

        <AnimatePresence mode="wait">
          {stage === "input" && (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="hero flex flex-col items-center w-full max-w-[800px] px-6 text-center"
            >
              <div className="mb-12 unblur-reveal">
                <h1 className="text-5xl md:text-8xl font-bold tracking-tight text-slate-900 mb-8 leading-[0.9] font-display">From Idea to App</h1>
                <p className="subtitle text-xl md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto">Watch ANCL transform natural language into production-ready Flutter applications</p>
              </div>

              <div className="workbench w-full glass-card p-8 flex flex-col gap-6 unblur-reveal [animation-delay:200ms]">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Sama to build a custom Instagram like clone..."
                  className="input-area w-full bg-transparent border-none outline-none text-lg md:text-xl text-slate-900 resize-none min-h-[120px] font-medium placeholder:text-slate-400 leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleStartDemo();
                    }
                  }}
                />
                <div className="footer flex justify-between items-center pt-4 border-t border-black/5">
                  <div className="kb-hint text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    PRESS <span className="kb-key bg-black/5 px-1.5 py-0.5 rounded text-[10px]">ENTER</span> TO SUBMIT
                  </div>
                  <button
                    onClick={handleStartDemo}
                    disabled={!inputValue.trim()}
                    className={cn(
                      "btn-build bg-sky-600 text-white px-10 py-4 rounded-full font-bold text-sm transition-all shadow-xl hover:bg-sky-700 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none",
                    )}
                  >
                    Generate App &rarr;
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {stage === "ancl" && (
            <motion.div
              key="ancl"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-[1200px] px-6 md:mt-12 flex flex-col gap-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Code Editor Area */}
                <div className="lg:col-span-3 glass-card overflow-hidden flex flex-col unblur-reveal">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white/40">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                      <div className="w-3 h-3 rounded-full bg-green-400/80" />
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                      <FileCode2 className="w-3.5 h-3.5" />
                      insta_lite.ancl
                      <span className="text-sky-500 ml-2">{Math.round((codeLines.length / DEMO_ANCL_CODE.split("\n").length) * 100)}%</span>
                    </div>
                  </div>
                  <div ref={codeContainerRef} className="h-[500px] overflow-y-auto p-8 font-mono text-[13px] bg-slate-50/30 no-scrollbar">
                    <pre className="text-slate-700 whitespace-pre-wrap">
                      {codeLines.map((line, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.1 }}
                          className={cn(
                            "leading-[1.8]",
                            line.startsWith("#") ? "text-purple-500 font-bold" :
                            line.startsWith("M:") ? "text-sky-600 font-bold" :
                            line.startsWith("N:") ? "text-amber-600 font-bold" :
                            line.startsWith("S(") ? "text-pink-600 font-bold" :
                            line.trim() === "}" || line.trim() === "]," || line.trim() === "])" ? "text-slate-400" :
                            "text-slate-600"
                          )}
                        >
                          {line || " "}
                        </motion.div>
                      ))}
                      {!codeComplete && (
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.5 }}
                          className="text-sky-500 font-bold"
                        >
                          ▋
                        </motion.span>
                      )}
                    </pre>
                  </div>
                </div>

                {/* Status Sidebar Area */}
                <div className="lg:col-span-2 flex flex-col gap-6 unblur-reveal [animation-delay:150ms]">
                  <div className="glass-card p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shadow-sm">
                        <Sparkles className="w-6 h-6 text-sky-600" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 font-bold text-lg">ANCL Parser</h3>
                        <p className="text-slate-500 text-xs font-medium">Transforming design language</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">Model Definitions</p>
                          <p className="text-[11px] text-slate-500 font-medium">Parsed 4 core entities</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-500",
                          codeLines.length > 15 ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                        )}>
                          {codeLines.length > 15 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        </div>
                        <div className="flex-1">
                          <p className={cn("text-sm font-bold transition-colors", codeLines.length > 15 ? "text-slate-800" : "text-slate-400")}>Bloc Controller</p>
                          <p className={cn("text-[11px] font-medium transition-colors", codeLines.length > 15 ? "text-slate-500" : "text-slate-300")}>Extracted state management</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-500",
                          codeComplete ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                        )}>
                          {codeComplete ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        </div>
                        <div className="flex-1">
                          <p className={cn("text-sm font-bold transition-colors", codeComplete ? "text-slate-800" : "text-slate-400")}>Screen Definitions</p>
                          <p className={cn("text-[11px] font-medium transition-colors", codeComplete ? "text-slate-500" : "text-slate-300")}>Generated 8 UI components</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-sky-50/80 backdrop-blur-[20px] border border-sky-100/50 rounded-[32px] p-8 flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <Zap className="w-5 h-5 text-sky-600" />
                      <span className="text-slate-900 font-bold uppercase tracking-wider text-[11px]">System Status</span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">
                      ANCL is a high-level design language that abstracts away complex Flutter code into readable primitives. We're currently mapping your natural language prompt to a structured ANCL blueprint.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stage === "building" && (
            <motion.div
              key="building"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-[600px] px-6 md:mt-24"
            >
              <div className="bg-white/65 backdrop-blur-[30px] border border-white/80 rounded-[40px] overflow-hidden shadow-2xl">
                <div className="p-12 text-center border-b border-black/5 bg-white/20">
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-sky-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Compiling Blueprint</h2>
                  <p className="text-slate-500 font-medium">Assembling production-ready Flutter code...</p>
                </div>
                
                <div className="p-10 space-y-6">
                  {BUILD_STEPS.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-5">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border",
                        i < currentBuildStep ? "bg-emerald-50 border-emerald-100" :
                        i === currentBuildStep ? "bg-sky-50 border-sky-100" :
                        "bg-slate-50 border-slate-100"
                      )}>
                        {i < currentBuildStep ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : i === currentBuildStep ? (
                          <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className={cn(
                          "text-sm font-bold transition-colors",
                          i < currentBuildStep ? "text-emerald-600" :
                          i === currentBuildStep ? "text-slate-900" :
                          "text-slate-400"
                        )}>
                          {step.label}
                        </span>
                        {i === currentBuildStep && (
                          <p className="text-[10px] text-sky-500 font-bold uppercase tracking-widest mt-0.5">In Progress</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {stage === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[1400px] px-6 md:mt-8 space-y-8 flex flex-col items-center"
            >
              {/* Preview Header */}
              <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Build Complete!</h2>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">App is live on Samaa Cloud</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-white/65 backdrop-blur-[20px] border border-white/80 rounded-full p-1.5 shadow-sm">
                  <button
                    onClick={() => setViewport("desktop")}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all",
                      viewport === "desktop" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <Monitor className="w-4 h-4" />
                    Desktop
                  </button>
                  <button
                    onClick={() => setViewport("mobile")}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all",
                      viewport === "mobile" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <Smartphone className="w-4 h-4" />
                    Mobile
                  </button>
                </div>
              </div>

              {/* Preview Area */}
              <div className="w-full flex justify-center py-4">
                <FlutterPreview viewport={viewport} />
              </div>

              {/* Action Footer */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full pt-8 border-t border-black/5">
                <button
                  onClick={() => window.open("https://github.com", "_blank")}
                  className="flex items-center gap-3 px-8 py-4 bg-white/65 backdrop-blur-[20px] border border-white/80 text-slate-700 rounded-full font-bold hover:bg-white transition-all shadow-sm hover:shadow-md active:scale-[0.98] w-full md:w-auto justify-center"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                  Source Files
                </button>
                <button 
                  onClick={() => window.open("/flutter", "_self")}
                  className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] w-full md:w-auto justify-center"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Launch Workspace
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}