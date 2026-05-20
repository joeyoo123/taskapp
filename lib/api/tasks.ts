import { and, asc, desc, eq, isNotNull, like, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  type AgentSpec,
  type NewTask,
  type Priority,
  PRIORITIES,
  type Status,
  STATUSES,
  type Task,
  tasks,
} from "../db/schema";

export function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}
export function isPriority(v: unknown): v is Priority {
  return typeof v === "string" && (PRIORITIES as readonly string[]).includes(v);
}

export type TaskFilter = {
  listId?: string;
  status?: Status;
  tag?: string;
  search?: string;
  hasAgentSpec?: boolean;
};

export type CreateTaskInput = {
  listId: string;
  title: string;
  parentTaskId?: string | null;
  description?: string;
  status?: Status;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | null;
  tags?: string[];
  agentSpec?: AgentSpec | null;
  position?: number;
};

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, "listId">> & {
  listId?: string;
};

function newId() {
  return `tk_${Math.random().toString(36).slice(2, 10)}`;
}

export function listTasks(filter: TaskFilter = {}): Task[] {
  const conds = [];
  if (filter.listId) conds.push(eq(tasks.listId, filter.listId));
  if (filter.status) conds.push(eq(tasks.status, filter.status));
  if (filter.hasAgentSpec) conds.push(isNotNull(tasks.agentSpec));
  if (filter.search) {
    const q = `%${filter.search}%`;
    conds.push(or(like(tasks.title, q), like(tasks.description, q))!);
  }
  let rows = db
    .select()
    .from(tasks)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(tasks.position), asc(tasks.createdAt))
    .all();
  if (filter.tag) {
    rows = rows.filter((r) => Array.isArray(r.tags) && r.tags.includes(filter.tag!));
  }
  return rows;
}

export function getTask(id: string): Task | undefined {
  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}

export function createTask(input: CreateTaskInput): Task {
  const lastPos = db
    .select({ p: sql<number>`COALESCE(MAX(position), 0)` })
    .from(tasks)
    .where(eq(tasks.listId, input.listId))
    .get();
  const row: NewTask = {
    id: newId(),
    listId: input.listId,
    parentTaskId: input.parentTaskId ?? null,
    title: input.title,
    description: input.description ?? "",
    status: input.status ?? "Open",
    priority: input.priority ?? "normal",
    assigneeId: input.assigneeId ?? null,
    dueDate: input.dueDate ?? null,
    tags: input.tags ?? [],
    agentSpec: input.agentSpec ?? null,
    position: input.position ?? (lastPos?.p ?? 0) + 1,
  };
  return db.insert(tasks).values(row).returning().get();
}

export function updateTask(id: string, input: UpdateTaskInput): Task | undefined {
  const patch: Partial<NewTask> = { updatedAt: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) patch.status = input.status;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.assigneeId !== undefined) patch.assigneeId = input.assigneeId;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.agentSpec !== undefined) patch.agentSpec = input.agentSpec;
  if (input.position !== undefined) patch.position = input.position;
  if (input.listId !== undefined) patch.listId = input.listId;
  if (input.parentTaskId !== undefined) patch.parentTaskId = input.parentTaskId;
  return db.update(tasks).set(patch).where(eq(tasks.id, id)).returning().get();
}

export function completeTask(id: string): Task | undefined {
  return updateTask(id, { status: "Closed" });
}

export function deleteTask(id: string): boolean {
  return db.delete(tasks).where(eq(tasks.id, id)).run().changes > 0;
}

export function getAgentQueue(): Task[] {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, "Open"), isNotNull(tasks.agentSpec)))
    .orderBy(asc(tasks.position))
    .all();
}

export function reorderTasks(orderedIds: string[]): void {
  db.transaction((tx) => {
    orderedIds.forEach((id, i) => {
      tx.update(tasks).set({ position: i + 1 }).where(eq(tasks.id, id)).run();
    });
  });
}
