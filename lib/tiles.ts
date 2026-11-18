export type TileStatus = "idle" | "ready" | "collected";

export const tileStatusText: Record<TileStatus, string | null> = {
  idle: null,
  ready: "można odebrać nagrodę",
  collected: "nagroda odebrana",
};

export function isTileStatus(value: string): value is TileStatus {
  return value === "idle" || value === "ready" || value === "collected";
}

const nextStatus: Record<TileStatus, TileStatus> = {
  idle: "ready",
  ready: "collected",
  collected: "idle",
};

export function cycleStatus(status: TileStatus) {
  return nextStatus[status];
}
