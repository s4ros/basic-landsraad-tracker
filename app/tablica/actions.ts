"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BoardError, createWorld, cycleTile, readPlacements, savePlacements } from "@/lib/board";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function editorId() {
  const session = await auth();
  const userId = session?.userId;
  if (!userId || !uuidPattern.test(userId)) return null;
  return userId;
}

function worldPath(worldId: FormDataEntryValue | null) {
  if (typeof worldId !== "string" || !uuidPattern.test(worldId)) return null;
  return `/tablica/${worldId}`;
}

export async function createWorldAction(formData: FormData) {
  const userId = await editorId();
  if (!userId) redirect("/tablica?error=forbidden");

  let worldId: string;
  try {
    worldId = await createWorld({ userId, name: String(formData.get("name") ?? "") });
  } catch (error) {
    if (error instanceof BoardError) redirect(`/tablica?error=${error.code}`);
    throw error;
  }
  redirect(`/tablica/${worldId}`);
}

export async function savePlacementsAction(formData: FormData) {
  const path = worldPath(formData.get("worldId"));
  const userId = await editorId();
  if (!path || !userId) redirect(path ? `${path}?error=forbidden` : "/tablica?error=forbidden");

  try {
    await savePlacements({
      userId,
      worldId: path.slice("/tablica/".length),
      cells: readPlacements(formData),
    });
  } catch (error) {
    if (error instanceof BoardError) redirect(`${path}?error=${error.code}`);
    throw error;
  }
  redirect(path);
}

export async function cycleTileAction(formData: FormData) {
  const path = worldPath(formData.get("worldId"));
  const userId = await editorId();
  if (!path || !userId) redirect(path ? `${path}?error=forbidden` : "/tablica?error=forbidden");

  const row = Number(formData.get("row"));
  const column = Number(formData.get("column"));
  try {
    await cycleTile({
      userId,
      worldId: path.slice("/tablica/".length),
      row,
      column,
    });
  } catch (error) {
    if (error instanceof BoardError) redirect(`${path}?error=${error.code}`);
    throw error;
  }
  redirect(path);
}
