#!/usr/bin/env node
import {
  completeTask,
  createTask,
  getAgentQueue,
  getTask,
  isStatus,
  listTasks,
  updateTask,
} from "./lib/tasks";
import type { AgentSpec, Status, Task } from "./db/schema";

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function parseTags(v: unknown): string[] | undefined {
  if (typeof v !== "string") return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseAgentSpec(v: unknown): AgentSpec | null | undefined {
  if (typeof v !== "string") return undefined;
  if (v === "" || v === "null") return null;
  try {
    const obj = JSON.parse(v);
    if (typeof obj !== "object" || obj === null) throw new Error("not an object");
    return obj as AgentSpec;
  } catch (e) {
    throw new Error(`Invalid --agent-spec JSON: ${(e as Error).message}`);
  }
}

function formatRow(t: Task): string {
  const tagStr = t.tags.length ? ` [${t.tags.join(",")}]` : "";
  const due = t.dueDate ? ` due:${t.dueDate}` : "";
  const agent = t.agentSpec ? " *agent" : "";
  return `#${t.id}  p${t.priority}  ${t.status.padEnd(7)}  ${t.title}${tagStr}${due}${agent}`;
}

function help(): void {
  console.log(`task — local task manager

Usage:
  task add <title> [--description X] [--status S] [--priority N] [--tags a,b] [--due YYYY-MM-DD] [--agent-spec '<json>']
  task list [--status S] [--tag T] [--search Q]
  task done <id>
  task edit <id> [--title ...] [--description ...] [--status ...] [--priority N] [--tags ...] [--due ...] [--agent-spec ...]
  task agent-queue
  task show <id>
  task help

Statuses: todo | doing | done | blocked
`);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseArgs(rest);

  switch (cmd) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      help();
      return;

    case "add": {
      const title = positional.join(" ").trim();
      if (!title) throw new Error("title is required");
      const status = flags.status;
      if (status !== undefined && !isStatus(status)) throw new Error(`bad status: ${status}`);
      const t = createTask({
        title,
        description: typeof flags.description === "string" ? flags.description : undefined,
        status: (status as Status | undefined) ?? undefined,
        priority: flags.priority ? Number(flags.priority) : undefined,
        tags: parseTags(flags.tags),
        dueDate: typeof flags.due === "string" ? flags.due : undefined,
        agentSpec: parseAgentSpec(flags["agent-spec"]),
      });
      console.log(`added #${t.id}: ${t.title}`);
      return;
    }

    case "list": {
      const status = flags.status;
      if (status !== undefined && !isStatus(status)) throw new Error(`bad status: ${status}`);
      const rows = listTasks({
        status: status as Status | undefined,
        tag: typeof flags.tag === "string" ? flags.tag : undefined,
        search: typeof flags.search === "string" ? flags.search : undefined,
      });
      if (rows.length === 0) console.log("(no tasks)");
      else rows.forEach((t) => console.log(formatRow(t)));
      return;
    }

    case "done": {
      const id = Number(positional[0]);
      if (!Number.isFinite(id)) throw new Error("id required");
      const t = completeTask(id);
      if (!t) throw new Error(`no task #${id}`);
      console.log(`done #${t.id}: ${t.title}`);
      return;
    }

    case "edit": {
      const id = Number(positional[0]);
      if (!Number.isFinite(id)) throw new Error("id required");
      const status = flags.status;
      if (status !== undefined && !isStatus(status)) {
        throw new Error(`bad status: ${status}`);
      }
      const t = updateTask(id, {
        title: typeof flags.title === "string" ? flags.title : undefined,
        description: typeof flags.description === "string" ? flags.description : undefined,
        status: isStatus(status) ? status : undefined,
        priority: flags.priority ? Number(flags.priority) : undefined,
        tags: parseTags(flags.tags),
        dueDate: typeof flags.due === "string" ? flags.due : undefined,
        agentSpec: parseAgentSpec(flags["agent-spec"]),
      });
      if (!t) throw new Error(`no task #${id}`);
      console.log(formatRow(t));
      return;
    }

    case "agent-queue": {
      const rows = getAgentQueue();
      if (rows.length === 0) console.log("(queue empty)");
      else rows.forEach((t) => console.log(formatRow(t)));
      return;
    }

    case "show": {
      const id = Number(positional[0]);
      const t = getTask(id);
      if (!t) throw new Error(`no task #${id}`);
      console.log(JSON.stringify(t, null, 2));
      return;
    }

    default:
      console.error(`unknown command: ${cmd}`);
      help();
      process.exit(2);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
