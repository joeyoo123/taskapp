"use client";
import * as React from "react";
import {
  DndContext, PointerSensor, closestCorners, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useStore, apiCall } from "@/lib/store";
import { STATUSES, type Status, type Task } from "@/lib/db/schema";
import {
  AssigneePicker, DueDate, PriorityFlag, STATUS_COLORS, nextPriority,
} from "@/components/task-bits";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function BoardView() {
  const { tasks, setTasks, upsertTask, activeListId } = useStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const byStatus = React.useMemo(() => {
    const out: Record<Status, Task[]> = { Open: [], "In Progress": [], Review: [], Closed: [] };
    for (const t of tasks) if (!t.parentTaskId) out[t.status].push(t);
    return out;
  }, [tasks]);

  function findContainer(id: string): Status | null {
    if ((STATUSES as readonly string[]).includes(id)) return id as Status;
    const t = tasks.find((t) => t.id === id);
    return t?.status ?? null;
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const fromStatus = findContainer(activeId);
    const toStatus = findContainer(overId);
    if (!fromStatus || !toStatus) return;
    const moved = tasks.find((t) => t.id === activeId);
    if (!moved) return;

    if (fromStatus !== toStatus) {
      const prev = moved.status;
      upsertTask({ ...moved, status: toStatus });
      try {
        const updated = await apiCall<Task>(`/api/tasks/${moved.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: toStatus }),
        });
        upsertTask(updated);
      } catch {
        upsertTask({ ...moved, status: prev });
        toast.error("Move failed");
      }
    } else if (activeId !== overId) {
      const list = byStatus[fromStatus].map((t) => t.id);
      const ai = list.indexOf(activeId);
      const oi = list.indexOf(overId);
      if (ai < 0 || oi < 0) return;
      list.splice(oi, 0, list.splice(ai, 1)[0]);
      // optimistic reorder within column: positions will get rewritten globally
      const idMap = new Map(tasks.map((t) => [t.id, t]));
      const newColumn = list.map((id) => idMap.get(id)!);
      const others = tasks.filter((t) => t.status !== fromStatus || !!t.parentTaskId);
      setTasks([...others, ...newColumn]);
      try {
        const full = [
          ...others.filter((t) => !t.parentTaskId).map((t) => t.id),
          ...newColumn.map((t) => t.id),
        ];
        await apiCall("/api/tasks/reorder", { method: "POST", body: JSON.stringify({ ids: full }) });
      } catch {
        toast.error("Reorder failed");
      }
    }
  }

  return (
    <div className="px-3 py-3 overflow-x-auto h-[calc(100vh-3rem-3rem)] scrollbar-thin">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="flex gap-3 min-w-max h-full">
          {STATUSES.map((s) => (
            <Column key={s} status={s} tasks={byStatus[s]} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ status, tasks }: { status: Status; tasks: Task[] }) {
  const ids = tasks.map((t) => t.id);
  return (
    <div className="w-[280px] shrink-0 flex flex-col bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span
          className="rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide"
          style={{ backgroundColor: `${STATUS_COLORS[status]}24`, color: STATUS_COLORS[status] }}
        >
          {status}
        </span>
        <span className="text-[12px] text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <BoardCard key={t.id} task={t} />
          ))}
        </SortableContext>
        <BoardQuickAdd status={status} />
      </div>
    </div>
  );
}

function BoardCard({ task }: { task: Task }) {
  const { setOpenTaskId, upsertTask, users } = useStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function patch(p: Partial<Task>) {
    const prev = task;
    upsertTask({ ...task, ...p });
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setOpenTaskId(task.id)}
      className={cn(
        "bg-card border rounded-md p-2.5 shadow-sm hover:shadow transition-shadow cursor-pointer",
        "space-y-2",
      )}
    >
      <div className="text-[13px] font-medium leading-tight">{task.title}</div>
      <div className="flex flex-wrap gap-1">
        {task.tags.slice(0, 3).map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
      <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <PriorityFlag priority={task.priority} onClick={() => patch({ priority: nextPriority(task.priority) })} />
          <DueDate date={task.dueDate} onChange={(d) => patch({ dueDate: d })} />
        </div>
        <AssigneePicker users={users} assigneeId={task.assigneeId} onChange={(id) => patch({ assigneeId: id })} />
      </div>
    </div>
  );
}

function BoardQuickAdd({ status }: { status: Status }) {
  const { activeListId, upsertTask } = useStore();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  async function submit() {
    const title = value.trim();
    if (!title || !activeListId) {
      setOpen(false);
      setValue("");
      return;
    }
    try {
      const created = await apiCall<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ listId: activeListId, title, status }),
      });
      upsertTask(created);
      setValue("");
    } catch {
      toast.error("Add failed");
    }
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 w-full text-[12px] text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Task name"
      onBlur={() => {
        submit();
        setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
        if (e.key === "Escape") {
          setValue("");
          setOpen(false);
        }
      }}
      className="text-[13px] bg-background border border-primary/40 rounded px-2 py-1 outline-none w-full"
    />
  );
}
