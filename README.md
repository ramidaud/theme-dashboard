# Theme Exploration Dashboard

A brainstorming and preparation dashboard for a university marketing team exploring how centralized marketing can serve university-wide priorities and individual college/division needs through consolidation.

## 🌐 Live Dashboard

👉 **[Open Dashboard](https://ramidaud.github.io/theme-dashboard/)**

## Getting Started

No install required — just open the live link above in any browser.

## Structure

```
├── index.html          → Overview page
├── theme.html          → Theme Breakout page (?theme=design|global|health)
├── css/styles.css      → Full design system (KSU brand-aligned)
├── js/
│   ├── app.js          → Shared: nav, data store, modals, search, settings
│   ├── overview.js     → Overview page logic
│   ├── theme.js        → Theme Breakout page logic
│   └── ai.js           → Gemini AI chat + extraction
└── data/               → JSON data files (source of truth)
```

## Data Files

All data lives in `/data/*.json`. When you edit data through the dashboard UI, changes are saved to your browser's `localStorage`. The original JSON files remain unchanged.

- **To reset live edits:** Settings (⚙️) → Reset All Data
- **To update seed data:** Edit the JSON files directly — they're plain JSON

| File                  | Contents                                                  |
| --------------------- | --------------------------------------------------------- |
| `themes.json`         | Theme metadata, facilitators, participants, stakeholders  |
| `meetings.json`       | Upcoming meetings across all themes                       |
| `cross-patterns.json` | Cross-theme observations                                  |
| `unknowns.json`       | Leadership-dependent questions                            |
| `cross-tasks.json`    | Tasks spanning multiple themes                            |
| `design.json`         | Design theme: exploration log, meeting notes, tasks, recs |
| `global.json`         | Global/Honors theme data                                  |
| `health.json`         | Health theme data                                         |

## AI Features

The dashboard includes Gemini AI integration for:

- **AI Chat** — Ask questions about your theme data (meeting notes, tasks, exploration items)
- **Extract with AI** — Auto-extract action items, questions, goals, and decisions from meeting notes

### Setup

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Click ⚙️ in the navigation bar
3. Paste your API key — it's stored only in your browser's localStorage

## Features

- **Overview Dashboard** — Theme status cards, upcoming meetings, cross-theme patterns, unknowns, emerging tasks
- **Theme Breakout Pages** — People, Exploration Log, Meeting Notes, Tasks, Recommendations, freeform Notes
- **Global Search** — ⌘K to search across all themes
- **Dark Mode** — Toggle via 🌙 in the nav bar
- **Markdown Export** — Download any theme's complete data as a `.md` file
- **Inline Editing** — Status dropdowns, add/remove people, auto-saving notes
