# Task Web View

A minimalistic Next.js web view for Notion tasks with analytics and AI-powered insights.

## Project Structure

```
/
├── app/
│   ├── api/
│   │   ├── tasks/
│   │   │   ├── route.ts          # GET/POST tasks
│   │   │   └── [id]/route.ts     # PATCH/DELETE individual task
│   │   └── insights/route.ts     # Claude AI insights
│   ├── globals.css               # Tailwind CSS styles
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Main page component
├── components/
│   ├── ui/                       # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── add-task-form.tsx
│   ├── insights-panel.tsx        # Claude AI insights UI
│   ├── task-charts.tsx           # Recharts analytics
│   ├── task-item.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── claude.ts                 # Claude API integration
│   ├── notion.ts                 # Notion API integration
│   └── utils.ts                  # Utility functions
├── types/
│   └── index.ts                  # TypeScript types
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment variables - copy `.env.example` to `.env`:
   ```
   NOTION_SECRET=your_notion_integration_secret
   NOTION_DATABASE_ID=your_database_id
   CLAUDE_API_KEY=your_claude_api_key
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Features

### Task Management
- View tasks from Notion database
- Create new tasks with optional due dates
- Mark tasks as complete/incomplete
- Delete tasks (archives in Notion)
- Dark/light theme toggle
- Task metadata: due date, priority, task type
- Overdue task highlighting

### Analytics Dashboard
- Task status pie chart (completed/pending/overdue)
- Priority distribution bar chart
- Task type breakdown
- Weekly activity trends

### AI Insights (Claude)
- Productivity score (0-100)
- Personalized summary of task status
- Actionable suggestions for improvement
- Focus areas based on your task patterns

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **AI**: Claude API (Anthropic)
- **Database**: Notion API
- **Deployment**: Vercel-ready

## API Endpoints

- `GET /api/tasks` - Fetch all tasks
- `POST /api/tasks` - Create a new task
- `PATCH /api/tasks/:id` - Update task status
- `DELETE /api/tasks/:id` - Archive a task
- `GET /api/insights` - Get Claude AI insights

## Supported Notion Properties

The app auto-adapts to your database schema:

- **Title**: "Task" or "Name" property
- **Status**: Checkbox, select, or status type
- **Due Date**: "Due" or "Due Date" date property
- **Priority**: Select (High/Medium/Low)
- **Task Type**: Select (Work, UVA, Life, etc.)
