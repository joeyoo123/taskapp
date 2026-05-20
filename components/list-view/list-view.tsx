"use client";
import * as React from "react";
import { ChevronDown, ChevronRight, GripVertical, Plus } from "lucide-react";
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useStore, apiCall } from "@/lib/store";
import type { Status, Task } from "@/lib/db/schema";
import { STATUSES } from "@/lib/db/schema";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AssigneePicker, DueDate, PriorityFlag, STATUS_COLORS, StatusPill, nextPriority,
} from "@/components/task-bits";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ListView() {
  const { tasks, search } = useStore();

  const filtered = React.useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [tasks, search]);

  if (tasks.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="px-3 py-2 scrollbar-thin overflow-y-auto h-[calc(100vh-3rem-3rem)]">
      {/* column header */}
      <div className="grid items-center text-[11px] uppercase tracking-wider text-muted-foreground border-b px-2 py-1.5
                       grid-cols-[20px_24px_1fr_72px_120px_56px_120px_180px]">
        <span />
        <span />
        <span>Name</span>
        <span>Assignee</span>
        <span>Due date</span>
        <span>Prio</span>
        <span>Status</span>
        <span>Tags</span>
      </div>

      {STATUSES.map((status) => (
        <StatusGroup
          key={status}
          status={status}
          tasks={filtered.filter((t) => t.status === status && !t.parentTaskId)}
          allTasks={tasks}
        />
      ))}
    </div>
  );
}

function StatusGroup({
  status, tasks, allTasks,
}: { status: Status; tasks: Task[]; allTasks: Task[] }) {
  const [expanded, setExpanded] = React.useState(true);
  const { upsertTask, setTasks, activeListId, loadTasks } = useStore();
  const ids = React.useMemo(() => tasks.map((t) => t.id), [tasks]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ai = ids.indexOf(String(active.id));
    const oi = ids.indexOf(String(over.id));
    if (ai < 0 || oi < 0) return;
    const reordered = ids.slice();
    const [moved] = reordered.splice(ai, 1);
    reordered.splice(oi, 0, moved);
    // optimistic
    const lookup = new Map(tasks.map((t) => [t.id, t]));
    const newTasksForGroup = reordered.map((id) => lookup.get(id)!);
    const others = allTasks.filter((t) => !ids.includes(t.id) || t.status !== status);
    setTasks([...others, ...newTasksForGroup]);
    try {
      // global reorder: send full list of ids for this list in render order
      const fullOrder = [
        ...others.filter((t) => !t.parentTaskId).map((t) => t.id),
        ...newTasksForGroup.map((t) => t.id),
      ];
      await apiCall("/api/tasks/reorder", {
        method: "POST",
        body: JSON.stringify({ ids: fullOrder }),
      });
      if (activeListId) await loadTasks(activeListId);
    } catch (err) {
      toast.error("Reorder failed");
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 px-1 py-1.5 text-[12px] font-semibold tracking-wide w-full hover:bg-muted/30 rounded transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span
          className="rounded px-2 py-0.5 text-[11px] uppercase"
          style={{ backgroundColor: `${STATUS_COLORS[status]}24`, color: STATUS_COLORS[status] }}
        >
          {status}
        </span>
        <span className="text-muted-foreground text-[12px] font-normal ml-1">{tasks.length}</span>
      </button>

      {expanded && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div>
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} allTasks={allTasks} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {expanded && <QuickAdd status={status} />}
    </div>
  );
}

function TaskRow({ task, allTasks, indent = 0 }: { task: Task; allTasks: Task[]; indent?: number }) {
  const { setOpenTaskId, upsertTask, users } = useStore();
  const subtasks = allTasks.filter((t) => t.parentTaskId === task.id);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function patch(p: Partial<Task>) {
    const prev = task;
    upsertTask({ ...task, ...p } as Task);
    try {
      const updated = await apiCall<Task>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(p),
      });
      upsertTask(updated);
    } catch (e) {
      upsertTask(prev);
      toast.error("Update failed");
    }
  }

  function toggleComplete(checked: boolean) {
    if (checked) {
      setIsCompleting(true);
      setTimeout(() => {
        setIsCompleting(false);
        patch({ status: "Closed" });
      }, 220);
    } else {
      patch({ status: "Open" });
    }
  }

  const checked = task.status === "Closed";

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={() => setOpenTaskId(task.id)}
        className={cn(
          "group grid items-center h-9 px-2 border-b border-border/40 cursor-pointer transition-colors",
          "hover:bg-muted/40",
          "grid-cols-[20px_24px_1fr_72px_120px_56px_120px_180px]",
          checked && "text-muted-foreground",
        )}
      >
        <span
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground cursor-grab active:cursor-grabbing"
          style={{ paddingLeft: indent * 16 }}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        <span onClick={(e) => e.stopPropagation()} className="flex items-center">
          <Checkbox checked={checked} onCheckedChange={(v) => toggleComplete(!!v)} />
        </span>
        <InlineTitle
          task={task}
          onChange={(title) => patch({ title })}
          isAnimating={isCompleting}
        />
        <span onClick={(e) => e.stopPropagation()}>
          <AssigneePicker users={users} assigneeId={task.assigneeId} onChange={(id) => patch({ assigneeId: id })} />
        </span>
        <span onClick={(e) => e.stopPropagation()}>
          <DueDate date={task.dueDate} onChange={(d) => patch({ dueDate: d })} />
        </span>
        <span onClick={(e) => e.stopPropagation()}>
          <PriorityFlag priority={task.priority} onClick={() => patch({ priority: nextPriority(task.priority) })} />
        </span>
        <span onClick={(e) => e.stopPropagation()}>
          <StatusPill status={task.status} onChange={(s) => patch({ status: s })} />
        </span>
        <span className="flex items-center gap-1 overflow-hidden">
          {task.tags.slice(0, 3).map((t) => (
            <Badge key={t} className="bg-muted/70">{t}</Badge>
          ))}
          {task.tags.length > 3 && <Badge>+{task.tags.length - 3}</Badge>}
        </span>
      </div>

      {/* subtasks: indented with left connecting line */}
      {subtasks.length > 0 && (
        <div className="relative">
          <div className="absolute left-[28px] top-0 bottom-0 w-px bg-border" />
          {subtasks.map((sub) => (
            <TaskRow key={sub.id} task={sub} allTasks={allTasks} indent={indent + 1} />
          ))}
        </div>
      )}
    </>
  );
}

function InlineTitle({
  task,
  onChange,
  isAnimating,
}: {
  task: Task;
  onChange: (title: string) => void;
  isAnimating: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(task.title);
  React.useEffect(() => setValue(task.title), [task.title]);

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (value !== task.title) onChange(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setValue(task.title);
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="text-[13px] bg-background border border-primary/40 rounded px-1.5 py-0.5 outline-none w-full"
      />
    );
  }
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={cn(
        "text-[13px] truncate pr-2",
        task.status === "Closed" && "line-through",
        isAnimating && "strike-animate",
      )}
    >
      {task.title}
    </span>
  );
}

function QuickAdd({ status }: { status: Status }) {
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
    } catch (e) {
      toast.error("Add failed");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    );
  }
  return (
    <div className="px-2 py-1.5">
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
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="h-20 w-20 rounded-full bg-primary/10 grid place-items-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-primary">
          <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="font-semibold text-lg">No tasks here yet</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Create your first task with the "+ Add Task" button, or press <kbd className="px-1 rounded bg-muted text-[11px]">C</kbd>.
      </p>
    </div>
  );
}
