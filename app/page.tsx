"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "todo" | "doing" | "done" | "blocked";

type AgentSpec = {
  tool: string;
  inputs: Record<string, unknown>;
  approval_required: boolean;
  success_criteria: string;
};

type Task = {
  id: number;
  title: string;
  description: string;
  status: Status;
  priority: number;
  tags: string[];
  dueDate: string | null;
  createdAt: string;
  agentSpec: AgentSpec | null;
};

const STATUSES: Status[] = ["todo", "doing", "done", "blocked"];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (tagFilter) params.set("tag", tagFilter);
    if (search) params.set("search", search);
    const qs = params.toString();
    const rows = await api<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`);
    setTasks(rows);
  }, [statusFilter, tagFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const dragId = useRef<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const onDragStart = (id: number) => () => {
    dragId.current = id;
  };
  const onDragOver = (id: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setOverId(id);
  };
  const onDrop = (id: number) => async (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragId.current;
    setOverId(null);
    dragId.current = null;
    if (from == null || from === id) return;
    const fromIdx = tasks.findIndex((t) => t.id === from);
    const toIdx = tasks.findIndex((t) => t.id === id);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = tasks.slice();
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setTasks(next);
    await api("/api/tasks/reorder", {
      method: "POST",
      body: JSON.stringify({ ids: next.map((t) => t.id) }),
    });
    await load();
  };

  return (
    <div className="container">
      <h1>taskapp</h1>

      <div className="row" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | "")}>
          <option value="">all statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="text" placeholder="filter by tag"
          value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
        />
        <input
          type="text" placeholder="search title/desc"
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => setCreating(true)}>+ new task</button>
      </div>

      {tasks.length === 0 ? (
        <p className="muted">No tasks. Create one to get started.</p>
      ) : (
        tasks.map((t) => (
          <div
            key={t.id}
            className={`task ${overId === t.id ? "over" : ""}`}
            draggable
            onDragStart={onDragStart(t.id)}
            onDragOver={onDragOver(t.id)}
            onDrop={onDrop(t.id)}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName === "BUTTON") return;
              setEditing(t);
            }}
          >
            <span className="muted" style={{ width: 36 }}>#{t.id}</span>
            <span className={`status-${t.status}`} style={{ width: 64 }}>{t.status}</span>
            <span className="muted" style={{ width: 36 }}>p{t.priority}</span>
            <span className="title" style={{ flex: 1 }}>
              {t.title}
              {t.agentSpec && <span className="spec"> · agent:{t.agentSpec.tool}</span>}
            </span>
            <span>
              {t.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
            </span>
            {t.status !== "done" && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await api(`/api/tasks/${t.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "done" }),
                  });
                  await load();
                }}
              >done</button>
            )}
          </div>
        ))
      )}

      {(editing || creating) && (
        <Editor
          task={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={async () => { setEditing(null); setCreating(false); await load(); }}
        />
      )}
    </div>
  );
}

function Editor({ task, onClose, onSaved }: { task: Task | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<Status>(task?.status ?? "todo");
  const [priority, setPriority] = useState(task?.priority ?? 0);
  const [tags, setTags] = useState((task?.tags ?? []).join(", "));
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [agentSpec, setAgentSpec] = useState(task?.agentSpec ? JSON.stringify(task.agentSpec, null, 2) : "");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    let parsedSpec: AgentSpec | null = null;
    if (agentSpec.trim()) {
      try { parsedSpec = JSON.parse(agentSpec); }
      catch (e) { setError(`agent_spec JSON: ${(e as Error).message}`); return; }
    }
    const body = {
      title, description, status, priority: Number(priority),
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      dueDate: dueDate || null,
      agentSpec: parsedSpec,
    };
    try {
      if (task) await api(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/tasks", { method: "POST", body: JSON.stringify(body) });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async () => {
    if (!task) return;
    if (!confirm(`Delete #${task.id}?`)) return;
    await api(`/api/tasks/${task.id}`, { method: "DELETE" });
    onSaved();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0 }}>{task ? `edit #${task.id}` : "new task"}</h2>

        <label>title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />

        <label>description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="row" style={{ gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label>status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>priority</label>
            <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1 }}>
            <label>due date</label>
            <input type="text" placeholder="YYYY-MM-DD" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <label>tags (comma-separated)</label>
        <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} />

        <label>agent_spec (JSON, optional)</label>
        <textarea
          placeholder='{"tool":"shell","inputs":{"cmd":"npm test"},"approval_required":true,"success_criteria":"exit 0"}'
          value={agentSpec}
          onChange={(e) => setAgentSpec(e.target.value)}
        />

        {error && <p style={{ color: "#ef476f" }}>{error}</p>}

        <div className="row" style={{ marginTop: 16, justifyContent: "space-between" }}>
          <div>{task && <button onClick={remove} style={{ color: "#ef476f" }}>delete</button>}</div>
          <div className="row">
            <button onClick={onClose}>cancel</button>
            <button onClick={save}>save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
