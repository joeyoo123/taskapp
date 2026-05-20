# taskapp

A ClickUp-style local task manager. Three-pane layout, dense list view, board view, slide-in detail drawer, MCP server.

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn-style primitives on Radix, Drizzle ORM + SQLite (better-sqlite3), Zustand, dnd-kit, Tiptap, Framer Motion, Lucide, Sonner, date-fns, Hono (API), `@modelcontextprotocol/sdk` (MCP stdio).

## Run locally

```sh
npm install
npm run dev
# open http://localhost:3000
```

The DB (`./tasks.db`) is auto-bootstrapped on first request, and a seed of two spaces / one folder / five lists / ~15 tasks runs the first time so the UI isn't empty.

Override the DB path with `TASKAPP_DB=/abs/path.db` so the web UI and MCP server share one store.

## Keyboard shortcuts

- `c` — create a task in the active list (opens the drawer)
- `/` — focus the search box
- `Esc` — close the drawer

## Schema

`spaces → folders → lists → tasks` (folders are optional). Tasks fields:

`id, list_id, parent_task_id, title, description, status, priority, assignee_id, due_date, tags, agent_spec, position, created_at, updated_at`

- `status`: `Open | In Progress | Review | Closed`
- `priority`: `urgent | high | normal | low`
- `agent_spec` (nullable JSON): `{ tool, inputs, approval_required, success_criteria }`

## MCP server

Stdio server in `mcp-server/index.ts`. Tools: `list_tasks`, `create_task`, `update_task`, `complete_task`, `get_agent_queue`.

### Add to Claude Code

```sh
claude mcp add taskapp -- npx -y tsx /absolute/path/to/taskapp/mcp-server/index.ts
```

Or edit `~/.claude.json`:

```json
{
  "mcpServers": {
    "taskapp": {
      "command": "npx",
      "args": ["-y", "tsx", "/absolute/path/to/taskapp/mcp-server/index.ts"],
      "env": { "TASKAPP_DB": "/absolute/path/to/taskapp/tasks.db" }
    }
  }
}
```

Restart Claude Code, run `/mcp`, confirm the five tools appear.

## Layout

```
app/                            Next.js app router
  layout.tsx, page.tsx, globals.css
  api/[[...route]]/route.ts     mounts Hono inside Next.js
components/
  layout/{sidebar,topbar}.tsx   3-pane shell
  list-view/list-view.tsx       table, grouped by status, inline editing, dnd
  board-view/board.tsx          kanban with cross-column dnd
  drawer/                       detail drawer (Tiptap + agent spec form)
  ui/                           Radix-backed primitives
  task-bits.tsx                 priority flag, status pill, assignee picker, due date
lib/
  db/{schema,client,seed}.ts    Drizzle + SQLite + idempotent seed
  api/{tasks,hierarchy,server}.ts  shared ops + Hono routes
  store.ts                      Zustand
  utils.ts                      cn()
mcp-server/index.ts             stdio MCP server
```
