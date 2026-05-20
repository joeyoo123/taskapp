# taskapp

A local task management system: SQLite storage, CLI, minimal Next.js web UI, and an MCP (stdio) server. TypeScript + Drizzle + Hono.

## Schema

`tasks(id, title, description, status, priority, tags, due_date, created_at, agent_spec)`

- `status`: `todo | doing | done | blocked`
- `agent_spec` (optional JSON): `{ tool, inputs, approval_required, success_criteria }` — describes how an AI agent should execute the task.

The DB file is `./tasks.db` by default. Override with `TASKAPP_DB=/path/to.db`.

## Install

```sh
npm install
```

The schema is created automatically on first DB open. You can also run:

```sh
npm run db:migrate
```

## CLI

```sh
npm run cli -- add "Write docs" --description "..." --priority 5 --tags docs,writing --due 2026-06-01
npm run cli -- add "Run nightly build" --agent-spec '{"tool":"shell","inputs":{"cmd":"npm test"},"approval_required":true,"success_criteria":"exit code 0"}'
npm run cli -- list
npm run cli -- list --status todo --tag docs
npm run cli -- edit 3 --status doing --priority 10
npm run cli -- done 3
npm run cli -- agent-queue
npm run cli -- show 3
```

To install as `task` globally: `npm link` after building (`tsc` not used here — use `tsx` directly or wrap with your packager of choice).

## Web UI

```sh
npm run dev
# open http://localhost:3000
```

Features: list view, status/tag/search filters, click-to-edit modal, drag rows to reorder priority.

## API (Hono, mounted at `/api`)

- `GET    /api/tasks?status=&tag=&search=`
- `GET    /api/tasks/agent-queue`
- `GET    /api/tasks/:id`
- `POST   /api/tasks`        body: `{ title, description?, status?, priority?, tags?, dueDate?, agentSpec? }`
- `PATCH  /api/tasks/:id`    body: any subset of the above
- `DELETE /api/tasks/:id`
- `POST   /api/tasks/reorder` body: `{ ids: number[] }` — top of list = highest priority

## MCP server

Stdio server exposing: `list_tasks`, `create_task`, `update_task`, `complete_task`, `get_agent_queue`.

```sh
npm run mcp
```

### Add to Claude Code

Use the Claude Code CLI:

```sh
claude mcp add taskapp -- npx -y tsx /absolute/path/to/taskapp/src/mcp.ts
```

Or edit `~/.claude.json` / `~/.config/claude/mcp.json` (depending on platform) and add:

```json
{
  "mcpServers": {
    "taskapp": {
      "command": "npx",
      "args": ["-y", "tsx", "/absolute/path/to/taskapp/src/mcp.ts"],
      "env": { "TASKAPP_DB": "/absolute/path/to/taskapp/tasks.db" }
    }
  }
}
```

Restart Claude Code. Then ask it things like "list my tasks" or "queue an agent task to run the test suite tonight" and the model will call the tools.

## Layout

```
src/
  db/{schema,client,migrate}.ts   drizzle schema + SQLite client
  lib/tasks.ts                    shared task ops (CLI/API/MCP)
  cli.ts                          CLI entry
  api.ts                          Hono routes
  mcp.ts                          MCP stdio server
app/
  layout.tsx, page.tsx, globals.css
  api/[[...route]]/route.ts       mounts Hono inside Next.js
```
