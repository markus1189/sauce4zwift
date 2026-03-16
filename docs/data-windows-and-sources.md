# Data Windows and Data Sources

Sauce for Zwift provides real-time overlay windows that display cycling and running
metrics during Zwift sessions. This document covers the available window types,
the data sources (fields) they can display, and how they are configured.

---

## Data Windows

Data windows are Electron `BrowserWindow` instances that render HTML pages from
`/pages/` and subscribe to real-time athlete data. They are declared in
`src/window-manifests.json` and managed by `src/windows.mjs`.

Windows are organized into **Profiles** that can be saved, loaded, and switched
between. Each window instance stores its own settings in a `SettingsStore`
backed by `localStorage`.

### Window Types

| Type | Name | Description | Overlay |
|------|------|-------------|---------|
| `overview` | Overview | Main top window for overall control and stats | Yes (private) |
| `watching` | Grid (Currently Watching) | Grid window for stats of the athlete being watched | Yes |
| `groups` | Groups | Zoomable view of groups of athletes | Yes |
| `geo` | Map | Interactive course map and elevation profile | Yes |
| `chat` | Chat | Chat dialog from nearby athletes | Yes |
| `nearby` | Nearby Athletes | Sortable data table of nearby athletes | No |
| `analysis` | Analysis | Post-ride session analysis (laps, segments, stats) | No |
| `athletes` | Athletes | View, find and manage athletes | No |
| `events` | Events | Event listings and entrant information | No |
| `game-control` | Game Control | Control game actions (view, shouting, HUD toggle) | Yes |
| `segments` | Segments | View recent segment results | Yes |
| `browser-source` | Browser Source | Embed a custom website in a window | Yes |

#### Gauge Windows

Gauges are single-metric displays with a car-style dial visualization.

| Type | Name | Description |
|------|------|-------------|
| `power-gauge` | Power Gauge | Power output in watts |
| `hr-gauge` | Heart Rate Gauge | Heart rate in bpm |
| `draft-gauge` | Draft Gauge | Drafting power reduction (%) |
| `pace-gauge` | Speed Gauge | Speed or pace |
| `cadence-gauge` | Cadence Gauge | Cadence (rpm/spm) |
| `wbal-gauge` | W'bal Gauge | W' balance remaining |

#### Misc Windows

| Type | Name | Description |
|------|------|-------------|
| `stats-for-nerds` | Stats for Nerds | Debug info (cpu/mem) about Sauce |
| `logs` | Debug Logs | Internal logs for debugging and support |

---

## Data Sources (Fields)

Data sources are the individual metrics that can be displayed in data windows.
They are defined in `pages/src/fields.mjs`. Each field has an immutable `id`
(used for persisting user configuration across updates), a `group` for
categorization, display names, a value extractor (`get`/`format`), and optional
units (`suffix`).

### Field Groups

Fields are organized into the following groups (defined in `fieldGroupNames`):

- **Time** — Duration and timing metrics
- **Power** — Wattage, W/kg, normalized power, peaks, and energy
- **Speed** — Speed/pace (sport-aware: km/h for cycling, min/km for running)
- **Heart Rate** — HR current, averages, smoothed, and efficiency factor
- **Draft** — Drafting power savings
- **Cadence** — RPM (cycling) or SPM (running)
- **Course** — Event/route progress, distance, elevation, grade, segments
- **Athlete** — Name, team, level, weight, FTP
- **System** — CPU state (debugging)

### Time Fields

| ID | Name | Description |
|----|------|-------------|
| `time-active` | Active Time | Sauce-calculated active time |
| `time-elapsed` | Elapsed Time | Sauce-calculated elapsed time |
| `time-session` | Session Time | Time from the current Zwift session |
| `time-gap` | Gap Time | Time gap to watched athlete |
| `time-gap-distance` | Gap Distance | Distance gap to watched athlete |
| `clock` | Clock | Current wall clock time |
| `time-coffee` | Coffee Time | Time spent on a coffee break |
| `time-solo` | Solo Time | Time riding alone |
| `time-follow` | Following Time | Time sitting-in/following in a group |
| `time-work` | Working Time | Time working/pulling in a group |
| `time-pack-graph` | Pack Time Graph | Stacked bar of solo/following/working time |
| `time-lap` | Time (lap) | Active time for the current lap |
| `time-coffee-lap` | Coffee Time (lap) | Coffee time for the current lap |
| `time-solo-lap` | Solo Time (lap) | Solo time for the current lap |
| `time-follow-lap` | Following Time (lap) | Following time for the current lap |
| `time-work-lap` | Working Time (lap) | Working time for the current lap |
| `time-pack-graph-lap` | Pack Time Graph (lap) | Pack time graph for the current lap |

### Power Fields

| ID | Name | Suffix | Description |
|----|------|--------|-------------|
| `pwr-cur` | Current Power | w | Instantaneous power |
| `pwr-cur-wkg` | Current W/kg | w/kg | Instantaneous watts per kilogram |
| `pwr-avg` | Average Power | w | Session average power |
| `pwr-avg-wkg` | Average W/kg | w/kg | Session average W/kg |
| `pwr-smooth-{5,15,60,300,1200}` | Smoothed Power | w | Rolling average over 5s, 15s, 1min, 5min, 20min |
| `pwr-smooth-{...}-wkg` | Smoothed W/kg | w/kg | Smoothed power as W/kg |
| `energy` | Energy | kJ | Total energy (kilojoules) |
| `energy-solo` | Solo Energy | kJ | Energy while riding alone |
| `energy-follow` | Following Energy | kJ | Energy while following in a group |
| `energy-work` | Working Energy | kJ | Energy while pulling in a group |
| `power-avg-solo` | Solo Average Power | w | Avg power while riding alone |
| `power-avg-follow` | Following Average Power | w | Avg power while following |
| `power-avg-work` | Working Average Power | w | Avg power while pulling |
| `wbal` | W'bal | kJ | W' balance (Skiba model) |
| `tss` | TSS | | Training Stress Score |
| `pwr-np` | NP | | Normalized Power |
| `pwr-if` | IF | | Intensity Factor (NP / FTP) |
| `pwr-vi` | VI | | Variability Index (NP / avg power) |
| `pwr-max` | Max Power | w | Session maximum power |
| `pwr-peak-{5,15,60,300,1200}` | Peak Power | w | Best average over 5s, 15s, 1min, 5min, 20min |
| `pwr-peak-{...}-wkg` | Peak W/kg | w/kg | Peak power as W/kg |
| `pwr-lap` | Average Power (lap) | w | Current lap average power |
| `pwr-lap-wkg` | Average W/kg (lap) | w/kg | Current lap average W/kg |
| `energy-{solo,follow,work}-lap` | Energy (lap) | kJ | Lap energy by pack position |
| `power-avg-{solo,follow,work}-lap` | Avg Power (lap) | w | Lap avg power by pack position |
| `pwr-peak-{...}-lap-1` | Peak Power (lap) | w | Current lap peak power |

### Speed Fields

| ID | Name | Description |
|----|------|-------------|
| `spd-cur` | Speed / Pace | Current speed (cycling) or pace (running) |
| `spd-smooth-60` | Smoothed Speed (1min) | 60-second rolling average |
| `spd-avg` | Average Speed | Session average |
| `spd-lap` | Speed (lap) | Current lap average |

Units are sport-aware: km/h or mph for cycling, min/km or min/mi for running.

### Heart Rate Fields

| ID | Name | Suffix | Description |
|----|------|--------|-------------|
| `hr-cur` | HR | bpm | Current heart rate |
| `hr-avg` | HR (avg) | bpm | Session average heart rate |
| `hr-lap` | HR (lap) | bpm | Current lap average heart rate |
| `hr-smooth-60` | Smoothed HR (1min) | bpm | 60-second rolling average |
| `hr-smooth-300` | Smoothed HR (5min) | bpm | 5-minute rolling average |
| `hr-smooth-1200` | Smoothed HR (20min) | bpm | 20-minute rolling average |
| `hr-ef-300` | hrEF (5min) | | Efficiency Factor: NP / HR (5min window) |
| `hr-ef-1200` | hrEF (20min) | | Efficiency Factor: NP / HR (20min window) |

### Draft Fields

| ID | Name | Suffix | Description |
|----|------|--------|-------------|
| `draft-cur` | Draft | w | Current power savings from drafting |
| `draft-avg` | Draft (avg) | w | Session average draft savings |
| `draft-lap` | Draft (lap) | w | Current lap average draft |
| `draft-energy` | Draft (energy) | kJ | Total energy saved from drafting |

### Cadence Fields

| ID | Name | Suffix | Description |
|----|------|--------|-------------|
| `cad-cur` | Cadence | rpm/spm | Current cadence |
| `cad-avg` | Cadence (avg) | rpm/spm | Session average cadence |
| `cad-lap` | Cadence (lap) | rpm/spm | Current lap average cadence |

Units are rpm for cycling and spm (steps per minute) for running.

### Course Fields

| ID | Name | Description |
|----|------|-------------|
| `ev-place` | Place | Position in event (e.g. "3rd / 42") |
| `ev-fin` | Finish | Remaining event/route time or distance |
| `ev-dst` | Event/Route Progress | Distance or time completed vs total |
| `dst` | Distance | Total distance traveled |
| `game-laps` | Lap (zwift) | Zwift route lap number |
| `sauce-laps` | Lap (sauce) | Sauce stats lap number |
| `progress` | Progress | Route completion percentage |
| `ev-name` | Event | Current event name |
| `rt-name` | Route | Current route name (with lap count if applicable) |
| `el-gain` | Climbed | Total elevation gain |
| `el-altitude` | Altitude | Current altitude |
| `grade` | Grade | Terrain gradient as percentage |
| `segment-auto` | Segment (Auto) | Most relevant nearby segment |
| `segment-pending` | Upcoming Segment | Next upcoming segment |
| `segment-active` | Active Segment | Currently active segment |
| `segment-done` | Completed Segment | Most recently completed segment |

### Athlete Fields

| ID | Name | Description |
|----|------|-------------|
| `fullname` | Full Name | Athlete's sanitized full name |
| `flastname` | F.Last | First initial + last name |
| `team` | Team | Team name with badge |
| `level` | Level | Zwift level |
| `rideons` | Ride Ons | Ride on count |
| `weight` | Weight | Weight class (kg or lbs) |
| `ftp` | FTP | Functional Threshold Power (w) |

### System Fields

| ID | Name | Description |
|----|------|-------------|
| `system-cpu-state` | CPU State | CPU status for debugging |

---

## Data Window Sections (Watching/Grid Window)

The Watching window uses a screen/section/group layout system defined in
`pages/src/watching.mjs`. Each screen contains sections, each section contains
groups, and each group contains selectable fields.

### Section Types

| Type | Description |
|------|-------------|
| `large-data-fields` | Large-format data field display (single group) |
| `data-fields` | Standard data field display (single group) |
| `split-data-fields` | Two-column data field layout (two groups) |
| `single-data-field` | Single field display |
| `line-chart` | Time-series chart (power, HR, speed, cadence, draft, W'bal) |
| `time-in-zones` | Zone distribution chart (power or HR zones) |
| `elevation-profile` | Course elevation profile |

### Default Screen Layout

The Watching window ships with three default screens:

1. **Screen 1** — Power (current/avg/max), HR (current/avg/max), cadence + draft
2. **Screen 2** — Power (current/lap avg/lap max), HR (current/lap avg/lap max), cadence + draft (lap)
3. **Screen 3** — NP/TSS/W'bal/Energy, peak power (5s/15s/60s/5min), line chart

Users can customize every field position by long-pressing on a field to open the
field selector dropdown (organized by group).

---

## Data Flow

```
Zwift Game
    │ (Protobuf / REST API)
    ▼
ZwiftAPI (src/zwift.mjs)
    │
    ▼
StatsProcessor (src/stats.mjs)
    │  Calculates NP, TSS, W'bal, peaks, smoothed values, pack position, etc.
    │
    ├──→ Electron IPC ──→ Renderer Windows (pages/src/*.mjs)
    └──→ WebSocket/HTTP ──→ External Clients (OBS, browsers)
                                │
                                ▼
                    Renderer.setData() → render()
                                │
                                ▼
                    DOM updated with formatted field values
```

**Key events:**
- `athlete/watching` — Real-time data for the currently watched athlete
- `athlete/nearby` — Data for nearby athletes (used by Nearby Athletes window)
- `athlete/group` — Group membership changes

---

## Field Specification Format

Each field in `pages/src/fields.mjs` follows this structure:

```javascript
{
    id: 'immutable-permanent-ident',    // Never change — used for persistent settings
    group: 'grouping-ident',            // 'power', 'hr', 'speed', etc.
    longName: string | function,        // Full name for spacious layouts
    shortName: string | function,       // Compact name
    miniName: string | function,        // Minimal name (table headers)
    tooltip: string | function,         // Help text
    label: string | function | array,   // Contextual label (large data fields)
    get: athleteData => any,            // Value extractor (overrides format argument)
    format: (value, {suffix}) => string,// Display formatter
    suffix: string | function,          // Units (w, bpm, km/h, etc.)
}
```

**Important:** Field `id` values are immutable. They are stored in user settings
and must remain stable across software updates. Use the `version` property for
field migration when needed.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/window-manifests.json` | Window type declarations (dimensions, options) |
| `src/windows.mjs` | Window lifecycle management, Profile system |
| `pages/src/fields.mjs` | All data field definitions (~1130 lines) |
| `pages/src/watching.mjs` | Screen/section specs, default layouts |
| `pages/src/common.mjs` | SettingsStore, Renderer, event subscriptions |
| `pages/src/gauge.mjs` | Gauge window rendering |
| `pages/src/nearby.mjs` | Nearby Athletes table columns |
| `pages/src/overview.mjs` | Overview/control panel |
| `pages/*.html` | Window HTML templates |
