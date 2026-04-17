# Blink.new Application Architecture & Feature Document

This document outlines the core screens, features, functionality, and external services powering the **Blink.new** platform (a Next.js full-stack app for AI-powered app creation).

---

## 1. Core Screens & Workflows

### 1.1 Project Interface (The "Vibe Coding" Agent UI)
**Path:** `/project/[id]`
**Purpose:** The central feature of Blink; a multi-pane interface where users chat with an AI agent to build software.
- **Key Features:**
  - **Chat Panel:** Real-time chat interface with AI coding agents. Uses streaming to show generative steps and thought processes.
  - **Preview & Code Tools:** Real-time web preview of the generated Next.js/Hono app.
  - **Hosting Panel:** Allows developers to deploy backends seamlessly (via CF Workers for Platforms) and manage domain routing.
  - **GitHub Sync:** Syncs the generated code to external GitHub repositories.
  - **Collaborator Access:** Private and public visibility modes, role-based access for team members.
- **Connections:** Links directly back to the workspace dashboard. Direct hooks into Connectors (OAuth).
- **External Services Used:** 
  - **AI SDK v6 (Vercel):** Interfaces with Anthropic/OpenAI for text and object generation.
  - **Cloudflare Workers for Platforms:** Hosts tenant-isolated secure backends.
  - **Electric SQL:** Streams live Postgres DB updates to the UI securely.

### 1.2 Workspace Dashboard
**Path:** `/[workspace]`
**Purpose:** The main entry point for logged-in users to view and manage their projects.
- **Key Features:**
  - **Projects List:** Lists all "Recent" and "Starred" projects.
  - **App Scaffolding:** Interface for starting a new chat/project template.
  - **Workspace Context:** Shows the active tier (Free, Starter, Pro, Team) and credit usage.
- **Connections:** Navigates to the Project Interface and Settings.

### 1.3 Settings & Administration
**Path:** `/settings`
**Purpose:** Consolidated hub managing both Workspace and User Account configurations.
- **Workspace Tabs:**
  - **General & Members:** Invite users, assign roles (Owner, Admin, Member, Viewer).
  - **Usage & Billing:** Tracks AI execution credits and manages Stripe subscriptions.
  - **Domains:** Custom domain mapping and DNS validation for projects.
  - **AI Calling (Feature Flag):** Integrates phone numbers for AI voice functionality.
  - **Connectors:** OAuth-based integrations for 30+ 3rd party services (Notion, GitHub, Reddit, etc.).
  - **API Keys:** Manage workspace keys to interact with the Blink AI Gateway.
- **Account Tabs:**
  - **Profile & Preferences:** Theme settings and user details.
  - **Referrals:** Promo system generating credits.
  - **Tokens & Data:** Manage Personal Access Tokens (PATs) and perform data exports.
- **External Services Used:**
  - **Stripe:** Billing, invoices, and credit processing.
  - **Twilio (Optional):** Provisioning numbers for AI Voice Calling.

### 1.4 Connect (OAuth Integration Gateway)
**Path:** `/api/connect/[provider]` & `/connect`
**Purpose:** Handles the actual OAuth 2.0 transaction codes when a user links their Blink workspace with external applications.
- **Key Features:** Secure token vaulting, standardized callback handling, token refresh logic (e.g. Reddit 1hr refresh).

---

## 2. Platform Architecture & Data Flow

### 2.1 Dual Authentication Systems
Blink isolated authentication into two distinct paths:
1. **Platform Auth (Firebase):** For users signing into Blink.new itself. Uses Firebase Auth (Google, GitHub, Microsoft, Apple) generating HTTP-only session cookies.
2. **Blink Apps Auth (BYOC/Custom):** For applications generated *by* users. Issues custom JWTs (using HMAC-SHA256) acting as a custom Identity Provider (IdP) for tenant apps.

### 2.2 Background Task & Job Queueing
- **Blink Queue (`http-task-queue`):** Provides background task processing and cron scheduling. This is a self-hosted QStash clone that writes queue state into Turso databases.
- **Cron Jobs (Internal):** Handled in-process via `pg-boss` (v12) connected to the primary PostgreSQL database for core maintenance operations and Stripe syncs.

### 2.3 Tier & Billing System structure
- **Hierarchy:** Free < Starter < Pro < Max < Team.
- **Credits:** System relies on a highly granular credit checking engine to bill for AI calls (e.g., Anthropic generation) and integrations in real time before execution.

---

## 3. Databases

The platform uses a layered database infrastructure:
1. **Primary Database (PG2 - Railway Postgres):** The single source of truth for all users, workspaces, billing data, and RBAC permissions.
2. **Project Databases (Turso/libSQL):** Isolated SQLite-based databases automatically provisioned for every single user-created project. Proxied via `services/blink-database` router to handle sharding dynamically.
3. **Legacy CMS Database (PG1):** Kept online purely for historic/administrative lookup but retired for active application reads.

---

## 4. Summary of External API & Tooling Dependencies

| Service / Tool | Purpose within Application |
|---|---|
| **Firebase Auth** | Primary developer log in and initial session provisioning. |
| **Stripe** | Subscriptions, Trials, one-off credit packs, webhook handlers. |
| **Vercel AI SDK (v6)** | Streaming generative output and managing Multi-Agent tool calls. |
| **Cloudflare Workers** | The core compute runtime (`blink-backend`) used to host code generated by the user. |
| **LibSQL / Turso** | Scale-to-zero Edge Databases provisioned per user application. |
| **Electric SQL** | Shape-based, real-time database reactivity for the UI. |
| **Twilio** | Powering the optional AI voice workflow pipelines. |
| **Puppeteer (Chromium)** | Internal Microservice enabling the AI Agent to scrape/perceive live internet URLs. |
