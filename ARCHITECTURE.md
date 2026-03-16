# Sauce for Zwift — Architecture Overview

> Overlay widgets and advanced instrumentation for the serious Zwifter.
> An Electron desktop app that monitors the Zwift cycling/running simulator in real-time, providing extended stats, map overlays, gauges, chat, and analysis tools.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │ loader.js│→ │ main.mjs │→ │  app.mjs  │→ │ zwift.mjs │  │
│  │ (entry)  │  │(lifecycle│  │(SauceApp) │  │(Zwift API │  │
│  │          │  │ windows) │  │           │  │ + proto)  │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │stats.mjs │  │ db.mjs   │  │webserver  │  │ mods.mjs  │  │
│  │(181KB -  │  │(SQLite3) │  │.mjs       │  │(plugin    │  │
│  │ metrics) │  │          │  │(Express+WS│  │ system)   │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐                 │
│  │windows   │  │ rpc.mjs  │  │headless   │                 │
│  │.mjs (69K)│  │(IPC/RPC) │  │.mjs (CLI) │                 │
│  └──────────┘  └──────────┘  └───────────┘                 │
└───────────────────┬────────────────┬────────────────────────┘
                    │ Electron IPC   │ HTTP/WebSocket
                    ▼                ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│   Renderer / Pages       │  │   External Consumers         │
│   (BrowserWindow)        │  │   (Browser, OBS, etc.)       │
│                          │  │                              │
│  pages/src/*.mjs         │  │   http://localhost:1080      │
│  pages/*.html            │  │   ws://localhost:1080        │
│  pages/scss → pages/css  │  │   https://localhost:1081     │
└──────────────────────────┘  └──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────┐
│   Shared Utilities       │
│   shared/sauce/*.mjs     │
│   (power, pace, geo,     │
│    locale, data, time)   │
└──────────────────────────┘
```

---

## Directory Structure

```
sauce4zwift/
├── src/                    # Electron main process (Node.js)
│   ├── loader.js           # Entry point — bootstrap, single-instance, Sentry
│   ├── main.mjs            # App lifecycle, window creation, updates
│   ├── app.mjs             # SauceApp class — settings, API orchestration, RPC
│   ├── zwift.mjs           # Zwift protocol client (95KB) — REST + Protobuf APIs
│   ├── zwift.proto          # Protocol Buffer definitions (1,495 lines)
│   ├── stats.mjs           # Statistics engine (181KB) — the largest module
│   ├── windows.mjs         # Window management system (69KB)
│   ├── webserver.mjs       # Express HTTP + WebSocket server
│   ├── db.mjs              # SQLite database wrapper (better-sqlite3, WAL mode)
│   ├── rpc.mjs             # IPC/RPC communication protocol
│   ├── mods.mjs            # Plugin/mod loading system
│   ├── mods-core.mjs       # Core mod functionality
│   ├── storage.mjs         # Persistent settings/data storage
│   ├── secrets.mjs         # Credential management (keytar)
│   ├── hotkeys.mjs         # Keyboard shortcut handling
│   ├── headless.mjs        # CLI headless mode (no GUI)
│   ├── env.mjs             # Environment configuration
│   ├── menu.mjs            # Application menu
│   ├── logging.js          # Logging infrastructure
│   ├── patreon.mjs         # Patreon integration
│   ├── fs-safe.js          # Safe file system operations
│   ├── mime.mjs            # MIME type mapping
│   ├── argparse.mjs        # CLI argument parsing
│   ├── unzoom.mjs          # Window zoom handling
│   ├── window-manifests.json # Widget window definitions
│   └── preload/            # Electron preload scripts
│       ├── common.js
│       ├── dialog.js
│       ├── patron-link.js
│       ├── storage-proxy.js
│       ├── webview.js
│       └── zwift-login.js
│
├── pages/                  # Frontend (Renderer process)
│   ├── src/                # Frontend JavaScript modules (33 files, ~888KB)
│   │   ├── common.mjs      # Shared frontend utilities (88KB)
│   │   ├── analysis.mjs    # Session analysis UI (60KB)
│   │   ├── map.mjs         # Map visualization (90KB)
│   │   ├── map-canvas.mjs  # Canvas-based map rendering (59KB)
│   │   ├── elevation.mjs   # Elevation chart (42KB)
│   │   ├── watching.mjs    # Watched athlete view (52KB)
│   │   ├── nearby.mjs      # Nearby athletes table (38KB)
│   │   ├── overview.mjs    # Overview stats panel (35KB)
│   │   ├── groups.mjs      # Group view UI (31KB)
│   │   ├── fields.mjs      # Field definitions & formatting (37KB)
│   │   ├── events.mjs      # Event listings (20KB)
│   │   ├── geo.mjs         # Geographic rendering (18KB)
│   │   ├── gauge.mjs       # Gauge widget rendering (15KB)
│   │   ├── charts.mjs      # Chart utilities
│   │   ├── chat.mjs        # Chat interface
│   │   ├── color.mjs       # Color utilities
│   │   ├── dialog.mjs      # Dialog system
│   │   └── ...             # athletes, game-control, segments, etc.
│   ├── scss/               # SASS stylesheets → compiled to CSS
│   ├── fonts/              # Custom fonts
│   ├── images/             # UI images
│   ├── sounds/             # Audio files
│   ├── templates/          # HTML templates
│   ├── gauges/             # Gauge HTML templates
│   └── *.html              # Page entry points (overview, analysis, etc.)
│
├── shared/                 # Code shared between main & renderer
│   ├── sauce/
│   │   ├── power.mjs       # Power calculations, W'bal, zones (30KB)
│   │   ├── locale.mjs      # i18n & number/unit formatting (16KB)
│   │   ├── data.mjs        # Data aggregation & statistics (18KB)
│   │   ├── geo.mjs         # Geospatial calculations (11KB)
│   │   ├── pace.mjs        # Speed/pace conversions
│   │   ├── time.mjs        # Time utilities, clock sync
│   │   ├── perf.mjs        # Performance monitoring
│   │   ├── template.mjs    # Template rendering (8KB)
│   │   ├── browser.mjs     # Browser-specific utilities
│   │   ├── base.mjs        # Base utilities & classes
│   │   └── index.mjs       # Module re-exports
│   ├── routes.mjs          # Route geometry & road sections (8KB)
│   ├── curves.mjs          # Power/performance curves (25KB)
│   └── report.mjs          # Error/status reporting (4KB)
│
├── build/                  # Build configuration
│   ├── scripts/notarize.js # macOS notarization
│   ├── entitlements.mac.plist
│   ├── images/             # App icons
│   └── linux.Dockerfile    # Linux Docker build
│
├── test/                   # Tests (Node.js built-in test runner)
│   ├── curves.test.mjs     # Power curves tests (34KB)
│   ├── wbal.test.mjs       # W'bal calculation tests
│   ├── lru.test.mjs        # LRU cache tests
│   └── stats.mjs           # Test utilities
│
├── tools/bin/              # Dev tooling
│   ├── buildenv            # Build environment generator
│   ├── jsonminify           # JSON minifier
│   ├── lintwatch           # ESLint watcher
│   └── watch               # File watcher
│
├── assets/                 # Static assets & notes
├── images/                 # Project images
├── .github/                # CI/CD (CodeQL analysis)
├── Makefile                # Build system (multi-platform)
└── package.json            # App manifest & electron-builder config
```

---

## Core Modules (Main Process)

### Entry & Lifecycle

| File | Purpose |
|------|---------|
| `src/loader.js` | Electron entry point. Loads build env, initializes Sentry, enforces single instance, then imports `main.mjs`. |
| `src/main.mjs` | Application lifecycle — creates windows, manages updates, starts game connection and web server. |
| `src/app.mjs` | `SauceApp` class — central orchestrator. Manages settings (via `Storage`), Zwift API instances (main + monitor), web server, and RPC endpoint registration. |
| `src/env.mjs` | Environment variables and configuration loading. |
| `src/argparse.mjs` | CLI argument parsing for headless mode and debug options. |

### Zwift Integration

| File | Purpose |
|------|---------|
| `src/zwift.mjs` | `ZwiftAPI` class (2,817 lines). Full Zwift REST + Protobuf API client. OAuth2 auth via `secure.zwift.com`, real-time player state via relay servers, events, activities, profiles, workouts, segments, social features. |
| `src/zwift.proto` | Protocol Buffer schema (1,495 lines). Defines `PlayerState`, `ServerToClient`, `ClientToServer`, `Activity`, `Event`, `PlayerProfile`, `PayloadChatMessage`, `SegmentResults`, and many more message types for Zwift's binary protocol. |

### Statistics & Data Processing

| File | Purpose |
|------|---------|
| `src/stats.mjs` | `StatsProcessor` — the largest module (181KB). Aggregates real-time athlete data, calculates power metrics (NP, TSS, IF, W'bal, peaks, zones), manages event leaderboards, segment results, and activity replay via FIT files. |
| `shared/sauce/power.mjs` | Power metric calculations — W'balance (Skiba/Froncioni-Skiba-Clarke), power zones (Coggan-based + custom), critical power models. |
| `shared/sauce/data.mjs` | Statistical functions — rolling averages, aggregation, data smoothing. |
| `shared/curves.mjs` | Power/performance curve generation and analysis (25KB). |

### Data Persistence

| File | Purpose |
|------|---------|
| `src/db.mjs` | `SqliteDatabase` class wrapping `better-sqlite3`. WAL mode enabled. Dynamic table/index creation from schema objects. |
| `src/storage.mjs` | Key-value settings persistence. |
| `src/secrets.mjs` | Credential storage via `keytar` (OS keychain integration). |

**SQLite Databases:**
- `athletes.sqlite` — Cached athlete profiles (`id INTEGER PK`, `data TEXT` as JSON)
- `event_subgroups.sqlite` — Event participation cache (`id`, `eventId`, `eventType`)

### Networking & Communication

| File | Purpose |
|------|---------|
| `src/webserver.mjs` | Express.js HTTP server (port 1080) + HTTPS (port 1081) + WebSocket. Serves widget pages, REST API, real-time event stream, and mod content injection. |
| `src/rpc.mjs` | RPC request/response protocol over Electron IPC and WebSocket. Bidirectional event-emitter-based communication between main process, renderer windows, and external clients. |

### Window & UI Management

| File | Purpose |
|------|---------|
| `src/windows.mjs` | Window management system (69KB). Creates/manages Electron `BrowserWindow` instances based on `window-manifests.json`. Handles overlay positioning, transparency, always-on-top, frame options. |
| `src/window-manifests.json` | Declares 18+ widget window types with dimensions, overlay behavior, and grouping. |
| `src/hotkeys.mjs` | Global keyboard shortcut registration and handling. |
| `src/menu.mjs` | Native application menu (macOS/Windows/Linux). |

### Plugin System

| File | Purpose |
|------|---------|
| `src/mods.mjs` | Mod loading system (16KB). Discovers, loads, and manages third-party plugins. Mods can add new windows, inject content scripts, and extend functionality. |
| `src/mods-core.mjs` | Core mod API — the interface mods use to interact with the app. |

### Headless Mode

| File | Purpose |
|------|---------|
| `src/headless.mjs` | CLI-only operation without GUI. Requires Zwift credentials via CLI args or env vars. Runs the web server for remote access to widgets. |

---

## Frontend Architecture (pages/)

The frontend uses **vanilla JavaScript (ES2024 modules)** with no framework — just custom elements, Canvas API, and direct DOM manipulation.

### Key Patterns

- **ES Modules** — All frontend code uses `.mjs` imports
- **Custom Elements** — Some widgets use Web Components
- **Canvas Rendering** — Maps, gauges, and elevation charts render on `<canvas>`
- **ECharts** — Used for complex data charts (analysis, power curves)
- **SCSS** — Stylesheets compiled via `sass` to CSS
- **RPC via WebSocket** — Frontend communicates with main process through the web server's WebSocket or Electron IPC (via preload scripts)

### Widget Windows

Defined in `src/window-manifests.json`, each widget is a standalone HTML page:

| Widget | File | Description |
|--------|------|-------------|
| Overview | `overview.html` | Stats & control panel, always visible |
| Watching | `watching.html` | Currently watched athlete stats grid |
| Groups | `groups.html` | Athlete group visualization |
| Geo/Map | `geo.html` | Interactive course map + elevation profile |
| Chat | `chat.html` | In-game chat display |
| Nearby | `nearby.html` | Table of nearby athletes |
| Analysis | `analysis.html` | Post-ride session analysis |
| Athletes | `athletes.html` | Athlete management |
| Events | `events.html` | Event listings |
| Segments | `segments.html` | Segment results |
| Game Control | `game-control.html` | In-game actions (U-turn, powerups) |
| Power Gauge | `gauges/power.html` | Power meter gauge |
| HR Gauge | `gauges/hr.html` | Heart rate gauge |
| Draft Gauge | `gauges/draft.html` | Drafting percentage gauge |
| Pace Gauge | `gauges/pace.html` | Speed/pace gauge |
| Cadence Gauge | `gauges/cadence.html` | Cadence gauge |
| W'bal Gauge | `gauges/wbal.html` | W'balance gauge |

### Special Pages

| Page | Purpose |
|------|---------|
| `welcome.html` | First-time setup wizard |
| `zwift-login.html` | Zwift credential entry |
| `eula.html` | License agreement |
| `patron-link.html` | Patreon account linking |
| `update.html` | Update notifications |
| `release-notes.html` | Version history display |

---

## Communication Flow

```
┌──────────────┐     Protobuf/REST      ┌──────────────┐
│  Zwift Game  │◄──────────────────────►│  ZwiftAPI    │
│  Servers     │  (us-or-rly101.zwift   │  (zwift.mjs) │
│              │   secure.zwift.com)    │              │
└──────────────┘                        └──────┬───────┘
                                               │
                                        ┌──────▼───────┐
                                        │StatsProcessor│
                                        │ (stats.mjs)  │
                                        └──────┬───────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                       ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
                       │  Electron   │  │  WebSocket  │  │  SQLite    │
                       │  IPC (rpc)  │  │  (Express)  │  │  (db.mjs)  │
                       └──────┬──────┘  └──────┬──────┘  └────────────┘
                              │                │
                       ┌──────▼──────┐  ┌──────▼──────┐
                       │  Overlay    │  │  External   │
                       │  Windows    │  │  Clients    │
                       │  (pages/)   │  │  (Browser,  │
                       │             │  │   OBS, etc) │
                       └─────────────┘  └─────────────┘
```

1. **Zwift → App**: `ZwiftAPI` authenticates via OAuth2, then polls relay servers for real-time `PlayerState` data using Protobuf encoding.
2. **App → Stats**: `StatsProcessor` consumes raw game data, computes derived metrics (NP, W'bal, peaks, gaps, drafting).
3. **App → Renderers**: Data flows to overlay windows via Electron IPC or to external clients via WebSocket on port 1080.
4. **App → DB**: Athlete profiles and event data cached in SQLite for offline access and performance.

---

## External Integrations

| Service | Protocol | Purpose |
|---------|----------|---------|
| **Zwift Relay Servers** | HTTPS + Protobuf | Real-time player state, world updates |
| **Zwift Secure API** | OAuth2 + REST | Authentication, profiles, events, activities |
| **Sentry** | HTTPS | Error reporting (`@sentry/node`) |
| **GitHub Releases** | HTTPS | Auto-updates via `electron-updater` |
| **Patreon** | OAuth | Premium feature gating |
| **OS Keychain** | Native | Credential storage via `keytar` |
| **Training Platforms** | Via Zwift API | Scheduled workouts (TrainingPeaks, Intervals.icu, etc.) |
| **FIT Files** | Binary | Activity import/replay via `jsfit` |

---

## Build System

**Toolchain:** `Makefile` → `electron-builder` → platform-specific packages

```
make build       # Generate build.json metadata
make sass        # Compile SCSS → CSS
make run         # Dev mode with hot reload
make packed      # Create distributable packages
make publish     # Publish to GitHub releases
make lint        # ESLint
make test        # Node.js test runner
```

**Targets:**
- **Windows** — Signed `.exe` with auto-updater
- **macOS** — Universal binary (Intel + Apple Silicon), code-signed, notarized
- **Linux** — AppImage

**Key build features:**
- ASAR packaging with unpacked `.node` native modules
- Electron fuses for integrity validation
- `sauce4zwift://` protocol handler registration
- Docker-based Linux builds via `linux.Dockerfile`

---

## Testing

Uses **Node.js built-in test runner** (no Jest/Mocha).

```bash
npm test              # Run all tests
npm run test-debug    # Debug mode
make test-watch       # Watch mode
```

Test files:
- `test/curves.test.mjs` — Power curve calculations (34KB, most extensive)
- `test/wbal.test.mjs` — W'balance model validation
- `test/lru.test.mjs` — LRU cache correctness
- `test/stats.mjs` — Test utilities/helpers

---

## Key Design Decisions

1. **No frontend framework** — Vanilla JS with ES modules, custom elements, and Canvas API. Keeps overlay windows lightweight and fast.
2. **Protobuf for Zwift protocol** — Matches Zwift's own binary wire format for efficient data exchange.
3. **SQLite with WAL** — Fast local caching without requiring a database server.
4. **Express + WebSocket dual server** — Enables both REST API access and real-time streaming to browsers and OBS.
5. **Mod/plugin system** — Extensibility via third-party mods that can add windows and inject scripts.
6. **Headless mode** — Server-only operation for remote setups (e.g., dedicated machine running Zwift).
7. **Multi-platform Electron** — Single codebase targeting Windows, macOS, and Linux with platform-specific signing and notarization.
