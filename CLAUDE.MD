# Task Web View

A minimalistic web view for Notion tasks with a clean, modern interface.

## Project Structure

```
/
├── public/
│   ├── index.html        # Main HTML file
│   ├── css/
│   │   └── styles.css    # Minimalistic styling with dark mode support
│   └── js/
│       └── app.js        # Frontend application logic
├── server/
│   └── server.js         # Express backend (Notion API proxy)
├── scripts/
│   └── find-databases.js # Utility to discover Notion databases
├── package.json
├── .env                  # Environment variables (not committed)
├── .env.example          # Example environment file
└── .gitignore
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a Notion integration at https://www.notion.so/my-integrations

3. Share your Notion database with the integration:
   - Open your tasks database in Notion
   - Click "..." → "Add connections" → Select your integration

4. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   NOTION_SECRET=your_notion_integration_secret
   NOTION_DATABASE_ID=your_database_id
   ```

5. Run the database finder to get your database ID:
   ```bash
   node scripts/find-databases.js
   ```

6. Start the server:
   ```bash
   npm start
   ```

7. Open http://localhost:3000 in your browser

## Features

- View tasks from Notion database
- Create new tasks with optional due dates
- Mark tasks as complete/incomplete
- Delete tasks (archives in Notion)
- Dark/light theme toggle
- Shows task metadata: due date, priority, task type
- Overdue task highlighting
- Minimalistic, responsive design

## Supported Database Properties

The app automatically adapts to your Notion database schema:

- **Title**: Task name (supports "Task" or "Name" property)
- **Status**: Checkbox, select, or status property
- **Due Date**: Date property ("Due" or "Due Date")
- **Priority**: Select property with High/Medium/Low options
- **Task Type**: Select property (Work, UVA, Life, etc.)

## API Endpoints

- `GET /api/tasks` - Fetch all tasks
- `POST /api/tasks` - Create a new task
- `PATCH /api/tasks/:id` - Update task status
- `DELETE /api/tasks/:id` - Archive a task
- `GET /api/schema` - Get database schema

## Development

- **Backend**: Node.js with Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **API**: Notion API (@notionhq/client)
- **Styling**: CSS variables for theming, Inter font
