"use client";
import { Flag } from "lucide-react";
import { format, isToday, isPast, parseISO } from "date-fns";
import type { Priority, Status, User } from "@/lib/db/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PRIORITIES, STATUSES } from "@/lib/db/schema";

export const STATUS_COLORS: Record<Status, string> = {
  Open: "#d3d3d3",
  "In Progress": "#3b82f6",
  Review: "#f59e0b",
  Closed: "#10b981",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: "#ef4444",
  high:   "#f59e0b",
  normal: "#3b82f6",
  low:    "#9ca3af",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

const PRIORITY_ORDER: Priority[] = ["urgent", "high", "normal", "low"];
export function nextPriority(p: Priority): Priority {
  const i = PRIORITY_ORDER.indexOf(p);
  return PRIORITY_ORDER[(i + 1) % PRIORITY_ORDER.length];
}

export function PriorityFlag({ priority, onClick }: { priority: Priority; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`Priority: ${PRIORITY_LABEL[priority]}`}
      className="inline-flex p-0.5 rounded hover:bg-muted/60 transition-colors"
    >
      <Flag className="h-3.5 w-3.5" style={{ color: PRIORITY_COLORS[priority], fill: PRIORITY_COLORS[priority] }} />
    </button>
  );
}

export function StatusPill({
  status,
  onChange,
}: {
  status: Status;
  onChange?: (s: Status) => void;
}) {
  const color = STATUS_COLORS[status];
  const inner = (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide cursor-pointer"
      style={{ backgroundColor: `${color}24`, color: tintText(color) }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
  if (!onChange) return inner;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button">{inner}</button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted/60 text-left",
              s === status && "bg-muted/40 font-medium",
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
            {s}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function AssigneePicker({
  users,
  assigneeId,
  onChange,
}: {
  users: User[];
  assigneeId: string | null;
  onChange: (id: string | null) => void;
}) {
  const user = users.find((u) => u.id === assigneeId) ?? null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex p-0.5 rounded hover:bg-muted/60 transition-colors">
          {user ? (
            <Avatar className="h-6 w-6">
              <AvatarFallback style={{ backgroundColor: user.color }}>{user.initials}</AvatarFallback>
            </Avatar>
          ) : (
            <span className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/40 grid place-items-center text-muted-foreground text-[10px]">
              +
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        <button
          onClick={() => onChange(null)}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted/60 text-left text-muted-foreground"
        >
          Unassigned
        </button>
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => onChange(u.id)}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted/60 text-left",
              u.id === assigneeId && "bg-muted/40 font-medium",
            )}
          >
            <Avatar className="h-5 w-5">
              <AvatarFallback style={{ backgroundColor: u.color }}>{u.initials}</AvatarFallback>
            </Avatar>
            {u.name}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function DueDate({
  date,
  onChange,
}: {
  date: string | null;
  onChange: (d: string | null) => void;
}) {
  let className = "text-muted-foreground";
  let label = "—";
  if (date) {
    const d = parseISO(date);
    if (isPast(d) && !isToday(d)) className = "text-red-600 dark:text-red-400";
    else if (isToday(d)) className = "text-amber-600 dark:text-amber-400";
    else className = "text-foreground";
    label = isToday(d) ? "Today" : format(d, "MMM d");
  }
  return (
    <input
      type="date"
      value={date ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        "bg-transparent text-[13px] rounded px-1 py-0.5 hover:bg-muted/60 transition-colors w-[110px] cursor-pointer",
        className,
      )}
      data-label={label}
    />
  );
}

function tintText(hex: string) {
  // crude contrast: darken hex to a readable foreground.
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.7 ? "#4b5563" : hex;
}

export function PRIORITIES_OPTIONS() {
  return PRIORITIES;
}
