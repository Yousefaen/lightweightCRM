# Outreach CRM — Project Reference

## Purpose & Vision

This CRM exists to power **customer discovery** for startup idea validation. The core problem: finding the right people to talk to, reaching them effectively, and keeping track of what happened.

Yousef is a 2nd year MBA at HBS researching supply chain and simulation AI. The outreach targets are practitioners, researchers, and executives in these spaces — people at companies like EY, Gartner, McKinsey, and simulation-focused startups (Similes, Aaru, etc.). The goal is to validate pain points, test hypotheses, and build a network of domain experts who can inform a startup thesis.

This is a personal tool, not a SaaS product. It's optimized for one user managing 50–200 contacts with LinkedIn and email outreach. Everything runs locally — no backend, no deployment, no database. The AI integrations are the differentiator: instead of just tracking contacts, the CRM actively helps research leads, write personalized messages, and surface what to do next.

---

## What's Been Built

### Contact Management
- Full CRUD for contacts (name, title, company, email, LinkedIn URL, tags, notes, status)
- Real-time search across name, company, and tags (case-insensitive)
- Filter by status (active/archived) and by tag
- Click-through detail view with full outreach history per contact
- Modal-based add/edit form

### Outreach Tracking
- Log outreach per contact: date, channel (LinkedIn InMail / LinkedIn Message / Email), subject, message content, status
- Four statuses with color-coded pills: sent (blue), replied (green), follow-up-needed (amber), no-response (gray)
- Click-to-cycle status directly on outreach entries (e.g., mark "sent" → "replied")
- Sorted by date, most recent first

### Follow-up Management
- Three urgency tiers: overdue (red), due today (amber), upcoming 7 days (green)
- Dashboard surfaces overdue and today's reminders; dedicated view shows all tiers
- "Mark followed up" quick action: creates a new outreach entry and resets the follow-up date
- Auto-suggests follow-up dates 5–7 days out when logging outreach with status "sent" or "follow-up-needed"

### Message Drafting (LLM-Powered)
- Writing samples storage — add, view, and delete samples with labels that teach the LLM Yousef's voice
- Draft composer with contact selector (auto-fills name, title, company, notes), channel selector, and angle/context input
- Shows prior outreach context: message count, last send date/channel/status, or "first-touch" badge
- Sends prior outreach history to the LLM so follow-ups reference earlier messages
- Editable output with copy-to-clipboard and save-as-outreach buttons
- Generates subject lines for InMail and Email (prefixed with "HBS Student Research:")

### Prospecting Pipeline
Three-stage async generator pipeline: **Research → Enrich → Draft**

1. **Research** — Claude Opus searches the web for people matching a query (e.g., "supply chain AI leaders at consulting firms"). Extracts structured lead profiles, deduplicates against existing contacts.
2. **Enrich** — Claude Sonnet searches for each lead's LinkedIn URL, email, and recent publications. Falls back to Hunter.io email finder if web search doesn't surface an email. Runs up to 2 enrichments concurrently.
3. **Draft** — Generates personalized outreach for each lead across selected channels using the same voice-matched drafter.

UI includes: query input, lead count selector (3/5/10), channel toggles, progress log with stage indicators, and LeadCard results with save-to-CRM and save-as-outreach buttons.

### AI Copilot
Fixed right-sidebar chat panel with persistent message history. Acts as a strategic thinking partner with full CRM context.

- Sees all contacts, outreach history, response rates, follow-up dates, and writing samples
- Persistent memory system — research findings and strategic notes survive across sessions (stored in localStorage)
- Web search capability for live research
- Proactive behaviors: flags overdue follow-ups, suggests channel switches when one isn't working, recommends archiving after 3+ unanswered touches
- Can suggest new contacts to save directly to the CRM via structured `[SAVE_CONTACT]` blocks
- Shows model indicator (Opus or Sonnet fallback) and memory count in header
- Context-aware: when viewing a specific contact, includes that context in the conversation

### Dashboard
- Stats cards: total contacts, outreach this week, replies received, response rate (%)
- Follow-up reminders section (overdue + today, with link to full list)
- Recent activity feed: last 10 outreach entries across all contacts with contact name, channel icon, status pill, and date

### MCP Server
External tool access via Model Context Protocol (stdio transport) with 12 tools:
- Contact CRUD: `list_contacts`, `get_contact`, `add_contact`, `update_contact`, `delete_contact`
- Outreach: `list_outreach`, `log_outreach`, `update_outreach_status`
- Follow-ups: `get_follow_ups`
- Writing samples: `list_writing_samples`

---

## AI Stack

### Models

| Model | ID | Used For |
|-------|----|----------|
| Claude Opus 4 | `claude-opus-4-20250514` | Copilot chat, prospector research stage — tasks requiring deep reasoning and web search |
| Claude Sonnet 4 | `claude-sonnet-4-20250514` | Message drafting, prospector enrichment/draft stages — fast generation with voice matching |

Opus is the primary model for the copilot and prospector research. Sonnet is used for drafting (where speed matters more than depth) and as a fallback when Opus returns 529 (overloaded).

### Tools

| Tool | Provider | Usage |
|------|----------|-------|
| `web_search_20250305` | Anthropic (native) | Copilot (10 uses/request), prospector research (10 uses), prospector enrichment (5 uses) |
| Hunter.io Email Finder | hunter.io API | Prospector enrichment fallback — finds professional emails by name + company domain |

Hunter.io calls are proxied through a Vite dev server plugin (`/api/hunter` → `https://api.hunter.io/v2/email-finder`) to avoid CORS issues.

### API Patterns

**Endpoint**: `https://api.anthropic.com/v1/messages` (direct browser access)

**Headers**:
- `x-api-key` — from `.env` (build time) or localStorage (runtime)
- `anthropic-version: 2023-06-01`
- `content-type: application/json`
- `anthropic-dangerous-direct-browser-access: true`

**Retry & Fallback Logic**:
- **Copilot**: Try Opus → if 529, wait 2s and retry Opus → if still 529, fall back to Sonnet
- **Prospector**: Try preferred model → if 529/429, wait 3s and retry → if still failing and using Opus, fall back to Sonnet; otherwise throw
- **Drafter**: Simple try/catch, no automatic retry
- **Concurrency**: Prospector enrichment limited to 2 concurrent calls; all prospector calls support AbortController cancellation

**Max Tokens**: 1024 (drafter), 4096 (copilot, prospector)

### Prompt Architecture

**Voice Profile** (embedded in drafter and copilot system prompts):
- "Hey [Name]" greeting — never "Hi" or "Dear"
- Conversational but not sloppy
- Name-drops companies and frameworks directly
- Explains interest/thesis before making the ask
- Specific references to recipient's work
- Bounded asks ("20 mins would be great")
- Signs off with "Thanks" — no "Best regards"
- Uses "2nd year MBA at HBS"

**SDR Best Practices** (embedded in drafter and copilot system prompts):
- AIDA framework: Attention (hook with their work) → Interest (your thesis) → Desire (what they gain) → Action (bounded ask)
- Personalization over volume
- Channel-specific word limits: LinkedIn under 300 words, Email under 400 words
- Follow-up cadence: 5–7 days for LinkedIn, 3–5 days for email
- Multi-channel escalation after 2 unanswered touches
- Each follow-up must add new value — never just "bumping this up"
- Archive or send breakup message after 3+ unanswered touches

**Copilot Identity**: Instructed to act as "an elite SDR + chief of staff" — proactively analyzes the CRM, suggests actions, and surfaces patterns in outreach data.

**Memory System**: Copilot saves research findings and strategic notes via `[MEMORY]` blocks parsed from responses, persisted in localStorage.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.2.4 |
| Styling | Tailwind CSS | 4.2.1 (via @tailwindcss/vite plugin) |
| Build | Vite | 7.x (with @vitejs/plugin-react 4.7.0) |
| Icons | lucide-react | 0.577.0 |
| Validation | Zod | 4.3.6 (MCP server schemas) |
| MCP | @modelcontextprotocol/sdk | 1.27.1 |
| Persistence | localStorage | Seeded from `data.json` on first load |
| API Keys | `.env` + localStorage | ANTHROPIC_API_KEY, optional Hunter.io key |

No backend. No database. No deployment. Everything runs on `npm run dev`.

---

## File Map

```
outreach-crm/
├── CLAUDE.md              # AI coding instructions
├── PROJECT.md             # This document
├── .env                   # VITE_ANTHROPIC_API_KEY (gitignored)
├── .gitignore
├── package.json
├── vite.config.js         # Vite 7 + React plugin + Tailwind v4 + Hunter.io proxy + data API
├── index.html             # Entry point
├── data.json              # Seed data (contacts, outreach, writing samples)
├── mcp-server.js          # MCP server with 12 CRM tools (stdio transport)
│
├── src/
│   ├── App.jsx            # Root component: state management, navigation, modal control
│   │
│   ├── components/
│   │   ├── Dashboard.jsx      # Stats cards, follow-up reminders, activity feed
│   │   ├── ContactList.jsx    # Search, filter, list contacts
│   │   ├── ContactDetail.jsx  # Full profile + outreach history + status cycling
│   │   ├── ContactForm.jsx    # Add/edit contact modal
│   │   ├── OutreachLog.jsx    # Log outreach modal with follow-up auto-suggest
│   │   ├── Drafter.jsx        # Voice-matched message drafting with LLM
│   │   ├── Prospector.jsx     # 3-stage lead pipeline UI (research → enrich → draft)
│   │   ├── LeadCard.jsx       # Individual lead result card with save actions
│   │   ├── CopilotPanel.jsx   # AI chat sidebar with memory and web search
│   │   ├── CopilotMessage.jsx # Message bubble with citation and contact rendering
│   │   ├── FollowUpList.jsx   # Full follow-up view (overdue / today / upcoming)
│   │   ├── Settings.jsx       # API keys + writing samples management
│   │   └── StatusPill.jsx     # Color-coded status badge (click-to-cycle)
│   │
│   ├── lib/
│   │   ├── anthropic.js       # Draft generation (Sonnet) with voice profile + AIDA prompt
│   │   ├── copilot.js         # Copilot logic (Opus→Sonnet fallback, web search, memory)
│   │   ├── prospector.js      # 3-stage pipeline (Opus research, Sonnet enrich/draft, Hunter.io)
│   │   ├── storage.js         # localStorage + file API persistence
│   │   └── utils.js           # Date helpers, search, filtering, tag extraction
│   │
│   └── styles/
│       └── index.css          # Tailwind v4 imports (@import "tailwindcss")
```
