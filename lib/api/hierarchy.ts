import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { favorites, folders, lists, spaces, users } from "../db/schema";

export function listUsers() {
  return db.select().from(users).all();
}

export function listSpaces() {
  return db.select().from(spaces).orderBy(spaces.position).all();
}

export function listFolders() {
  return db.select().from(folders).orderBy(folders.position).all();
}

export function listLists() {
  return db.select().from(lists).orderBy(lists.position).all();
}

export function listFavorites() {
  return db.select().from(favorites).orderBy(favorites.position).all();
}

export function getList(id: string) {
  return db.select().from(lists).where(eq(lists.id, id)).get();
}
export function getSpace(id: string) {
  return db.select().from(spaces).where(eq(spaces.id, id)).get();
}
export function getFolder(id: string) {
  return db.select().from(folders).where(eq(folders.id, id)).get();
}
