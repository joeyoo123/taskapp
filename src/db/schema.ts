import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const STATUSES = ["todo", "doing", "done", "blocked"] as const;
export type Status = (typeof STATUSES)[number];

export type AgentSpec = {
  tool: string;
  inputs: Record<string, unknown>;
  approval_required: boolean;
  success_criteria: string;
};

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: STATUSES }).notNull().default("todo"),
  priority: integer("priority").notNull().default(0),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  agentSpec: text("agent_spec", { mode: "json" }).$type<AgentSpec | null>(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
