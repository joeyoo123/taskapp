"use client";
import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AgentSpec } from "@/lib/db/schema";

export function AgentSpecForm({
  value,
  onChange,
}: {
  value: AgentSpec | null;
  onChange: (v: AgentSpec | null) => void;
}) {
  const enabled = value !== null;
  const spec: AgentSpec = value ?? {
    tool: "",
    inputs: {},
    approval_required: true,
    success_criteria: "",
  };
  const inputEntries = Object.entries(spec.inputs);

  function patch(p: Partial<AgentSpec>) {
    onChange({ ...spec, ...p });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Agent execution spec</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</span>
          <Switch
            checked={enabled}
            onCheckedChange={(c) =>
              c ? onChange(spec) : onChange(null)
            }
          />
        </div>
      </div>

      {enabled && (
        <div className="space-y-3 rounded-md border p-3 bg-muted/20">
          <Field label="Tool">
            <Input
              value={spec.tool}
              onChange={(e) => patch({ tool: e.target.value })}
              placeholder="e.g. shell, http, search"
              className="h-8"
            />
          </Field>

          <Field label="Inputs">
            <div className="space-y-1.5">
              {inputEntries.map(([k, v], i) => (
                <KeyValueRow
                  key={i}
                  k={k}
                  v={String(v ?? "")}
                  onChange={(nk, nv) => {
                    const next = { ...spec.inputs };
                    delete next[k];
                    if (nk) next[nk] = nv;
                    patch({ inputs: next });
                  }}
                  onRemove={() => {
                    const next = { ...spec.inputs };
                    delete next[k];
                    patch({ inputs: next });
                  }}
                />
              ))}
              <Button
                variant="ghost"
                size="xs"
                onClick={() =>
                  patch({ inputs: { ...spec.inputs, [`key${inputEntries.length + 1}`]: "" } })
                }
                className="text-muted-foreground"
              >
                <Plus className="h-3 w-3" /> Add input
              </Button>
            </div>
          </Field>

          <Field label="Approval required">
            <div className="flex items-center gap-2">
              <Switch
                checked={spec.approval_required}
                onCheckedChange={(c) => patch({ approval_required: c })}
              />
              <span className="text-xs text-muted-foreground">
                {spec.approval_required ? "Will pause for review" : "Runs autonomously"}
              </span>
            </div>
          </Field>

          <Field label="Success criteria">
            <Textarea
              value={spec.success_criteria}
              onChange={(e) => patch({ success_criteria: e.target.value })}
              placeholder="What must be true for this task to be considered done?"
              className="min-h-[64px]"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function KeyValueRow({
  k,
  v,
  onChange,
  onRemove,
}: {
  k: string;
  v: string;
  onChange: (k: string, v: string) => void;
  onRemove: () => void;
}) {
  const [key, setKey] = React.useState(k);
  const [val, setVal] = React.useState(v);
  React.useEffect(() => setKey(k), [k]);
  React.useEffect(() => setVal(v), [v]);
  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onBlur={() => onChange(key, val)}
        placeholder="key"
        className="h-7 text-xs flex-1"
      />
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => onChange(key, val)}
        placeholder="value"
        className="h-7 text-xs flex-[2]"
      />
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-muted text-muted-foreground"
        title="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
