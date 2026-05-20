import { handle } from "hono/vercel";
import { api } from "@/lib/api/server";
import { seed } from "@/lib/db/seed";

seed();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(api);
export const POST = handle(api);
export const PATCH = handle(api);
export const DELETE = handle(api);
