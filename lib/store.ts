"use client";
import { create } from "zustand";
import type { Favorite, Folder, List, Space, Task, User } from "./db/schema";

type ViewMode = "list" | "board" | "calendar";

type AppState = {
  // bootstrap
  users: User[];
  spaces: Space[];
  folders: Folder[];
  lists: List[];
  favorites: Favorite[];
  bootstrapped: boolean;

  // selection
  activeListId: string | null;
  setActiveListId: (id: string) => void;

  view: ViewMode;
  setView: (v: ViewMode) => void;

  // tasks for active list
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  upsertTask: (t: Task) => void;
  removeTask: (id: string) => void;

  // sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  expandedSpaces: Record<string, boolean>;
  expandedFolders: Record<string, boolean>;
  toggleSpace: (id: string) => void;
  toggleFolder: (id: string) => void;

  // drawer
  openTaskId: string | null;
  setOpenTaskId: (id: string | null) => void;

  // filters
  search: string;
  setSearch: (s: string) => void;

  bootstrap: () => Promise<void>;
  loadTasks: (listId?: string) => Promise<void>;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const useStore = create<AppState>((set, get) => ({
  users: [],
  spaces: [],
  folders: [],
  lists: [],
  favorites: [],
  bootstrapped: false,

  activeListId: null,
  setActiveListId: (id) => {
    set({ activeListId: id });
    void get().loadTasks(id);
  },

  view: "list",
  setView: (v) => set({ view: v }),

  tasks: [],
  setTasks: (t) => set({ tasks: t }),
  upsertTask: (t) =>
    set((s) => {
      const i = s.tasks.findIndex((x) => x.id === t.id);
      if (i < 0) return { tasks: [...s.tasks, t] };
      const next = s.tasks.slice();
      next[i] = t;
      return { tasks: next };
    }),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) })),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  expandedSpaces: {},
  expandedFolders: {},
  toggleSpace: (id) =>
    set((s) => ({ expandedSpaces: { ...s.expandedSpaces, [id]: !s.expandedSpaces[id] } })),
  toggleFolder: (id) =>
    set((s) => ({ expandedFolders: { ...s.expandedFolders, [id]: !s.expandedFolders[id] } })),

  openTaskId: null,
  setOpenTaskId: (id) => set({ openTaskId: id }),

  search: "",
  setSearch: (s) => set({ search: s }),

  async bootstrap() {
    const data = await api<{
      users: User[];
      spaces: Space[];
      folders: Folder[];
      lists: List[];
      favorites: Favorite[];
    }>("/api/bootstrap");
    const firstList = data.lists[0];
    const expandedSpaces = Object.fromEntries(data.spaces.map((s) => [s.id, true]));
    const expandedFolders = Object.fromEntries(data.folders.map((f) => [f.id, true]));
    set({
      ...data,
      bootstrapped: true,
      activeListId: firstList?.id ?? null,
      expandedSpaces,
      expandedFolders,
    });
    if (firstList) await get().loadTasks(firstList.id);
  },

  async loadTasks(listId) {
    const id = listId ?? get().activeListId;
    if (!id) return;
    const tasks = await api<Task[]>(`/api/tasks?list=${id}`);
    set({ tasks });
  },
}));

export async function apiCall<T>(path: string, init?: RequestInit): Promise<T> {
  return api<T>(path, init);
}
