"use client";
import * as React from "react";
import { toast } from "sonner";
import { useStore, apiCall } from "@/lib/store";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { ListView } from "@/components/list-view/list-view";
import { BoardView } from "@/components/board-view/board";
import { TaskDrawer } from "@/components/drawer/task-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/lib/db/schema";

export default function Page() {
  const {
    bootstrapped, bootstrap, view, activeListId, upsertTask, openTaskId, setOpenTaskId,
  } = useStore();

  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Keyboard shortcuts
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (inEditable) return;

      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("topbar-search")?.focus();
      } else if (e.key === "c") {
        e.preventDefault();
        void createBlank();
      }
    }
    async function createBlank() {
      if (!activeListId) return;
      try {
        const t = await apiCall<Task>("/api/tasks", {
          method: "POST",
          body: JSON.stringify({ listId: activeListId, title: "New task" }),
        });
        upsertTask(t);
        setOpenTaskId(t.id);
      } catch {
        toast.error("Create failed");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeListId, upsertTask, setOpenTaskId]);

  async function handleCreate() {
    if (!activeListId) return;
    try {
      const t = await apiCall<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ listId: activeListId, title: "New task" }),
      });
      upsertTask(t);
      setOpenTaskId(t.id);
    } catch {
      toast.error("Create failed");
    }
  }

  return (
    <div className="h-screen flex bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <TopBar onCreate={handleCreate} />
        {!bootstrapped ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-9 w-2/3" />
          </div>
        ) : view === "list" ? (
          <ListView />
        ) : view === "board" ? (
          <BoardView />
        ) : (
          <div className="p-8 text-sm text-muted-foreground">
            Calendar view is a stub — coming soon.
          </div>
        )}
      </main>
      <TaskDrawer />
    </div>
  );
}
