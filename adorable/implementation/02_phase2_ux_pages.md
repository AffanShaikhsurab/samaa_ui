# Phase 2 — UX Pages: Templates, Settings & Profile

## Overview

These three pages complete the core user experience loop. Without them, users have no way to:
- Get started quickly (templates)
- Manage their account / API key (settings)
- See their usage and project history (profile)

All three are **blocking** for production launch — competitors like Lovable and Bolt all have these.

---

## 📁 Files To Create

```
app/
├── templates/
│   └── page.tsx          [NEW] Templates gallery
├── settings/
│   └── page.tsx          [NEW] Account settings
└── profile/
    └── page.tsx          [NEW] User profile + stats
```

Also:
- `components/templates/template-card.tsx`          [NEW]
- `lib/templates-data.ts`                            [NEW] — seed template list

---

## 🎨 Templates Gallery (`app/templates/page.tsx`)

### Data Structure

```typescript
// lib/templates-data.ts
export type AppTemplate = {
  id: string;
  name: string;
  description: string;
  category: "social" | "productivity" | "ecommerce" | "utility" | "entertainment";
  prompt: string;         // Pre-filled prompt sent to the builder
  thumbnail: string;      // Static preview image path
  tags: string[];
  complexity: "beginner" | "intermediate" | "advanced";
  estimatedBuildTime: string;  // e.g. "2-3 minutes"
};

export const TEMPLATES: AppTemplate[] = [
  {
    id: "instagram-clone",
    name: "Social Feed App",
    description: "Instagram-like feed with posts, likes, and stories",
    category: "social",
    prompt: "Build a social media app with an Instagram-like feed, story circles at the top, post cards with images and likes, a bottom navigation with Home, Search, Camera, Reels, and Profile tabs",
    thumbnail: "/templates/social-feed.png",
    tags: ["social", "feed", "stories"],
    complexity: "intermediate",
    estimatedBuildTime: "3-4 minutes",
  },
  {
    id: "todo-app",
    name: "Task Manager",
    description: "Clean to-do app with categories and priorities",
    category: "productivity",
    prompt: "Build a clean task management app with categorized to-do lists, priority levels (high/medium/low), due dates, and a completion progress bar",
    thumbnail: "/templates/todo.png",
    tags: ["productivity", "tasks"],
    complexity: "beginner",
    estimatedBuildTime: "2-3 minutes",
  },
  {
    id: "ecommerce",
    name: "E-Commerce Store",
    description: "Product listing with cart and checkout flow",
    category: "ecommerce",
    prompt: "Build an e-commerce app with a product grid, product detail page, shopping cart, and checkout form. Include a bottom nav bar and filter chips.",
    thumbnail: "/templates/ecommerce.png",
    tags: ["shopping", "cart", "payments"],
    complexity: "advanced",
    estimatedBuildTime: "4-5 minutes",
  },
  {
    id: "fitness",
    name: "Fitness Tracker",
    description: "Workout logging with progress charts",
    category: "utility",
    prompt: "Build a fitness tracking app with a workout log, exercise library, progress graphs using charts, and a daily calorie tracker",
    thumbnail: "/templates/fitness.png",
    tags: ["fitness", "health", "charts"],
    complexity: "intermediate",
    estimatedBuildTime: "3-4 minutes",
  },
  {
    id: "recipe",
    name: "Recipe App",
    description: "Browse, save, and cook recipes",
    category: "entertainment",
    prompt: "Build a recipe app with a home screen showing featured recipes, a search bar, recipe detail page with ingredients and steps, and a saved recipes section",
    thumbnail: "/templates/recipe.png",
    tags: ["food", "cooking"],
    complexity: "beginner",
    estimatedBuildTime: "2-3 minutes",
  },
  {
    id: "chat",
    name: "Messaging App",
    description: "Real-time-style chat UI with conversation list",
    category: "social",
    prompt: "Build a messaging app with a conversation list showing avatars and last messages, a chat thread view with message bubbles, and a text input with send button",
    thumbnail: "/templates/chat.png",
    tags: ["messaging", "chat", "realtime"],
    complexity: "intermediate",
    estimatedBuildTime: "3-4 minutes",
  },
];
```

### Page Implementation Pattern

```typescript
// app/templates/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/templates-data";

export default function TemplatesPage() {
  const router = useRouter();

  const handleUseTemplate = async (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    // Create session with template prompt
    const response = await fetch("/api/builder/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: template.prompt }),
    });

    const { session } = await response.json();
    if (session?.id) {
      router.push(`/flutter/workspace/${session.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="px-6 py-10 md:px-10 max-w-6xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Templates</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Start with a template
        </h1>
        <p className="mt-2 text-slate-500">
          Pre-built prompts for common app types. Customize after generation.
        </p>
      </header>

      {/* Category Filter Tabs */}
      {/* Template Grid — 3 columns on desktop, 2 on tablet, 1 on mobile */}
      {/* Template Card: thumbnail + name + description + tags + "Use Template" button */}
    </div>
  );
}
```

### Template Card Design Requirements

Following Lovable-style card design:
- **Thumbnail**: 16:9 aspect ratio screenshot or generated preview (use `generate_image` tool if static)
- **Name + Badge**: Category badge (color-coded by type)
- **Description**: 1-2 lines
- **Tags**: Pill chips
- **Complexity dot**: Green (beginner), Yellow (intermediate), Red (advanced)
- **Estimated time**: Small text
- **CTA button**: "Use Template →" — triggers session creation + redirect

### Route Protection

Add to `middleware.ts`:
```typescript
const isProtectedAppRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/flutter/workspace(.*)",
  "/templates(.*)",  // ADD THIS
  "/settings(.*)",   // ADD THIS
  "/profile(.*)",    // ADD THIS
]);
```

---

## ⚙️ Settings Page (`app/settings/page.tsx`)

### Sections to Implement

1. **API Keys** — move the existing `ApiKeySettingsDialog` content here
2. **LLM Provider** — radio group to select OpenAI / Anthropic / Groq / NVIDIA
3. **Personal Info** — read from Clerk (display only, link to Clerk account for edit)
4. **Danger Zone** — Delete account / Delete all projects

### Data Flow

Currently API keys are stored in `localStorage` (see `components/api-key-gate.tsx`). For the settings page:

```typescript
// Settings page reads/writes the same localStorage keys
const STORAGE_KEYS = {
  openai: "samaa:api-key:openai",
  anthropic: "samaa:api-key:anthropic",
  groq: "samaa:api-key:groq",
  nvidia: "samaa:api-key:nvidia",
  provider: "samaa:llm-provider",
};
```

### LLM Provider Component

```typescript
type Provider = "openai" | "anthropic" | "groq" | "nvidia";

const PROVIDER_INFO: Record<Provider, { label: string; model: string; docUrl: string }> = {
  openai:    { label: "OpenAI",   model: "gpt-5.2-codex",               docUrl: "https://platform.openai.com" },
  anthropic: { label: "Anthropic", model: "claude-sonnet-4-20250514",   docUrl: "https://console.anthropic.com" },
  groq:      { label: "Groq",     model: "llama-3.3-70b-versatile",     docUrl: "https://console.groq.com" },
  nvidia:    { label: "NVIDIA",   model: "meta/llama-3.3-70b-instruct", docUrl: "https://build.nvidia.com" },
};
```

### Saving to Convex (Phase 2 addition)

After Phase 1 Convex migration, settings should also sync to Convex's `users` table:

```typescript
// In settings page save handler
await convex.mutation(api.users.updateSettings, {
  preferredProvider: selectedProvider,
});
```

---

## 👤 Profile Page (`app/profile/page.tsx`)

### Sections

1. **User Card** — Avatar (from Clerk), name, email, plan badge
2. **Usage Stats** — # projects created, # builds run, preferred LLM
3. **Recent Projects** — 3-card preview with link to dashboard
4. **Plan Info** — Current plan (Free / Pro), upgrade CTA

### User Data Sources

```typescript
// From Clerk (client-side)
import { useUser } from "@clerk/nextjs";
const { user } = useUser();
// → user.imageUrl, user.fullName, user.primaryEmailAddress

// From Convex (database)
import { useQuery } from "convex/react";
const userRecord = useQuery(api.users.getCurrentUser);
// → userRecord.plan, userRecord.creditsUsed

// Project stats from Convex
const projects = useQuery(api.projects.listByUser);
// → projects.length, filter by status, etc.
```

### Profile Stats Card

```typescript
const stats = {
  totalProjects: projects?.length ?? 0,
  completedBuilds: projects?.filter(p => p.status === "complete").length ?? 0,
  failedBuilds: projects?.filter(p => p.status === "failed").length ?? 0,
  runningNow: projects?.filter(p => p.status === "running").length ?? 0,
};
```

---

## 🧭 Navigation Updates

Add these pages to the main nav. Currently `app/flutter/page.tsx` has:

```tsx
<nav>
  <div className="logo">samaa</div>
  <div className="nav-links">
    <a href="#">Pricing</a>        ← Replace with /templates
    <a href="#">Showcase</a>       ← Keep or change to /dashboard
    <a href="#">Download App</a>   ← Change to profile icon + settings
  </div>
</nav>
```

**Updated nav links:**

```tsx
<nav>
  <Link href="/">samaa</Link>
  <div className="nav-links">
    <Link href="/templates">Templates</Link>
    <Link href="/dashboard">My Projects</Link>
    <UserButton afterSignOutUrl="/" />  {/* Clerk built-in button with avatar */}
  </div>
</nav>
```

The `UserButton` from `@clerk/nextjs` provides the avatar, dropdown with Settings/Profile/Sign-out — reducing custom code needed.

---

## ✅ Verification Checklist

### Templates Page
- [ ] All 6 template cards render with thumbnail, name, tags
- [ ] Category filter tabs work (show/hide by category)
- [ ] "Use Template" creates a session and redirects to workspace
- [ ] Workspace pre-fills with the template's prompt
- [ ] Build starts automatically (same as landing page flow)
- [ ] Page is protected (requires auth) and redirects to Clerk sign-in

### Settings Page
- [ ] API key forms pre-fill from localStorage
- [ ] Saving API key updates localStorage AND sends a `POST /api/api-key`
- [ ] Provider selection persists across page refresh
- [ ] "Test Connection" button validates the key and shows success/error
- [ ] Danger zone delete works

### Profile Page
- [ ] User avatar and name from Clerk
- [ ] Stats show correct project counts
- [ ] Recent projects link to correct workspace URLs
- [ ] Plan badge matches Convex `users.plan`

---

## 📚 References

- [Clerk UserButton Component](https://clerk.com/docs/components/user/user-button)
- [Clerk useUser Hook](https://clerk.com/docs/references/react/use-user)
- [Next.js Link Component](https://nextjs.org/docs/app/api-reference/components/link)
- [Convex useQuery](https://docs.convex.dev/client/react)
