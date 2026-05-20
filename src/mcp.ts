#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types";
import {
  completeTask,
  createTask,
  getAgentQueue,
  isStatus,
  listTasks,
  updateTask,
} from "./lib/tasks";
import type { Status } from "./db/schema";

const server = new Server(
  { name: "taskapp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

const tools = [
  {
    name: "list_tasks",
    description: "List tasks with optional filters.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["todo", "doing", "done", "blocked"] },
        tag: { type: "string" },
        search: { type: "string" },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a new task.",
    inputSchema: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["todo", "doing", "done", "blocked"] },
        priority: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
        dueDate: { type: "string", description: "ISO date" },
        agentSpec: {
          type: "object",
          properties: {
            tool: { type: "string" },
            inputs: { type: "object" },
            approval_required: { type: "boolean" },
            success_criteria: { type: "string" },
          },
        },
      },
    },
  },
  {
    name: "update_task",
    description: "Update fields on an existing task.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["todo", "doing", "done", "blocked"] },
        priority: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
        dueDate: { type: "string" },
        agentSpec: { type: ["object", "null"] },
      },
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as done.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "number" } },
    },
  },
  {
    name: "get_agent_queue",
    description: "List todo tasks that have an agent_spec attached.",
    inputSchema: { type: "object", properties: {} },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const a = args as Record<string, unknown>;
  try {
    switch (name) {
      case "list_tasks": {
        if (a.status !== undefined && !isStatus(a.status)) throw new Error("bad status");
        const rows = listTasks({
          status: a.status as Status | undefined,
          tag: typeof a.tag === "string" ? a.tag : undefined,
          search: typeof a.search === "string" ? a.search : undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
      }
      case "create_task": {
        if (!a.title || typeof a.title !== "string") throw new Error("title required");
        const t = createTask(a as never);
        return { content: [{ type: "text", text: JSON.stringify(t, null, 2) }] };
      }
      case "update_task": {
        const id = Number(a.id);
        if (!Number.isFinite(id)) throw new Error("id required");
        const { id: _omit, ...rest } = a;
        const t = updateTask(id, rest as never);
        if (!t) throw new Error(`no task #${id}`);
        return { content: [{ type: "text", text: JSON.stringify(t, null, 2) }] };
      }
      case "complete_task": {
        const id = Number(a.id);
        if (!Number.isFinite(id)) throw new Error("id required");
        const t = completeTask(id);
        if (!t) throw new Error(`no task #${id}`);
        return { content: [{ type: "text", text: JSON.stringify(t, null, 2) }] };
      }
      case "get_agent_queue": {
        const rows = getAgentQueue();
        return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
      }
      default:
        throw new Error(`unknown tool: ${name}`);
    }
  } catch (e) {
    return {
      isError: true,
      content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
