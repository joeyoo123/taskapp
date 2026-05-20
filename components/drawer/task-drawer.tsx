"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useStore, apiCall } from "@/lib/store";
import type { AgentSpec, Task } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AssigneePicker, DueDate, PRIORITY_COLORS, PRIORITY_LABEL, PriorityFlag,
  STATUS_COLORS, StatusPill, nextPriority,
} from "@/components/task-bits";
import { RichEditor } from "./rich-editor";
import { AgentSpecForm } from "./agent-spec-form";

export function TaskDrawer() {
  const { openTaskId, setOpenTaskId, tasks, upsertTask, removeTask, users, activeListId, loadTasks } = useStore();
  const task = tasks.find((t) => t.id === openTaskId);
  const subtasks = tasks.filter((t) => t.parentTaskId === openTaskId);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && openTaskId) setOpenTaskId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openTaskId, setOpenTaskId]);

  async function patch(p: Partial<Task>) {
    if (!task) return;
    const prev = task;
    upsertTask({ ...task, ...p } as Task);
    try {
      const updated = await apiCall<Task>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(p),
      });
      upsertTask(updated);
    } catch {
      upsertTask(prev);
      toast.error("Update failed");
    }
  }

  async function remove() {
    if (!task) return;
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await apiCall(`/api/tasks/${task.id}`, { method: "DELETE" });
      removeTask(task.id);
      setOpenTaskId(null);
    } catch {
      toast.error("Delete failed");
    }
  }

  async function addSubtask(title: string) {
    if (!task || !title.trim()) return;
    try {
      const created = await apiCall<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          listId: task.listId,
          parentTaskId: task.id,
          title: title.trim(),
        }),
      });
      upsertTask(created);
    } catch {
      toast.error("Add subtask failed");
    }
  }

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpenTaskId(null)}
          />
          <motion.aside
            key={task.id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-[520px] max-w-[95vw] bg-card border-l shadow-xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-12 border-b">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <StatusPill status={task.status} onChange={(s) => patch({ status: s })} />
                <span>#{task.id.slice(-6)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={remove} title="Delete">
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setOpenTaskId(null)} title="Close (Esc)">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="px-5 py-4">
                <DrawerTitle value={task.title} onChange={(v) => patch({ title: v })} />
              </div>

              <div className="px-5 pb-4 grid grid-cols-[120px_1fr] gap-y-2 gap-x-3 text-sm items-center">
                <Label>Status</Label>
                <div><StatusPill status={task.status} onChange={(s) => patch({ status: s })} /></div>

                <Label>Priority</Label>
                <button
                  onClick={() => patch({ priority: nextPriority(task.priority) })}
                  className="flex items-center gap-1.5 text-sm hover:bg-muted/60 rounded px-1 py-0.5 transition-colors w-fit"
                >
                  <PriorityFlag priority={task.priority} />
                  <span style={{ color: PRIORITY_COLORS[task.priority] }}>
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                </button>

                <Label>Assignee</Label>
                <div className="flex items-center gap-2">
                  <AssigneePicker users={users} assigneeId={task.assigneeId} onChange={(id) => patch({ assigneeId: id })} />
                  <span className="text-sm text-muted-foreground">
                    {users.find((u) => u.id === task.assigneeId)?.name ?? "Unassigned"}
                  </span>
                </div>

                <Label>Due date</Label>
                <DueDate date={task.dueDate} onChange={(d) => patch({ dueDate: d })} />

                <Label>Tags</Label>
                <TagEditor value={task.tags} onChange={(tags) => patch({ tags })} />
              </div>

              <div className="px-5 py-2 border-t">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Description</div>
                <RichEditor
                  value={task.description}
                  onChange={(html) => patch({ description: html })}
                />
              </div>

              <div className="px-5 py-3 border-t">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  Subtasks <span className="text-foreground/70">({subtasks.length})</span>
                </div>
                <div className="space-y-1">
                  {subtasks.map((s) => (
                    <SubtaskRow key={s.id} task={s} onToggle={(checked) =>
                      apiCall<Task>(`/api/tasks/${s.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: checked ? "Closed" : "Open" }),
                      }).then(upsertTask).catch(() => toast.error("Update failed"))
                    } />
                  ))}
                  <SubtaskAdd onAdd={addSubtask} />
                </div>
              </div>

              <div className="px-5 py-3 border-t">
                <Tabs defaultValue="agent">
                  <TabsList>
                    <TabsTrigger value="comments">Comments</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="agent">Agent Spec</TabsTrigger>
                  </TabsList>
                  <TabsContent value="comments" className="pt-3 text-sm text-muted-foreground">
                    Comments aren't wired up yet — coming soon.
                  </TabsContent>
                  <TabsContent value="activity" className="pt-3 text-sm text-muted-foreground space-y-1">
                    <div>Created · {new Date(task.createdAt).toLocaleString()}</div>
                    <div>Last update · {new Date(task.updatedAt).toLocaleString()}</div>
                  </TabsContent>
                  <TabsContent value="agent" className="pt-3">
                    <AgentSpecForm value={task.agentSpec} onChange={(v) => patch({ agentSpec: v })} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{children}</div>;
}

function DrawerTitle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onChange(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="text-2xl font-semibold w-full bg-transparent outline-none border-none placeholder:text-muted-foreground/40"
      placeholder="Task title"
    />
  );
}

function SubtaskRow({ task, onToggle }: { task: Task; onToggle: (checked: boolean) => void }) {
  const checked = task.status === "Closed";
  return (
    <div className="flex items-center gap-2 py-1">
      <Checkbox checked={checked} onCheckedChange={(v) => onToggle(!!v)} />
      <span className={checked ? "text-sm line-through text-muted-foreground" : "text-sm"}>{task.title}</span>
    </div>
  );
}

function SubtaskAdd({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [v, setV] = React.useState("");
  return (
    <div className="flex items-center gap-2 pt-1">
      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Add subtask"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(v);
            setV("");
          }
        }}
        className="text-sm bg-transparent outline-none flex-1 placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

function TagEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = React.useState(value.join(", "));
  React.useEffect(() => setText(value.join(", ")), [value]);
  return (
    <Input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const parsed = text.split(",").map((s) => s.trim()).filter(Boolean);
        if (JSON.stringify(parsed) !== JSON.stringify(value)) onChange(parsed);
      }}
      placeholder="comma-separated"
      className="h-7 text-xs"
    />
  );
}
