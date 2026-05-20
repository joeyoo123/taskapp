"use client";
import { ChevronDown, ChevronRight, Folder as FolderIcon, Hash, List as ListIcon,
  PanelLeftClose, PanelLeftOpen, Plus, Star } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const {
    spaces, folders, lists, favorites,
    activeListId, setActiveListId,
    sidebarCollapsed, toggleSidebar,
    expandedSpaces, expandedFolders,
    toggleSpace, toggleFolder,
  } = useStore();

  return (
    <aside
      className={cn(
        "shrink-0 border-r bg-card transition-[width] duration-200 overflow-hidden",
        sidebarCollapsed ? "w-[52px]" : "w-[260px]",
      )}
    >
      <div className="flex items-center justify-between h-12 px-3 border-b">
        {!sidebarCollapsed && (
          <button
            className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
            title="Switch workspace"
          >
            <span className="h-6 w-6 rounded-md bg-primary text-primary-foreground grid place-items-center text-[11px] font-bold">
              YO
            </span>
            <span>Your Workspace</span>
          </button>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Toggle sidebar">
          {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {!sidebarCollapsed && (
        <div className="px-2 py-2 space-y-3 text-sm scrollbar-thin overflow-y-auto h-[calc(100vh-3rem)]">
          {/* Favorites */}
          {favorites.length > 0 && (
            <section>
              <SectionHeader icon={<Star className="h-3.5 w-3.5 fill-current text-amber-500" />} label="Favorites" />
              {favorites.map((f) => {
                const list = lists.find((l) => l.id === f.refId);
                if (!list) return null;
                return (
                  <ListRow
                    key={f.id}
                    indent={1}
                    label={list.name}
                    active={activeListId === list.id}
                    onClick={() => setActiveListId(list.id)}
                  />
                );
              })}
            </section>
          )}

          {/* Spaces tree */}
          <section className="space-y-0.5">
            <SectionHeader label="Spaces" addable />
            {spaces.map((space) => {
              const expanded = expandedSpaces[space.id];
              const spaceLists = lists.filter((l) => l.spaceId === space.id && !l.folderId);
              const spaceFolders = folders.filter((f) => f.spaceId === space.id);
              return (
                <div key={space.id}>
                  <TreeRow
                    onClick={() => toggleSpace(space.id)}
                    chevron={expanded}
                    icon={
                      <span
                        className="h-3 w-3 rounded-[3px]"
                        style={{ backgroundColor: space.color }}
                      />
                    }
                    label={space.name}
                    bold
                  />
                  {expanded && (
                    <div className="ml-1.5 border-l border-border/70">
                      {spaceFolders.map((folder) => {
                        const fExpanded = expandedFolders[folder.id];
                        const folderLists = lists.filter((l) => l.folderId === folder.id);
                        return (
                          <div key={folder.id}>
                            <TreeRow
                              indent={1}
                              onClick={() => toggleFolder(folder.id)}
                              chevron={fExpanded}
                              icon={<FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                              label={folder.name}
                            />
                            {fExpanded &&
                              folderLists.map((list) => (
                                <ListRow
                                  key={list.id}
                                  indent={2}
                                  label={list.name}
                                  active={activeListId === list.id}
                                  onClick={() => setActiveListId(list.id)}
                                />
                              ))}
                          </div>
                        );
                      })}
                      {spaceLists.map((list) => (
                        <ListRow
                          key={list.id}
                          indent={1}
                          label={list.name}
                          active={activeListId === list.id}
                          onClick={() => setActiveListId(list.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      )}
    </aside>
  );
}

function SectionHeader({
  label,
  icon,
  addable,
}: {
  label: string;
  icon?: React.ReactNode;
  addable?: boolean;
}) {
  return (
    <div className="group flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground px-2 py-1">
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {addable && (
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
          title={`Add ${label.toLowerCase().slice(0, -1)}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function TreeRow({
  label,
  icon,
  onClick,
  chevron,
  indent = 0,
  bold,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  chevron?: boolean;
  indent?: number;
  bold?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center w-full gap-1.5 px-2 py-1 rounded-md hover:bg-muted/60 text-left transition-colors",
        bold && "font-medium",
      )}
      style={{ paddingLeft: 8 + indent * 12 }}
    >
      {chevron === undefined ? (
        <span className="w-3" />
      ) : chevron ? (
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
      )}
      {icon}
      <span className="truncate text-[13px]">{label}</span>
      <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
        <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
      </span>
    </button>
  );
}

function ListRow({
  label,
  active,
  onClick,
  indent = 0,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  indent?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center w-full gap-1.5 px-2 py-1 rounded-md text-left transition-colors text-[13px]",
        active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60",
      )}
      style={{ paddingLeft: 8 + indent * 12 }}
    >
      <span className="w-3" />
      <ListIcon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <span className="truncate">{label}</span>
    </button>
  );
}
