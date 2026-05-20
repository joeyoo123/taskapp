"use client";
import { ChevronRight, Filter, Group, Plus, Search, SlidersHorizontal,
  KanbanSquare, ListTodo, Calendar as CalendarIcon, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function TopBar({ onCreate }: { onCreate: () => void }) {
  const { spaces, folders, lists, users, activeListId, view, setView, search, setSearch } = useStore();
  const list = lists.find((l) => l.id === activeListId);
  const folder = list?.folderId ? folders.find((f) => f.id === list.folderId) : null;
  const space = list ? spaces.find((s) => s.id === list.spaceId) : null;
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <header className="h-12 border-b bg-background flex items-center px-3 gap-3">
      {/* breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground min-w-0">
        {space && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: space.color }} />
            <span className="truncate">{space.name}</span>
          </span>
        )}
        {folder && (
          <>
            <ChevronRight className="h-3.5 w-3.5 mx-1 text-muted-foreground/60" />
            <span className="truncate">{folder.name}</span>
          </>
        )}
        {list && (
          <>
            <ChevronRight className="h-3.5 w-3.5 mx-1 text-muted-foreground/60" />
            <span className="truncate font-medium text-foreground">{list.name}</span>
          </>
        )}
      </div>

      {/* view switcher */}
      <div className="ml-2 flex items-center gap-0.5 border rounded-md bg-muted/40 p-0.5">
        <ViewTab active={view === "list"} onClick={() => setView("list")} icon={<ListTodo className="h-3.5 w-3.5" />} label="List" />
        <ViewTab active={view === "board"} onClick={() => setView("board")} icon={<KanbanSquare className="h-3.5 w-3.5" />} label="Board" />
        <ViewTab active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarIcon className="h-3.5 w-3.5" />} label="Calendar" />
      </div>

      <div className="flex-1" />

      {/* controls */}
      <Button variant="ghost" size="sm" className="text-muted-foreground">
        <Filter className="h-3.5 w-3.5" /> Filter
      </Button>
      <Button variant="ghost" size="sm" className="text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5" /> Sort
      </Button>
      <Button variant="ghost" size="sm" className="text-muted-foreground">
        <Group className="h-3.5 w-3.5" /> Group
      </Button>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          id="topbar-search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-44 pl-7 text-[13px]"
        />
      </div>

      {/* assignees */}
      <div className="flex -space-x-1.5">
        {users.slice(0, 4).map((u) => (
          <Avatar key={u.id} className="h-7 w-7 ring-2 ring-background">
            <AvatarFallback style={{ backgroundColor: u.color }}>{u.initials}</AvatarFallback>
          </Avatar>
        ))}
      </div>

      <Button onClick={onCreate} size="sm">
        <Plus className="h-3.5 w-3.5" /> Add Task
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        title="Toggle theme"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}

function ViewTab({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 h-7 rounded text-[13px] transition-colors",
        active
          ? "bg-background text-foreground shadow-sm font-medium"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
