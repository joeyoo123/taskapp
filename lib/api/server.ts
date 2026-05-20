import { Hono } from "hono";
import {
  completeTask,
  createTask,
  deleteTask,
  getAgentQueue,
  getTask,
  isPriority,
  isStatus,
  listTasks,
  reorderTasks,
  updateTask,
} from "./tasks";
import { listFavorites, listFolders, listLists, listSpaces, listUsers } from "./hierarchy";

export const api = new Hono().basePath("/api");

api.get("/bootstrap", (c) =>
  c.json({
    users: listUsers(),
    spaces: listSpaces(),
    folders: listFolders(),
    lists: listLists(),
    favorites: listFavorites(),
  }),
);

api.get("/tasks", (c) => {
  const listId = c.req.query("list") ?? undefined;
  const status = c.req.query("status") ?? undefined;
  const tag = c.req.query("tag") ?? undefined;
  const search = c.req.query("search") ?? undefined;
  const hasAgentSpec = c.req.query("has_agent_spec") === "true";
  if (status && !isStatus(status)) return c.json({ error: "bad status" }, 400);
  return c.json(
    listTasks({
      listId,
      status: status as never,
      tag,
      search,
      hasAgentSpec: hasAgentSpec || undefined,
    }),
  );
});

api.get("/tasks/agent-queue", (c) => c.json(getAgentQueue()));

api.get("/tasks/:id", (c) => {
  const t = getTask(c.req.param("id"));
  if (!t) return c.json({ error: "not found" }, 404);
  return c.json(t);
});

api.post("/tasks", async (c) => {
  const body = await c.req.json();
  if (!body?.title || !body?.listId) return c.json({ error: "title and listId required" }, 400);
  if (body.status !== undefined && !isStatus(body.status)) return c.json({ error: "bad status" }, 400);
  if (body.priority !== undefined && !isPriority(body.priority)) return c.json({ error: "bad priority" }, 400);
  return c.json(createTask(body), 201);
});

api.patch("/tasks/:id", async (c) => {
  const body = await c.req.json();
  if (body.status !== undefined && !isStatus(body.status)) return c.json({ error: "bad status" }, 400);
  if (body.priority !== undefined && !isPriority(body.priority)) return c.json({ error: "bad priority" }, 400);
  const t = updateTask(c.req.param("id"), body);
  if (!t) return c.json({ error: "not found" }, 404);
  return c.json(t);
});

api.post("/tasks/:id/complete", (c) => {
  const t = completeTask(c.req.param("id"));
  if (!t) return c.json({ error: "not found" }, 404);
  return c.json(t);
});

api.delete("/tasks/:id", (c) => c.json({ ok: deleteTask(c.req.param("id")) }));

api.post("/tasks/reorder", async (c) => {
  const body = await c.req.json();
  if (!Array.isArray(body?.ids)) return c.json({ error: "ids[] required" }, 400);
  reorderTasks(body.ids);
  return c.json({ ok: true });
});
