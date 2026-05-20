#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  completeTask,
  createTask,
  getAgentQueue,
  isPriority,
  isStatus,
  listTasks,
  updateTask,
} from "../lib/api/tasks";

const server = new Server(
  { name: "taskapp", version: "0.2.0" },
  { capabilities: { tools: {} } },
);

const tools = [
  {
    name: "list_tasks",
    description: "List tasks. Filter by status, list, tag, or whether they have an agent_spec.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["Open", "In Progress", "Review", "Closed"] },
        list: { type: "string", description: "list id" },
        tag: { type: "string" },
        has_agent_spec: { type: "boolean" },
      },
    },
  },
  {
    name: "create_task",
    description: "Create a new task.",
    inputSchema: {
      type: "object",
      required: ["listId", "title"],
      properties: {
        listId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["Open", "In Progress", "Review", "Closed"] },
        priority: { type: "string", enum: ["urgent", "high", "normal", "low"] },
        assigneeId: { type: "string" },
        dueDate: { type: "string", description: "ISO date YYYY-MM-DD" },
        tags: { type: "array", items: { type: "string" } },
        parentTaskId: { type: "string" },
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
        id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["Open", "In Progress", "Review", "Closed"] },
        priority: { type: "string", enum: ["urgent", "high", "normal", "low"] },
        assigneeId: { type: ["string", "null"] },
        dueDate: { type: ["string", "null"] },
        tags: { type: "array", items: { type: "string" } },
        agentSpec: { type: ["object", "null"] },
      },
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as Closed.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "get_agent_queue",
    description: "List Open tasks that have a non-null agent_spec.",
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
          status: a.status as never,
          listId: typeof a.list === "string" ? a.list : undefined,
          tag: typeof a.tag === "string" ? a.tag : undefined,
          hasAgentSpec: a.has_agent_spec === true,
        });
        return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
      }
      case "create_task": {
        if (!a.title || typeof a.title !== "string") throw new Error("title required");
        if (!a.listId || typeof a.listId !== "string") throw new Error("listId required");
        if (a.status !== undefined && !isStatus(a.status)) throw new Error("bad status");
        if (a.priority !== undefined && !isPriority(a.priority)) throw new Error("bad priority");
        const t = createTask(a as never);
        return { content: [{ type: "text", text: JSON.stringify(t, null, 2) }] };
      }
      case "update_task": {
        const id = a.id;
        if (typeof id !== "string") throw new Error("id required");
        if (a.status !== undefined && !isStatus(a.status)) throw new Error("bad status");
        if (a.priority !== undefined && !isPriority(a.priority)) throw new Error("bad priority");
        const { id: _omit, ...rest } = a;
        const t = updateTask(id, rest as never);
        if (!t) throw new Error(`no task ${id}`);
        return { content: [{ type: "text", text: JSON.stringify(t, null, 2) }] };
      }
      case "complete_task": {
        const id = a.id;
        if (typeof id !== "string") throw new Error("id required");
        const t = completeTask(id);
        if (!t) throw new Error(`no task ${id}`);
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
