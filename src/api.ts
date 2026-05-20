import { Hono } from "hono";
import {
  createTask,
  deleteTask,
  getAgentQueue,
  getTask,
  isStatus,
  listTasks,
  reorderPriorities,
  updateTask,
} from "./lib/tasks";
import type { Status } from "./db/schema";

export const api = new Hono().basePath("/api");

api.get("/tasks", (c) => {
  const status = c.req.query("status");
  const tag = c.req.query("tag");
  const search = c.req.query("search");
  if (status && !isStatus(status)) return c.json({ error: "bad status" }, 400);
  return c.json(
    listTasks({
      status: status as Status | undefined,
      tag: tag ?? undefined,
      search: search ?? undefined,
    }),
  );
});

api.get("/tasks/agent-queue", (c) => c.json(getAgentQueue()));

api.get("/tasks/:id", (c) => {
  const id = Number(c.req.param("id"));
  const t = getTask(id);
  if (!t) return c.json({ error: "not found" }, 404);
  return c.json(t);
});

api.post("/tasks", async (c) => {
  const body = await c.req.json();
  if (!body?.title) return c.json({ error: "title required" }, 400);
  if (body.status !== undefined && !isStatus(body.status)) return c.json({ error: "bad status" }, 400);
  const t = createTask(body);
  return c.json(t, 201);
});

api.patch("/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  if (body.status !== undefined && !isStatus(body.status)) return c.json({ error: "bad status" }, 400);
  const t = updateTask(id, body);
  if (!t) return c.json({ error: "not found" }, 404);
  return c.json(t);
});

api.delete("/tasks/:id", (c) => {
  const id = Number(c.req.param("id"));
  return c.json({ ok: deleteTask(id) });
});

api.post("/tasks/reorder", async (c) => {
  const body = await c.req.json();
  if (!Array.isArray(body?.ids)) return c.json({ error: "ids[] required" }, 400);
  reorderPriorities(body.ids.map((n: unknown) => Number(n)));
  return c.json({ ok: true });
});
