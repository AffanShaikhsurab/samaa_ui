This is an [assistant-ui](https://github.com/Yonom/assistant-ui) project with provider-agnostic backend routing and repo-backed conversation persistence.

## Getting Started

### 1. Configure Environment Variables

Create a `.env.local` file in the root directory and add your credentials:

```
# Default provider: OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key

# Optional: Claude provider support (swap provider without touching UI code)
# LLM_PROVIDER=claude
# ANTHROPIC_API_KEY=your-anthropic-api-key
```

> **Note**: You can copy `.env.example` to `.env.local` and fill in your values.

### 1.1 Clerk + Convex Auth (required)

To enable Clerk-based authentication with Convex:

1. Create a Clerk app and enable the Convex integration in Clerk.
2. Set these environment variables in `.env.local`:

```
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-domain.clerk.accounts.dev
```

3. Sync Convex auth config:

```bash
npx convex dev
```

The app fails to start when `NEXT_PUBLIC_CONVEX_URL` or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is missing. This ensures Clerk + Convex auth is always wired correctly.

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 4. (Optional) Set Up GitHub Sync

To enable creating projects from existing GitHub repositories:

1. Follow the [GitHub App Setup Guide](../GITHUB_APP_SETUP.md)
2. Create a GitHub App through the [Freestyle Dashboard](https://dash.freestyle.sh/)
3. Install the GitHub App on your GitHub repositories
4. Use the "From GitHub" option when creating new projects

See [GITHUB_APP_SETUP.md](../GITHUB_APP_SETUP.md) for detailed instructions.

## Development

You can start customizing the UI by modifying components in the `components/assistant-ui/` directory.

### Key Files

- `app/assistant.tsx` - Renders the chat interface and sets up the assistant runtime
- `app/api/chat/route.ts` - Chat API endpoint
- `lib/llm-provider.ts` - Provider wrapper (OpenAI + Claude)
- `components/assistant-ui/thread.tsx` - Chat thread component
- `components/app-sidebar.tsx` - Sidebar with thread list
