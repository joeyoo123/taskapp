import { db, schema } from "./client";
import { addDays, formatISO } from "date-fns";

const { users, spaces, folders, lists, tasks, favorites } = schema;

function id(prefix: string, n: number) {
  return `${prefix}_${n.toString(36).padStart(4, "0")}`;
}

function iso(daysFromNow: number) {
  return formatISO(addDays(new Date(), daysFromNow), { representation: "date" });
}

export function seed() {
  // Idempotent: skip if already seeded
  const existing = db.select().from(spaces).all();
  if (existing.length > 0) return;

  db.insert(users).values([
    { id: "u_me",   name: "You",          initials: "YO", color: "#7B68EE" },
    { id: "u_alex", name: "Alex Rivera",  initials: "AR", color: "#10b981" },
    { id: "u_sam",  name: "Sam Chen",     initials: "SC", color: "#f59e0b" },
    { id: "u_dev",  name: "Devin Patel",  initials: "DP", color: "#3b82f6" },
  ]).run();

  const sPersonal = id("sp", 1);
  const sBusiness = id("sp", 2);
  db.insert(spaces).values([
    { id: sPersonal, name: "Personal", color: "#7B68EE", position: 1 },
    { id: sBusiness, name: "Business", color: "#10b981", position: 2 },
  ]).run();

  const fEng = id("fd", 1);
  db.insert(folders).values([
    { id: fEng, spaceId: sBusiness, name: "Engineering", position: 1 },
  ]).run();

  const lInbox = id("ls", 1);
  const lHome  = id("ls", 2);
  const lSprint = id("ls", 3);
  const lBugs   = id("ls", 4);
  const lOps    = id("ls", 5);
  db.insert(lists).values([
    { id: lInbox,  spaceId: sPersonal, folderId: null, name: "Inbox",         position: 1 },
    { id: lHome,   spaceId: sPersonal, folderId: null, name: "Home & Errands", position: 2 },
    { id: lSprint, spaceId: sBusiness, folderId: fEng, name: "Current Sprint", position: 1 },
    { id: lBugs,   spaceId: sBusiness, folderId: fEng, name: "Bugs",           position: 2 },
    { id: lOps,    spaceId: sBusiness, folderId: null, name: "Operations",     position: 3 },
  ]).run();

  db.insert(favorites).values([
    { id: id("fv", 1), kind: "list", refId: lSprint, position: 1 },
    { id: id("fv", 2), kind: "list", refId: lInbox,  position: 2 },
  ]).run();

  const sample = [
    // Sprint
    { listId: lSprint, title: "Wire up authentication flow",     status: "In Progress", priority: "high",   assigneeId: "u_me",   tags: ["frontend","auth"],     due: 2 },
    { listId: lSprint, title: "Add Drizzle migrations script",   status: "Open",        priority: "normal", assigneeId: "u_alex", tags: ["backend","db"],        due: 5 },
    { listId: lSprint, title: "Design empty-state illustrations",status: "Review",      priority: "normal", assigneeId: "u_sam",  tags: ["design"],              due: 1 },
    { listId: lSprint, title: "Refactor task list filters",      status: "Open",        priority: "low",    assigneeId: null,     tags: ["frontend"],            due: 14 },
    { listId: lSprint, title: "Nightly agent task: regenerate embeddings",
      status: "Open", priority: "high", assigneeId: "u_dev", tags: ["agent","ml"], due: 7,
      agentSpec: { tool: "shell", inputs: { cmd: "npm run embed" }, approval_required: true, success_criteria: "exit code 0" } },

    // Bugs
    { listId: lBugs, title: "Drawer closes when clicking inside calendar",
      status: "In Progress", priority: "urgent", assigneeId: "u_me", tags: ["bug","ui"], due: 0 },
    { listId: lBugs, title: "Status filter ignores 'Closed'",  status: "Open",   priority: "high",   assigneeId: "u_alex", tags: ["bug","filters"], due: -1 },
    { listId: lBugs, title: "Avatar picker crashes on Safari", status: "Closed", priority: "normal", assigneeId: "u_sam",  tags: ["bug","ui"],     due: -5 },

    // Operations
    { listId: lOps, title: "Quarterly invoice review",            status: "Open",   priority: "high",   assigneeId: "u_me",  tags: ["finance"],   due: 10 },
    { listId: lOps, title: "Update vendor contact list",          status: "Open",   priority: "low",    assigneeId: null,    tags: ["ops"],       due: 30 },
    { listId: lOps, title: "Schedule team offsite for next month",status: "Review", priority: "normal", assigneeId: "u_sam", tags: ["people"],    due: 4 },

    // Personal
    { listId: lInbox, title: "Read 'Designing Data-Intensive Applications'", status: "Open", priority: "low", assigneeId: "u_me", tags: ["reading"], due: null },
    { listId: lInbox, title: "Reply to landlord email",                       status: "Open", priority: "high", assigneeId: "u_me", tags: [],          due: 0 },
    { listId: lHome,  title: "Pick up dry cleaning",                          status: "Open", priority: "normal", assigneeId: "u_me", tags: ["errand"], due: 1 },
    { listId: lHome,  title: "Replace kitchen lightbulb",                     status: "Closed", priority: "low", assigneeId: "u_me", tags: ["home"], due: -3 },
  ];

  sample.forEach((t, i) => {
    db.insert(tasks).values({
      id: id("tk", i + 1),
      listId: t.listId,
      parentTaskId: null,
      title: t.title,
      status: t.status as never,
      priority: t.priority as never,
      assigneeId: t.assigneeId ?? null,
      dueDate: t.due === null ? null : iso(t.due),
      tags: t.tags,
      agentSpec: (t as { agentSpec?: unknown }).agentSpec as never ?? null,
      position: i + 1,
    }).run();
  });

  // a subtask for the auth task
  db.insert(tasks).values({
    id: id("tk", 100),
    listId: lSprint,
    parentTaskId: id("tk", 1),
    title: "Set up session cookies",
    status: "Open",
    priority: "normal",
    tags: [],
    position: 1,
  }).run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
  console.log("seeded.");
}
