# Outreach CRM — Claude Code Project File

## Overview
A multi-user outreach CRM for tracking cold outreach to supply chain and simulation AI experts during HBS startup research. Deployed on Vercel with Supabase backend. Shared workspace — all authenticated team members see and manage the same contacts.

## Tech Stack
- **Frontend:** React (single-page app), Tailwind CSS (utility classes only), lucide-react for icons
- **Storage:** Supabase PostgreSQL. Tables: `profiles`, `contacts`, `outreach`, `writing_samples`. Row Level Security enforces auth.
- **Auth:** Supabase Magic Link (passwordless email). Profile auto-created on signup via DB trigger.
- **LLM Integration:** Anthropic Messages API (claude-sonnet-4-20250514) proxied through Vercel serverless functions (`/api/anthropic`). API key stored server-side only.
- **Runtime:** Vercel (production) + Vite dev server (local). GitHub repo at github.com/yousefaen.

## Project Structure
```
outreach-crm/
├── CLAUDE.md          # This file
├── .env               # ANTHROPIC_API_KEY=sk-ant-... (gitignored)
├── .gitignore
├── package.json
├── vite.config.js
├── index.html
├── data.json          # All persistent data (contacts, outreach, samples)
├── src/
│   ├── App.jsx        # Main app with routing/navigation
│   ├── components/
│   │   ├── Dashboard.jsx      # Home view: stats, reminders, activity feed
│   │   ├── ContactList.jsx    # Search, filter, list contacts
│   │   ├── ContactDetail.jsx  # Full profile + outreach history
│   │   ├── ContactForm.jsx    # Add/edit contact modal
│   │   ├── OutreachLog.jsx    # Log a new outreach attempt
│   │   ├── Drafter.jsx        # Voice drafter with LLM integration
│   │   ├── Settings.jsx       # API key, writing samples management
│   │   ├── FollowUpList.jsx   # Overdue/today/upcoming reminders
│   │   └── StatusPill.jsx     # Reusable status indicator
│   ├── lib/
│   │   ├── storage.js         # Read/write data.json
│   │   ├── anthropic.js       # API call wrapper
│   │   └── utils.js           # Date helpers, search, filtering
│   └── styles/
│       └── index.css          # Tailwind imports only
```

## Data Model

### Contact
```json
{
  "id": "uuid",
  "name": "Sameer Munshi",
  "title": "EY Americas Behavioral Science and Simulation Leader",
  "company": "EY",
  "email": "sameer.munshi@ey.com",
  "linkedinUrl": "https://linkedin.com/in/...",
  "tags": ["EY", "simulation-AI", "behavioral-science"],
  "notes": "Co-authored EY-Aaru wealth management simulation study...",
  "status": "active",           // active | archived
  "followUpDate": "2026-03-23", // nullable
  "createdAt": "2026-03-16",
  "updatedAt": "2026-03-16"
}
```

### OutreachEntry
```json
{
  "id": "uuid",
  "contactId": "uuid",
  "date": "2026-03-16",
  "channel": "LinkedIn InMail",  // LinkedIn InMail | LinkedIn Message | Email
  "subject": "HBS Student Research: Your EY-Aaru simulation study",
  "messageContent": "Hey Sameer...",
  "status": "sent",              // sent | replied | follow-up-needed | no-response
  "createdAt": "2026-03-16"
}
```

### WritingSample
```json
{
  "id": "uuid",
  "label": "LinkedIn InMail — Cold outreach to EY researcher",
  "content": "Hey Sameer. I came across your EY research...",
  "createdAt": "2026-03-16"
}
```

## Key Features

### 1. Contact Management
- CRUD operations on contacts
- Search by name, company, or tag (case-insensitive, real-time)
- Filter by status (active/archived) and by tag
- Click-through to detail view with full outreach history

### 2. Outreach Tracking
- Log outreach per contact with channel, subject, content, status
- Color-coded status pills: blue=sent, green=replied, amber=follow-up-needed, gray=no-response
- Edit status inline (e.g., mark "sent" → "replied" when they respond)
- Sort by date, most recent first

### 3. Follow-up Reminders
- Dashboard section showing overdue (red), due today (yellow), upcoming 7 days (green)
- Sorted by urgency
- "Mark followed up" quick action: creates a new outreach entry and clears/resets the follow-up date
- When logging outreach with status "sent" or "follow-up-needed", auto-suggest setting a follow-up date 5-7 days out

### 4. Voice Drafter (LLM Integration)
- **Writing samples storage**: add/edit/delete samples with labels. These are sent as style context to the LLM.
- **Draft composer UI**:
  - Dropdown to select contact (auto-fills their name, title, company, notes)
  - Channel selector (LinkedIn InMail / LinkedIn Message / Email)
  - Subject line field (for InMail and Email; hidden for LinkedIn Message)
  - "Angle/context" textarea — what Yousef wants to discuss and why this person
  - "Generate Draft" button
- **API call spec**:
  - POST to `https://api.anthropic.com/v1/messages`
  - Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`, `anthropic-dangerous-direct-browser-access: true`
  - Model: `claude-sonnet-4-20250514`
  - System prompt: "You are a writing assistant. Your job is to draft outreach messages in the user's voice. Study the writing samples provided carefully — match the tone, structure, greeting style, sign-off, sentence length, and level of formality exactly. Do not add emojis. Do not be overly formal or sycophantic. The user's style is conversational, direct, uses 'Hey [Name]' as greeting, explains their interest before making the ask, and signs off with just 'Thanks'. Keep LinkedIn messages under 300 words. Keep emails under 400 words."
  - User message: includes all writing samples, the contact's info, channel, and the angle/context
  - If channel is LinkedIn InMail or Email, also generate a subject line prefixed with "HBS Student Research:"
- **Output**: editable textarea with the draft + "Copy to clipboard" button
- **Save option**: save the generated draft directly as a new outreach entry for that contact

### 5. Dashboard
- Stats cards: total contacts, outreach sent (all time + this week), replies, response rate
- Follow-up reminders (overdue + today only, with link to full list)
- Recent activity: last 10 outreach entries across all contacts

## Coding Conventions
- JavaScript, not TypeScript (Yousef's preference)
- Functional components with hooks
- No class components
- Tailwind utility classes only — no custom CSS except Tailwind imports
- Use lucide-react for all icons
- Keep components under 200 lines; extract if longer
- Use crypto.randomUUID() for IDs
- Date handling: native Date object + Intl.DateTimeFormat for display. No moment/dayjs.
- Error handling: try/catch on API calls with user-visible error messages in the UI

## Future Enhancements (not in MVP)
- CSV/JSON export of contacts and outreach history
- Bulk import contacts from LinkedIn Sales Navigator export
- Track open/reply rates per channel and per tag segment
- Template library (pre-built message templates beyond LLM generation)
- Integration with LinkedIn API for sending messages directly (requires LinkedIn partnership)
- Multi-user support if Abhishek joins the outreach effort
- Calendar integration for scheduling follow-up reminders
- Auto-detect when a follow-up is overdue and surface it as a notification

## Setup Instructions
```bash
# Clone the repo and install
npm install

# Add your Anthropic API key
echo "VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env

# Run locally
npm run dev
```

## Yousef's Voice Profile (for reference when tuning the LLM prompt)
- Opens with "Hey [Name]" — never "Hi" or "Dear"
- Conversational but not sloppy
- Name-drops companies and frameworks directly (e.g., "the Similes and Aarus of the world")
- Explains his interest/thesis before making the ask
- Specific references to the recipient's work (shows he read it)
- Bounded asks ("20 mins would be great", "happy to work around your schedule")
- Signs off with just "Thanks" — no "Best regards" or "Looking forward"
- Doesn't use "I'd love to pick your brain" or generic flattery
- Uses "2nd year MBA at HBS" not "second-year MBA student at Harvard Business School"
- Slightly editorializes ("really compelling", "would mean a lot") but sparingly
