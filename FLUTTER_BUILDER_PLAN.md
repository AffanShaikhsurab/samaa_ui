# Comprehensive Plan: Flutter App Builder for Adorable

## Table of Contents
1. [Current State Analysis](#1-current-state-analysis)
2. [Architecture Overview](#2-architecture-overview)
3. [Sandbox Strategy: Freestyle vs Daytona](#3-sandbox-strategy-freestyle-vs-daytona)
4. [Flutter Pre-Installation in Sandboxes](#4-flutter-pre-installation-in-sandboxes)
5. [Platform Build Strategies](#5-platform-build-strategies)
6. [Live Preview Architecture](#6-live-preview-architecture)
7. [Required Changes to Current Project](#7-required-changes-to-current-project)
8. [Implementation Phases](#8-implementation-phases)
9. [Technical Deep Dive: Each Scenario](#9-technical-deep-dive-each-scenario)
10. [Cost Analysis](#10-cost-analysis)
11. [Limitations and Workarounds](#11-limitations-and-workarounds)

---

## 1. Current State Analysis

**Project Name:** Adorable (aka Samaa UI)
**Current Capability:** Builds Next.js web apps via conversational AI inside Freestyle VMs
**Tech Stack:** Next.js 16 + React 19 + TypeScript + Freestyle Sandboxes + Vercel AI SDK

### How It Currently Works
```
User Chat → LLM (GPT-5/Claude) → Tools (bash, read, write, etc.) → Freestyle VM
                                      ↓
                              Next.js dev server (port 3000)
                                      ↓
                              Freestyle domain (*.style.dev) → iframe preview
```

### Key Files
| File | Purpose |
|------|---------|
| `adorable/lib/adorable-vm.ts` | Creates Freestyle VM with dev server, PTY, terminals |
| `adorable/lib/create-tools.ts` | 13 AI tools (bash, read, write, commit, checkApp, etc.) |
| `adorable/lib/system-prompt.ts` | AI system prompt (hardcoded to Next.js) |
| `adorable/lib/vars.ts` | Constants: TEMPLATE_REPO, WORKDIR, VM_PORT=3000 |
| `adorable/app/api/chat/route.ts` | Main chat endpoint, creates VM ref, streams LLM |
| `adorable/app/[repoId]/repo-workspace-shell.tsx` | Workspace UI with preview iframe + terminals |

### Current Limitation
The project is **hardcoded to Next.js**:
- `vars.ts` points to a Next.js template repo
- `system-prompt.ts` assumes Next.js files exist
- `adorable-vm.ts` uses `VmDevServer` configured for Next.js
- `checkAppTool` checks for Next.js-specific errors
- `commitTool` deploys via Freestyle's Next.js deployment pipeline

---

## 2. Architecture Overview

### Target Architecture for Flutter Support

```
User Chat → LLM → Tools → Freestyle VM (with Flutter SDK pre-installed)
                               ↓
                    Flutter project in /workspace
                               ↓
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
         flutter build    flutter build    flutter build
           web              apk              appbundle
              ↓                ↓                ↓
         build/web/      app-release.apk   app-release.aab
              ↓                ↓                ↓
         Serve with       Download link    Download link
         http-server      for user         for Play Store
              ↓
         Port exposed → iframe preview
```

### Multi-Platform Strategy

| Platform | Build in Sandbox? | Preview in UI? | Feasibility |
|----------|-------------------|----------------|-------------|
| **Web** | Yes (any Linux sandbox) | Yes (iframe) | HIGH - Primary target |
| **Android APK** | Yes (needs Android SDK) | Download link | MEDIUM - Needs more resources |
| **Android AAB** | Yes (needs Android SDK) | Download link | MEDIUM - For Play Store |
| **iOS** | No (needs macOS) | No | LOW - Requires macOS runner |
| **Linux Desktop** | Yes (any Linux sandbox) | No (binary) | LOW - Not practical for preview |

**Recommendation:** Start with **Web** (immediate preview), then add **Android APK** (download).

---

## 3. Sandbox Strategy: Freestyle vs Daytona

### Freestyle (Current Primary)

**Pros:**
- Already integrated in the project
- Sub-800ms VM startup
- Git-backed persistence
- Custom domains (*.style.dev) for web preview
- Dev server integration with hot reload
- PTY sessions and web terminals built-in

**Cons:**
- VM specs: max 4 vCPU, 8 GiB RAM, 10 GiB disk (may be tight for Flutter + Android SDK)
- Flutter SDK is ~2.8 GB, Android SDK is ~5-10 GB
- May need to resize filesystem

**Flutter Feasibility:** HIGH for Web, MEDIUM for Android (resource constraints)

### Daytona (Alternative)

**Pros:**
- Also already integrated in the project (daytona-vm.ts, daytona-provider.ts, daytona-tools.ts)
- Snapshot system for pre-built Flutter environments
- Image builder for declarative Docker-based setup
- Preview links for any port
- Flexible resource allocation

**Cons:**
- Not currently used as primary (Freestyle is)
- Snapshot creation takes time (one-time setup)
- Max 10 GiB disk per sandbox (may need tier upgrade)

**Flutter Feasibility:** HIGH for both Web and Android

### Recommendation: Use Both Strategically

| Use Case | Provider | Reason |
|----------|----------|--------|
| Next.js apps (existing) | Freestyle | Already working, fast, integrated |
| Flutter Web apps | Freestyle | Lighter weight, instant preview via domain |
| Flutter Android builds | Daytona | Better snapshot support, can pre-install Android SDK |
| Flutter + complex deps | Daytona | Declarative image builder is more flexible |

---

## 4. Flutter Pre-Installation in Sandboxes

### Option A: Freestyle - Custom VmSpec with Snapshot

```typescript
// lib/flutter-vm.ts (NEW FILE)
import { VmSpec } from "freestyle-sandboxes";

const FLUTTER_INSTALL_SCRIPT = `#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

# Install system dependencies
apt-get update && apt-get install -y \\
  curl unzip git xz-utils zip \\
  libglu1-mesa clang cmake ninja-build pkg-config \\
  libgtk-3-dev liblzma-dev libstdc++-12-dev

# Clone Flutter SDK (stable, shallow)
git clone https://github.com/flutter/flutter.git /opt/flutter -b stable --depth 1

# Pre-cache Flutter
export PATH="/opt/flutter/bin:/opt/flutter/bin/cache/dart-sdk/bin:$PATH"
flutter config --no-analytics
flutter precache --web
flutter doctor -v

# Create a marker file so we know Flutter is installed
touch /opt/flutter/.installed
`;

export const flutterVmSpec = new VmSpec({
  aptDeps: [
    "curl", "unzip", "git", "xz-utils", "zip",
    "libglu1-mesa", "clang", "cmake", "ninja-build",
    "pkg-config", "libgtk-3-dev", "liblzma-dev"
  ],
  additionalFiles: {
    "/opt/install-flutter.sh": { content: FLUTTER_INSTALL_SCRIPT },
  },
  systemd: {
    services: [
      {
        name: "install-flutter",
        mode: "oneshot",
        exec: ["/bin/bash /opt/install-flutter.sh"],
      },
    ],
  },
});

// For Android builds (heavier)
const ANDROID_INSTALL_SCRIPT = `#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

# Install Java 17
apt-get update && apt-get install -y openjdk-17-jdk-headless

# Download Android command-line tools
mkdir -p /opt/android-sdk/cmdline-tools
cd /opt/android-sdk/cmdline-tools
curl -sL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o cmdline-tools.zip
unzip -q cmdline-tools.zip
mv cmdline-tools latest

# Accept licenses and install SDK components
export ANDROID_HOME=/opt/android-sdk
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

echo "export ANDROID_HOME=/opt/android-sdk" >> /etc/environment
echo "export PATH=\\"\\$ANDROID_HOME/cmdline-tools/latest/bin:\\$ANDROID_HOME/platform-tools:\\$PATH\\"" >> /etc/environment
`;

export const flutterAndroidVmSpec = new VmSpec({
  aptDeps: [
    "curl", "unzip", "git", "xz-utils", "zip",
    "libglu1-mesa", "clang", "cmake", "ninja-build",
    "pkg-config", "libgtk-3-dev", "liblzma-dev",
    "openjdk-17-jdk-headless", "libc6:i386", "libncurses5:i386",
    "libstdc++6:i386", "lib32z1", "libbz2-1.0:i386"
  ],
  additionalFiles: {
    "/opt/install-flutter.sh": { content: FLUTTER_INSTALL_SCRIPT },
    "/opt/install-android.sh": { content: ANDROID_INSTALL_SCRIPT },
  },
  systemd: {
    services: [
      {
        name: "install-flutter",
        mode: "oneshot",
        exec: ["/bin/bash /opt/install-flutter.sh"],
      },
      {
        name: "install-android",
        mode: "oneshot",
        exec: ["/bin/bash /opt/install-android.sh"],
      },
    ],
  },
});
```

**Key Concern: Disk Space**
- Flutter SDK: ~2.8 GB
- Android SDK (minimal): ~3-5 GB
- Total needed: ~8-10 GB
- Freestyle default: 16 GB rootfs → Should be sufficient
- If not: `new VmSpec({ rootfsSizeGb: 32 })`

### Option B: Daytona - Snapshot with Image Builder

```typescript
// lib/daytona-flutter.ts (NEW FILE)
import { Daytona, Image } from '@daytonaio/sdk';

export async function createFlutterSnapshot() {
  const daytona = new Daytona();

  const image = Image.base('ubuntu:22.04')
    .runCommands([
      // System deps
      'apt-get update && apt-get install -y curl unzip git xz-utils zip libglu1-mesa clang cmake ninja-build pkg-config libgtk-3-dev',

      // Flutter SDK
      'git clone https://github.com/flutter/flutter.git /opt/flutter -b stable --depth 1',
      'export PATH="/opt/flutter/bin:/opt/flutter/bin/cache/dart-sdk/bin:$PATH',
      'flutter config --no-analytics',
      'flutter precache --web',
      'flutter doctor -v',

      // Create workspace
      'mkdir -p /workspace',
    ])
    .env({
      PATH: '/opt/flutter/bin:/opt/flutter/bin/cache/dart-sdk/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      FLUTTER_ROOT: '/opt/flutter',
    })
    .workdir('/workspace');

  await daytona.snapshot.create(
    {
      name: 'flutter-web-builder',
      image,
      resources: { cpu: 4, memory: 8, disk: 20 },
    },
    { onLogs: console.log }
  );
}

// For Android builds
export async function createFlutterAndroidSnapshot() {
  const daytona = new Daytona();

  const image = Image.base('ubuntu:22.04')
    .runCommands([
      'apt-get update && apt-get install -y curl unzip git xz-utils zip libglu1-mesa clang cmake ninja-build pkg-config libgtk-3-dev openjdk-17-jdk-headless',

      // Flutter SDK
      'git clone https://github.com/flutter/flutter.git /opt/flutter -b stable --depth 1',
      'export PATH="/opt/flutter/bin:/opt/flutter/bin/cache/dart-sdk/bin:$PATH',
      'flutter config --no-analytics',
      'flutter precache --web --android',

      // Android SDK
      'mkdir -p /opt/android-sdk/cmdline-tools',
      'cd /opt/android-sdk/cmdline-tools && curl -sL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o cmd.zip && unzip -q cmd.zip && mv cmdline-tools latest',
      'export ANDROID_HOME=/opt/android-sdk',
      'export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"',
      'yes | sdkmanager --licenses || true',
      'sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"',

      'mkdir -p /workspace',
    ])
    .env({
      PATH: '/opt/flutter/bin:/opt/flutter/bin/cache/dart-sdk/bin:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      FLUTTER_ROOT: '/opt/flutter',
      ANDROID_HOME: '/opt/android-sdk',
      JAVA_HOME: '/usr/lib/jvm/java-17-openjdk-amd64',
    })
    .workdir('/workspace');

  await daytona.snapshot.create(
    {
      name: 'flutter-android-builder',
      image,
      resources: { cpu: 4, memory: 8, disk: 30 },
    },
    { onLogs: console.log }
  );
}
```

### Option C: Docker Image (Works for Both)

Create a Docker image with Flutter pre-installed and use it as the base:

```dockerfile
# Dockerfile.flutter
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# System dependencies
RUN apt-get update && apt-get install -y \\
    curl unzip git xz-utils zip \\
    libglu1-mesa clang cmake ninja-build pkg-config \\
    libgtk-3-dev liblzma-dev libstdc++-12-dev \\
    && rm -rf /var/lib/apt/lists/*

# Flutter SDK
RUN git clone https://github.com/flutter/flutter.git /opt/flutter -b stable --depth 1
ENV PATH="/opt/flutter/bin:/opt/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Pre-cache
RUN flutter config --no-analytics && \\
    flutter precache --web && \\
    flutter doctor -v

WORKDIR /workspace
```

This Docker image can be used with:
- Daytona: `Image.fromDockerfile('./Dockerfile.flutter')`
- Freestyle: Use as a custom snapshot base

### Recommendation

| Approach | Best For | Startup Time | Complexity |
|----------|----------|-------------|------------|
| Freestyle VmSpec + systemd | Flutter Web only | ~10-30s first time, cached after | Low |
| Freestyle snapshot (cached) | Flutter Web production | ~1-3s | Medium |
| Daytona snapshot | Flutter Web + Android | ~1-3s | Medium |
| Docker image | Both providers | ~5-15s | High (initial setup) |

**Start with Freestyle VmSpec** for Flutter Web (simplest), then graduate to snapshots for production.

---

## 5. Platform Build Strategies

### Flutter Web Build

```bash
# Inside the sandbox
cd /workspace
flutter create . --project-name my_app  # or receive files from AI
flutter pub get
flutter build web --release

# Output: /workspace/build/web/
# Serve with:
cd build/web && python3 -m http.server 8080
```

**Preview:** The static files in `build/web/` are served on port 8080, and Freestyle/Daytona exposes this via a domain or preview link.

**Build Time:** 1-15 minutes depending on project size

### Flutter Android Build

```bash
# Inside the sandbox (with Android SDK pre-installed)
cd /workspace
flutter build apk --release

# Output: /workspace/build/app/outputs/flutter-apk/app-release.apk
# OR for Play Store:
flutter build appbundle --release
# Output: /workspace/build/app/outputs/bundle/release/app-release.aab
```

**Preview:** No live preview possible. Provide a download link to the APK/AAB file.

**Build Time:** 2-20 minutes depending on project size

**Signing:** For production apps, need to set up keystore. For development/testing, Flutter uses a debug keystore automatically.

### Flutter iOS Build

**NOT POSSIBLE in Linux sandboxes.** Requires macOS + Xcode.

**Workarounds:**
1. Use GitHub Actions with `macos-latest` runner
2. Use Codemagic CI/CD (macOS-based, free tier available)
3. Skip iOS for now (focus on Web + Android)

---

## 6. Live Preview Architecture

### Flutter Web Preview (Primary)

This is the most important scenario - showing the Flutter app running in the browser.

```
┌─────────────────────────────────────────────────────┐
│                    User's Browser                     │
│                                                       │
│  ┌─────────────┐  ┌─────────────────────────────────┐│
│  │ Chat Panel  │  │ Preview Panel (iframe)          ││
│  │             │  │                                   ││
│  │ User: "Add  │  │  ┌─────────────────────────────┐ ││
│  │ a login     │  │  │ Flutter Web App             │ ││
│  │ page"       │  │  │ (served from sandbox)       │ ││
│  │             │  │  │                             │ ││
│  │ AI: *uses   │  │  │  [Login Form]               │ ││
│  │ tools to    │  │  │  [Username]                 │ ││
│  │ edit files* │  │  │  [Password]                 │ ││
│  │             │  │  │  [Submit]                   │ ││
│  │ *flutter    │  │  └─────────────────────────────┘ ││
│  │ build web*  │  │                                   ││
│  └─────────────┘  └─────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────────────────────────────────────────┐
│              Freestyle / Daytona Sandbox              │
│                                                       │
│  /workspace/                                          │
│  ├── lib/main.dart                                    │
│  ├── pubspec.yaml                                     │
│  └── build/web/          ← flutter build output       │
│      ├── index.html                                   │
│      ├── main.dart.js                                 │
│      └── ...                                          │
│                                                       │
│  python3 -m http.server 8080 --directory build/web    │
│         ↓                                             │
│  Port 8080 → Exposed as https://*.style.dev           │
└─────────────────────────────────────────────────────┘
```

### How It Works Today (Next.js)
1. VM starts with `VmDevServer` running `npm run dev` on port 3000
2. Freestyle maps `*.style.dev` domain to port 3000
3. iframe in UI loads `https://<domain>.style.dev`
4. Dev server auto-reloads when files change

### How It Will Work (Flutter Web)
1. VM starts with Flutter SDK pre-installed
2. AI writes Flutter code via tools
3. AI runs `flutter build web` (or `flutter run -d web-server --web-port 8080` for dev mode)
4. A simple HTTP server serves `build/web/` on port 8080
5. Freestyle/Daytona maps domain to port 8080
6. iframe loads the preview URL

**Two modes for Flutter Web:**

#### Mode 1: Build + Serve (Recommended for Production-Like)
```bash
flutter build web --release
cd build/web && python3 -m http.server 8080
```
- Pros: Optimized, tree-shaken, minified
- Cons: No hot reload, full rebuild needed for changes
- Build time: 1-15 min

#### Mode 2: Flutter Run with Web Server (Recommended for Development)
```bash
flutter run -d web-server --web-port 8080 --web-hostname 0.0.0.0
```
- Pros: Hot reload support, faster iteration
- Cons: Debug mode, not optimized
- Note: `flutter run` in headless mode may need `--no-sound-null-safety` or other flags

**Recommendation:** Use Mode 1 (build + serve) for the MVP. The AI can rebuild after making changes. Mode 2 can be added later for faster iteration.

### Android Preview (No Live Preview)
For Android builds, the approach is:
1. AI builds the APK: `flutter build apk --release`
2. Sandbox exposes the APK file via a download URL
3. User downloads and installs on their device
4. Alternative: Provide an APK download button in the UI

**No iframe preview is possible for Android apps in a browser.**

---

## 7. Required Changes to Current Project

### 7.1 New Files to Create

| File | Purpose |
|------|---------|
| `lib/flutter-vm.ts` | Flutter VM spec creation (Freestyle) |
| `lib/flutter-daytona.ts` | Flutter snapshot creation (Daytona) |
| `lib/flutter-tools.ts` | Flutter-specific AI tools (build, run, doctor) |
| `lib/flutter-prompt.ts` | Flutter-specific system prompt |
| `lib/flutter-templates.ts` | Flutter project templates |
| `lib/project-type.ts` | Project type detection/config |
| `app/api/repos/[repoId]/build/route.ts` | Build trigger API |
| `app/api/repos/[repoId]/download/route.ts` | APK/AAB download API |
| `components/assistant-ui/flutter-preview.tsx` | Flutter-specific preview component |
| `components/assistant-ui/project-type-selector.tsx` | UI to choose Flutter vs Next.js |

### 7.2 Files to Modify

| File | Changes |
|------|---------|
| `lib/vars.ts` | Add Flutter constants (ports, paths, template repos) |
| `lib/adorable-vm.ts` | Support Flutter VM spec alongside Next.js |
| `lib/create-tools.ts` | Add Flutter-specific tools (build, doctor, run) |
| `lib/system-prompt.ts` | Make prompt dynamic based on project type |
| `lib/repo-types.ts` | Add `projectType` field to RepoItem/RepoVmInfo |
| `app/api/chat/route.ts` | Route to correct VM spec based on project type |
| `app/api/repos/route.ts` | Support creating Flutter repos |
| `app/[repoId]/repo-workspace-shell.tsx` | Support Flutter preview (build output) + download buttons |
| `components/assistant-ui/home-welcome.tsx` | Add Flutter project option |

### 7.3 New Dependencies

```json
{
  "dependencies": {
    // No new npm packages needed for core Flutter support
    // Existing freestyle-sandboxes and @daytonaio/sdk are sufficient
  }
}
```

### 7.4 Environment Variables

```env
# Existing
FREESTYLE_API_KEY=...
DAYTONA_API_KEY=...

# New (optional)
FLUTTER_DEFAULT_CHANNEL=stable
FLUTTER_BUILD_TIMEOUT=600000  # 10 minutes in ms
ANDROID_SIGNING_KEYSTORE=...  # Base64 encoded keystore for production Android builds
```

---

## 8. Implementation Phases

### Phase 1: Flutter Web MVP (2-3 weeks)

**Goal:** User can create a Flutter project and see it running in the browser.

**Tasks:**
1. **Project type selection UI** - Add "Flutter" option to the new project dialog
2. **Flutter VM spec** - Create `flutter-vm.ts` with Flutter pre-installation
3. **Flutter template repo** - Create a GitHub repo with a base Flutter project (like the Next.js template)
4. **Dynamic system prompt** - Detect project type and serve appropriate prompt
5. **Flutter-specific tools** - Add `flutterBuildTool`, `flutterDoctorTool`, `flutterRunTool`
6. **Build + serve workflow** - AI runs `flutter build web`, then serves with http-server
7. **Preview integration** - Ensure iframe shows Flutter web output
8. **Update checkAppTool** - Handle Flutter web builds (check for build errors, serve output)

**Deliverables:**
- User selects "Flutter" when creating a project
- AI writes Dart code, builds web, serves it
- Preview shows in iframe

### Phase 2: Flutter Web Hot Reload (1-2 weeks)

**Goal:** Faster iteration with `flutter run -d web-server` instead of full rebuild.

**Tasks:**
1. **Dev server mode** - Use `flutter run -d web-server --web-port 8080`
2. **File watcher integration** - Trigger hot reload when files change
3. **Build progress indicator** - Show build status in UI
4. **Error handling** - Parse Flutter build errors and show in chat

### Phase 3: Android APK Build (2-3 weeks)

**Goal:** User can download an APK of their Flutter app.

**Tasks:**
1. **Android SDK pre-installation** - Extend VM spec with Android SDK
2. **APK build tool** - AI runs `flutter build apk --release`
3. **Download API** - Create endpoint to serve built APK files
4. **Download UI** - Add "Download APK" button in workspace
5. **Signing setup** - Handle debug/release signing
6. **Resource management** - Ensure sandbox has enough disk/RAM

### Phase 4: Daytona Integration (1-2 weeks)

**Goal:** Use Daytona for Flutter builds that need more resources.

**Tasks:**
1. **Daytona Flutter snapshot** - Pre-build snapshot with Flutter SDK
2. **Provider abstraction** - Allow choosing Freestyle or Daytona per project
3. **Daytona-specific tools** - Adapt tools for Daytona SDK
4. **Preview URL mapping** - Use Daytona's preview link API

### Phase 5: Polish and Advanced Features (Ongoing)

- iOS support via Codemagic/GitHub Actions integration
- Flutter package management (pub.dev integration)
- Flutter test runner
- Multiple Flutter flavors/variants
- Custom Flutter plugins support
- Flutter web WASM builds

---

## 9. Technical Deep Dive: Each Scenario

### Scenario 1: User Creates Flutter Web App

```
1. User clicks "New Project" → Selects "Flutter"
2. Frontend calls POST /api/repos with { type: "flutter", template: "flutter-web" }
3. Backend:
   a. Creates Freestyle git repo
   b. Initializes repo with Flutter template (pubspec.yaml, lib/main.dart, web/index.html)
   c. Creates VM with flutterVmSpec:
      - VmSpec with Flutter SDK installation via systemd
      - Port 8080 for web server
      - Domain: <uuid>-adorable.style.dev mapped to port 8080
   d. Stores metadata with projectType: "flutter-web"
4. VM starts, Flutter SDK installs (~30s first time, cached after)
5. AI system prompt switches to Flutter mode
6. User says "Build me a counter app"
7. AI:
   a. Reads lib/main.dart
   b. Writes Flutter code
   c. Runs `flutter build web --release`
   d. Runs `cd build/web && python3 -m http.server 8080 &`
   e. Calls checkAppTool to verify
8. Preview iframe loads https://<domain>.style.dev
9. User sees Flutter app running in browser
```

### Scenario 2: User Creates Flutter Android App

```
1. User clicks "New Project" → Selects "Flutter Android"
2. Backend creates VM with flutterAndroidVmSpec (includes Android SDK)
3. VM starts, Flutter + Android SDK install (~2-5 min first time)
4. AI writes Flutter code
5. AI runs `flutter build apk --release`
6. Build completes (2-20 min)
7. AI responds: "Your APK is ready! Download it here: [link]"
8. Frontend shows download button
9. User clicks → GET /api/repos/{repoId}/download?type=apk
10. Backend streams the APK file from the sandbox
```

### Scenario 3: User Modifies Existing Flutter App

```
1. User opens existing Flutter project
2. VM is resumed (or recreated from snapshot with Flutter pre-installed)
3. User says "Change the theme to dark mode"
4. AI:
   a. Reads lib/main.dart and lib/app.dart
   b. Modifies the theme configuration
   c. Runs `flutter build web --release` (incremental, faster)
   d. Restarts the http server
5. Preview updates in iframe
```

### Scenario 4: Detecting Project Type

The system needs to know whether a repo is Next.js or Flutter to:
- Choose the correct VM spec
- Use the correct system prompt
- Run the correct build commands
- Check for the correct errors

**Detection logic:**
```typescript
function detectProjectType(files: string[]): 'nextjs' | 'flutter' | 'unknown' {
  if (files.includes('pubspec.yaml')) return 'flutter';
  if (files.includes('next.config.ts') || files.includes('next.config.js')) return 'nextjs';
  return 'unknown';
}
```

Or store it explicitly in repo metadata:
```typescript
type RepoMetadata = {
  projectType: 'nextjs' | 'flutter-web' | 'flutter-android' | 'flutter-full';
  vm: RepoVmInfo;
  // ...
};
```

---

## 10. Cost Analysis

### Freestyle Pricing (per hour)

| Resource | Rate |
|----------|------|
| vCPU | $0.04032/hr |
| GiB Memory | $0.0129/hr |
| GiB Storage | $0.000086/hr |

**Typical Flutter Web VM (4 vCPU, 8 GiB RAM, 20 GiB disk):**
- vCPU: 4 × $0.04032 = $0.16128/hr
- Memory: 8 × $0.0129 = $0.1032/hr
- Storage: 20 × $0.000086 = $0.00172/hr
- **Total: ~$0.266/hr**

**Cost per Flutter build session (30 min):** ~$0.13

**With auto-suspend (15 min idle):** If user is inactive, VM suspends and only storage is billed.

### Daytona Pricing (per second)

| Resource | Rate |
|----------|------|
| vCPU | $0.000014/s |
| GiB Memory | $0.0000045/s |
| GiB Storage | $0.00000003/s |

**Typical Flutter VM (4 vCPU, 8 GiB RAM, 20 GiB disk):**
- vCPU: 4 × $0.000014 = $0.000056/s → $0.2016/hr
- Memory: 8 × $0.0000045 = $0.000036/s → $0.1296/hr
- Storage: 20 × $0.00000003 = $0.00000006/s → $0.000216/hr
- **Total: ~$0.331/hr**

Both are comparable. Freestyle is slightly cheaper for always-on VMs; Daytona is cheaper for short-lived builds.

---

## 11. Limitations and Workarounds

### Limitation 1: Flutter SDK Size (~2.8 GB)
**Impact:** First VM creation takes 30-60 seconds to install Flutter
**Workaround:** Use snapshots/caching. After first install, subsequent VMs start in 1-3 seconds

### Limitation 2: Android SDK Size (~5-10 GB)
**Impact:** VM needs more disk space; first creation takes 2-5 minutes
**Workaround:** Use larger disk allocation (20-30 GB). Use snapshots for subsequent VMs

### Limitation 3: iOS Builds Require macOS
**Impact:** Cannot build iOS apps in Linux sandboxes
**Workaround:** 
- Focus on Web + Android initially
- Later: Integrate with Codemagic or GitHub Actions for iOS builds
- Or use a macOS-based sandbox provider

### Limitation 4: Flutter Build Time (1-20 min)
**Impact:** User waits for build before seeing preview
**Workaround:**
- Use `flutter run -d web-server` for dev mode (hot reload)
- Show build progress in UI
- Cache Flutter build artifacts

### Limitation 5: No Live Preview for Android
**Impact:** User can't see Android app running interactively
**Workaround:**
- Provide APK download link
- Consider integrating an Android emulator in the sandbox (very resource-heavy, not recommended initially)
- Use Flutter Web as the primary preview, Android as a build target

### Limitation 6: Sandbox Resource Limits
**Impact:** Complex Flutter apps may need more CPU/RAM than default limits
**Workaround:**
- Use higher-tier sandbox configurations
- Monitor resource usage and scale up if needed
- Use Daytona for heavy builds (more flexible resource allocation)

### Limitation 7: Freestyle Deployment Pipeline is Next.js-Specific
**Impact:** Can't use `freestyle.serverless.deployments.create()` for Flutter apps
**Workaround:**
- For Flutter Web: Serve from the sandbox directly (no need for Freestyle deployments)
- For production: Upload to Firebase Hosting, Netlify, or S3
- Create a separate deployment flow for Flutter projects

---

## Appendix A: Quick Reference - Flutter Commands

```bash
# Create new project
flutter create --project-name my_app --org com.example .

# Install dependencies
flutter pub get

# Add a package
flutter pub add package_name

# Run analysis
flutter analyze

# Run tests
flutter test

# Build for web (release)
flutter build web --release

# Build for web (debug, faster)
flutter build web --debug

# Build for web with WASM
flutter build web --wasm

# Build Android APK
flutter build apk --release

# Build Android App Bundle (for Play Store)
flutter build appbundle --release

# Start web dev server with hot reload
flutter run -d web-server --web-port 8080 --web-hostname 0.0.0.0

# Check environment
flutter doctor -v

# Clean build artifacts
flutter clean

# Get Flutter version
flutter --version
```

## Appendix B: Template Flutter Project Structure

```
flutter-template/
├── pubspec.yaml              # Dependencies
├── analysis_options.yaml     # Lint rules
├── lib/
│   └── main.dart             # Entry point
├── web/
│   ├── index.html            # Web entry point
│   ├── manifest.json         # PWA manifest
│   └── favicon.png
├── test/
│   └── widget_test.dart      # Default test
├── android/                  # Android-specific (auto-generated)
├── ios/                      # iOS-specific (auto-generated)
└── README.md
```

## Appendix C: Decision Matrix - Which Provider for What

| Scenario | Freestyle | Daytona | Reason |
|----------|-----------|---------|--------|
| Flutter Web (MVP) | ✅ | | Already integrated, faster path |
| Flutter Web (production) | | ✅ | Better snapshot support |
| Flutter Android | | ✅ | Need Android SDK, more disk |
| Next.js (existing) | ✅ | | Already working |
| Quick experiments | ✅ | | Fastest VM creation |
| Heavy builds (large apps) | | ✅ | More flexible resources |
