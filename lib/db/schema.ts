import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const STATUSES = ["Open", "In Progress", "Review", "Closed"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type AgentSpec = {
  tool: string;
  inputs: Record<string, unknown>;
  approval_required: boolean;
  success_criteria: string;
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  color: text("color").notNull(),
});

export const spaces = sqliteTable("spaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#7B68EE"),
  position: real("position").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const folders = sqliteTable("folders", {
  id: text("id").primaryKey(),
  spaceId: text("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: real("position").notNull().default(0),
});

export const lists = sqliteTable("lists", {
  id: text("id").primaryKey(),
  spaceId: text("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  folderId: text("folder_id").references(() => folders.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: real("position").notNull().default(0),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  listId: text("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
  parentTaskId: text("parent_task_id"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", { enum: STATUSES }).notNull().default("Open"),
  priority: text("priority", { enum: PRIORITIES }).notNull().default("normal"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  dueDate: text("due_date"),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  agentSpec: text("agent_spec", { mode: "json" }).$type<AgentSpec | null>(),
  position: real("position").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const favorites = sqliteTable("favorites", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["space", "folder", "list"] }).notNull(),
  refId: text("ref_id").notNull(),
  position: real("position").notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type List = typeof lists.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
