import { and, asc, desc, eq, isNotNull, like, or } from "drizzle-orm";
import { db } from "../db/client";
import { type AgentSpec, type NewTask, type Status, STATUSES, type Task, tasks } from "../db/schema";

export type TaskFilter = {
  status?: Status;
  tag?: string;
  search?: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: Status;
  priority?: number;
  tags?: string[];
  dueDate?: string | null;
  agentSpec?: AgentSpec | null;
};

export type UpdateTaskInput = Partial<CreateTaskInput>;

export function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

export function listTasks(filter: TaskFilter = {}): Task[] {
  const conds = [];
  if (filter.status) conds.push(eq(tasks.status, filter.status));
  if (filter.search) {
    const q = `%${filter.search}%`;
    conds.push(or(like(tasks.title, q), like(tasks.description, q))!);
  }
  let rows = db
    .select()
    .from(tasks)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(tasks.priority), asc(tasks.id))
    .all();
  if (filter.tag) {
    rows = rows.filter((r) => Array.isArray(r.tags) && r.tags.includes(filter.tag!));
  }
  return rows;
}

export function getTask(id: number): Task | undefined {
  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}

export function createTask(input: CreateTaskInput): Task {
  const row: NewTask = {
    title: input.title,
    description: input.description ?? "",
    status: input.status ?? "todo",
    priority: input.priority ?? 0,
    tags: input.tags ?? [],
    dueDate: input.dueDate ?? null,
    agentSpec: input.agentSpec ?? null,
  };
  const inserted = db.insert(tasks).values(row).returning().get();
  return inserted;
}

export function updateTask(id: number, input: UpdateTaskInput): Task | undefined {
  const patch: Partial<NewTask> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) patch.status = input.status;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
  if (input.agentSpec !== undefined) patch.agentSpec = input.agentSpec;
  if (Object.keys(patch).length === 0) return getTask(id);
  return db.update(tasks).set(patch).where(eq(tasks.id, id)).returning().get();
}

export function completeTask(id: number): Task | undefined {
  return updateTask(id, { status: "done" });
}

export function deleteTask(id: number): boolean {
  const res = db.delete(tasks).where(eq(tasks.id, id)).run();
  return res.changes > 0;
}

export function getAgentQueue(): Task[] {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, "todo"), isNotNull(tasks.agentSpec)))
    .orderBy(desc(tasks.priority), asc(tasks.id))
    .all();
}

export function reorderPriorities(orderedIds: number[]): void {
  // Highest priority = first in list. Assign descending priorities.
  db.transaction((tx) => {
    const top = orderedIds.length;
    orderedIds.forEach((id, i) => {
      tx.update(tasks).set({ priority: top - i }).where(eq(tasks.id, id)).run();
    });
  });
}
