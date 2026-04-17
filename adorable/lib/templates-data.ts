/**
 * lib/templates-data.ts
 *
 * Phase F: Curated Template Gallery
 *
 * Each template includes (per Phase F spec):
 *  - category
 *  - use-case description
 *  - architecture notes
 *  - quality score (1-10, maintained by Samaa team)
 *  - maintenance owner
 *
 * IMPORTANT: These are CURATED templates. No unvetted community uploads in first release.
 * Quality score must be ≥ 7.0 to be published.
 *
 * Template instantiation creates a full project with the exact prompt and guided
 * clarifying questions baked into the `guidedPromptParts` field.
 */

export type TemplateCategory = "social" | "productivity" | "ecommerce" | "utility" | "entertainment";
export type TemplateComplexity = "beginner" | "intermediate" | "advanced";

export type AppTemplate = {
  id: string;
  name: string;
  description: string;
  /** Use-case description for users (Phase F: required field) */
  useCase: string;
  category: TemplateCategory;
  /** Full prompt sent to the builder — write it as a complete, unambiguous spec */
  prompt: string;
  /** Structured guided clarifying questions shown before build starts (Phase F: Guided Prompt) */
  guidedPromptParts: Array<{
    question: string;
    options: string[];
    /** Which part of the prompt this customizes */
    key: string;
  }>;
  /** Built-in risk / compliance reminder (Phase F: risk prompts for auth, data privacy) */
  riskNote?: string;
  thumbnail: string;
  tags: string[];
  complexity: TemplateComplexity;
  estimatedBuildTime: string;
  /** Architecture notes for developers (Phase F: required field) */
  architectureNotes: string;
  /** Quality gate score: 1-10. Must be ≥ 7.0 to be published. (Phase F: quality score) */
  qualityScore: number;
  /** Samaa team member responsible for this template (Phase F: maintenance owner) */
  maintenanceOwner: string;
  /** Feature flag controlling this specific template (for phased rollout) */
  featureFlag?: string;
};

// ── Starter Prompt Packs (Phase F: by business intent) ────────────────────────

export type StarterPack = {
  id: string;
  label: string;
  icon: string;
  description: string;
  prompt: string;
  riskNote?: string;
};

export const STARTER_PACKS: StarterPack[] = [
  {
    id: "saas-dashboard",
    label: "SaaS Dashboard",
    icon: "📊",
    description: "Analytics, metrics, and data visualization",
    prompt: "Build a SaaS analytics dashboard with key metrics cards at the top (revenue, users, sessions), a line chart for trend data, a recent activity table, and a sidebar navigation with Dashboard, Reports, Users, and Settings.",
    riskNote: "Auth and data access controls should be reviewed before shipping.",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: "🛒",
    description: "Buy, sell, and list products or services",
    prompt: "Build a marketplace app with a home feed of listings, category filter chips, a listing detail screen with photos and seller info, and a simple messaging thread.",
    riskNote: "Payment flows and user data storage require compliance review.",
  },
  {
    id: "social-network",
    label: "Social App",
    icon: "🤝",
    description: "Feed, profiles, and social interactions",
    prompt: "Build a social app with a home feed, user profiles with follower counts, a post composer, and a notifications screen.",
    riskNote: "User-generated content requires moderation policies before launch.",
  },
  {
    id: "productivity",
    label: "Productivity Tool",
    icon: "✅",
    description: "Tasks, scheduling, and team collaboration",
    prompt: "Build a productivity app with a task board (Kanban-style), a calendar view, a team member list, and a quick-add task button.",
  },
  {
    id: "ai-tool",
    label: "AI/LLM Tool",
    icon: "🤖",
    description: "Chat, generation, and AI-powered features",
    prompt: "Build an AI chat app with a clean conversation list, a chat thread view with message bubbles and typing indicators, a settings panel for model selection, and an API key input screen.",
    riskNote: "AI outputs may need content filtering and hallucination disclaimers.",
  },
];

// ── Curated Templates ─────────────────────────────────────────────────────────

export const TEMPLATES: AppTemplate[] = [
  {
    id: "social-feed",
    name: "Social Feed App",
    description: "Instagram-style feed with stories and post cards.",
    useCase: "Social media apps where users share photos, follow others, and engage through likes and comments.",
    category: "social",
    prompt: "Build a Flutter social media app with: (1) Story circles row at the top showing user avatars and add button, (2) Scrollable feed of post cards with image, username, avatar, like/comment/share actions, and caption, (3) Bottom navigation bar with Home, Search, Camera, Reels, and Profile tabs, (4) Modern dark-then-light clean aesthetic, vibrant gradient accents.",
    guidedPromptParts: [
      {
        key: "color-theme",
        question: "What color theme should the app use?",
        options: ["Dark mode (Instagram-like)", "Light mode (clean white)", "Gradient purple/pink"],
      },
      {
        key: "content-type",
        question: "What type of content will users share?",
        options: ["Photos and videos", "Short-form text posts", "Mixed media"],
      },
    ],
    riskNote: "User-generated images require content moderation before launch.",
    thumbnail: "/templates/social-feed.png",
    tags: ["social", "feed", "stories", "photos"],
    complexity: "intermediate",
    estimatedBuildTime: "3-4 minutes",
    architectureNotes: "Single-screen tab navigator with 5 tabs. Feed uses ListView.builder for infinite scroll. Stories use a horizontal PageView. State management via StatefulWidget for prototype; migrate to Riverpod for production.",
    qualityScore: 9.1,
    maintenanceOwner: "samaa-core",
  },
  {
    id: "task-manager",
    name: "Task Manager",
    description: "To-do app with categories, priorities, and progress tracking.",
    useCase: "Personal productivity apps for managing daily tasks with priorities and deadlines.",
    category: "productivity",
    prompt: "Build a Flutter task manager app with: (1) Header card showing today's date and a progress summary (X of Y tasks done), (2) Category tabs (Work, Personal, Shopping), (3) Task list items showing title, priority dot (red/yellow/green), due date, and a checkbox, (4) FAB button to add tasks, (5) Clean white with blue accent design.",
    guidedPromptParts: [
      {
        key: "categories",
        question: "What task categories do you need?",
        options: ["Work / Personal / Shopping", "Home / Health / Finance", "Custom (3 categories of my choice)"],
      },
    ],
    thumbnail: "/templates/task-manager.png",
    tags: ["tasks", "productivity", "todos", "priorities"],
    complexity: "beginner",
    estimatedBuildTime: "2-3 minutes",
    architectureNotes: "TabBar with TabBarView for categories. Task items are CheckboxListTile widgets. Priority uses a color-coded leading icon. Local state sufficient for template; production should use SQLite or Hive.",
    qualityScore: 9.5,
    maintenanceOwner: "samaa-core",
  },
  {
    id: "commerce-store",
    name: "E-Commerce Store",
    description: "Product catalog, detail screens, cart, and checkout.",
    useCase: "Mobile shopping apps for retail brands, D2C stores, or marketplace listings.",
    category: "ecommerce",
    prompt: "Build a Flutter e-commerce app with: (1) Home screen with featured banner, category chips (Electronics, Fashion, Sports), and a 2-column product grid with images, prices, and ratings, (2) Product detail screen with image carousel, description, color/size selectors, and Add to Cart button, (3) Cart screen with items list and order summary, (4) Checkout form with address and payment fields.",
    guidedPromptParts: [
      {
        key: "industry",
        question: "What type of products will you sell?",
        options: ["Fashion and apparel", "Electronics and tech", "Food and grocery", "Home and lifestyle"],
      },
      {
        key: "checkout",
        question: "What checkout flow do you need?",
        options: ["Simple (address + payment form)", "Full checkout with order confirmation", "Minimal (add to cart only, no checkout)"],
      },
    ],
    riskNote: "Payment processing requires PCI-DSS compliance review. Never store card data client-side.",
    thumbnail: "/templates/commerce-store.png",
    tags: ["shopping", "cart", "checkout", "catalog"],
    complexity: "advanced",
    estimatedBuildTime: "4-5 minutes",
    architectureNotes: "Navigator 2.0 with named routes: /, /product/:id, /cart, /checkout. Product grid uses SliverGridDelegate. Cart state via InheritedWidget or provider; production should use Riverpod + local persistence.",
    qualityScore: 8.7,
    maintenanceOwner: "samaa-core",
  },
  {
    id: "fitness-tracker",
    name: "Fitness Tracker",
    description: "Workout logging, goal tracking, and progress charts.",
    useCase: "Health and fitness apps for tracking workouts, calories, and weekly progress.",
    category: "utility",
    prompt: "Build a Flutter fitness app with: (1) Dashboard with a greeting, today's calorie ring chart, and quick-start buttons (Log Workout, Nutrition, Progress), (2) Workout screen with a searchable exercise list grouped by muscle group, (3) Active workout screen with exercise set logging (weight × reps), (4) Progress screen with a weekly bar chart and streak counter.",
    guidedPromptParts: [
      {
        key: "focus",
        question: "What fitness goal to focus on?",
        options: ["Weight lifting (strength)", "Cardio and running", "Yoga and flexibility", "General fitness"],
      },
    ],
    thumbnail: "/templates/fitness-tracker.png",
    tags: ["fitness", "health", "workouts", "charts"],
    complexity: "intermediate",
    estimatedBuildTime: "3-4 minutes",
    architectureNotes: "Bottom navigator with 4 tabs. Charts rendered via fl_chart package. Exercise data uses a static JSON manifest for prototype. Production should integrate with HealthKit/Google Fit.",
    qualityScore: 8.4,
    maintenanceOwner: "samaa-core",
  },
  {
    id: "recipe-book",
    name: "Recipe Book",
    description: "Browse, search, and save favorite recipes.",
    useCase: "Cooking apps for personal recipe collections, meal planning, or food blogs.",
    category: "entertainment",
    prompt: "Build a Flutter recipe app with: (1) Home screen with a 'Featured Recipe' hero card and a horizontal 'Popular' scrollable list, (2) Category chips (Breakfast, Lunch, Dinner, Desserts, Vegetarian), (3) Recipe card grid with photo thumbnails, cook time, and difficulty badge, (4) Recipe detail screen with a hero image, ingredient checklist, and numbered step-by-step instructions, (5) Saved recipes screen with heart icon toggling.",
    guidedPromptParts: [
      {
        key: "cuisine",
        question: "What cuisine style should the sample recipes use?",
        options: ["International / varied", "Italian and Mediterranean", "Asian fusion", "American comfort food"],
      },
    ],
    thumbnail: "/templates/recipe-book.png",
    tags: ["recipes", "food", "cooking", "favorites"],
    complexity: "beginner",
    estimatedBuildTime: "2-3 minutes",
    architectureNotes: "Hero animations on recipe card → detail transition. Ingredients as a List<String> in a data model. Favorites stored in SharedPreferences for prototype. Category filter uses a computed getter on a static recipe list.",
    qualityScore: 9.2,
    maintenanceOwner: "samaa-core",
  },
  {
    id: "messaging-app",
    name: "Messaging App",
    description: "Conversation list with real-time-style chat UI.",
    useCase: "Chat and communication apps with direct messages and group conversations.",
    category: "social",
    prompt: "Build a Flutter messaging app with: (1) Conversations list screen showing avatars, contact name, last message preview, time, and unread count badge, (2) Chat thread screen with message bubbles (sent on right in blue, received on left in grey), timestamps, and read-receipt ticks, (3) Composer bar at bottom with text input and send button, (4) Subtle animations on new message appearance.",
    guidedPromptParts: [
      {
        key: "group-chats",
        question: "Do you need group chat support?",
        options: ["Direct messages only (simpler)", "Direct messages + group chats", "Group chats only"],
      },
    ],
    thumbnail: "/templates/messaging-app.png",
    tags: ["messaging", "chat", "conversations", "realtime"],
    complexity: "intermediate",
    estimatedBuildTime: "3-4 minutes",
    architectureNotes: "ListView.builder with reverse:true for chat thread (shows latest at bottom). Bubble widgets use BoxDecoration with BorderRadius. For production: replace sample data with socket.io or Firebase RTDB.",
    qualityScore: 8.9,
    maintenanceOwner: "samaa-core",
  },
];

// ── Quality Gate Validation (run at startup in dev) ───────────────────────────

export function assertTemplateQualityGates(): void {
  for (const template of TEMPLATES) {
    if (template.qualityScore < 7.0) {
      throw new Error(
        `Template "${template.id}" has quality score ${template.qualityScore} — must be ≥ 7.0 to be published.`
      );
    }
    if (!template.maintenanceOwner) {
      throw new Error(`Template "${template.id}" is missing a maintenanceOwner.`);
    }
    if (!template.architectureNotes) {
      throw new Error(`Template "${template.id}" is missing architectureNotes.`);
    }
    if (!template.useCase) {
      throw new Error(`Template "${template.id}" is missing useCase.`);
    }
  }
}
