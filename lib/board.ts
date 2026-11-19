import type { PoolClient } from "pg";
import { getPool, withTransaction } from "@/lib/db";
import { cycleStatus, isTileStatus, type TileStatus } from "@/lib/tiles";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BoardError extends Error {
  readonly code:
    | "name"
    | "duplicate"
    | "forbidden"
    | "taken"
    | "missing"
    | "closed"
    | "empty"
    | "confirm"
    | "already"
    | "account"
    | "image";

  constructor(code: BoardError["code"]) {
    super(code);
    this.name = "BoardError";
    this.code = code;
  }
}

export const boardErrorText: Record<BoardError["code"], string> = {
  name: "Podaj nazwę świata, do 80 znaków.",
  duplicate: "Taki świat już istnieje.",
  forbidden: "Tylko edytor może zmieniać tę tablicę.",
  taken: "Każdy ród może być tylko raz na tej tablicy.",
  missing: "Nie ma takiego świata albo pola.",
  closed: "Ten tydzień jest zamknięty.",
  empty: "Najpierw ustaw ród na tym polu.",
  confirm: "Zaznacz, że zamykasz tydzień.",
  already: "Ta osoba już edytuje ten świat.",
  account: "Nie ma takiego konta.",
  image: "Wgraj plik PNG albo JPEG, do 8 MB.",
};

export type WorldListItem = { id: string; name: string };

export type BoardCell = {
  row: number;
  column: number;
  houseId: number | null;
  houseName: string | null;
  status: TileStatus;
};

export type OpenBoard = {
  worldId: string;
  worldName: string;
  weekId: string;
  sequence: number;
  cells: BoardCell[];
};

export type HouseOption = { id: number; name: string };

type Placement = { row: number; column: number; houseId: number | null };

function isUuid(value: string) {
  return uuidPattern.test(value);
}

function uniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

function cleanName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

async function assertEditor(client: PoolClient, userId: string, worldId: string) {
  const allowed = await client.query(
    `select 1
     from users u
     where u.id = $1
       and (
         u.is_owner
         or exists (
           select 1 from world_editors e
           where e.world_id = $2 and e.user_id = u.id
         )
       )`,
    [userId, worldId],
  );
  if (allowed.rowCount === 0) throw new BoardError("forbidden");
}

async function openWeekId(client: PoolClient, worldId: string) {
  const week = await client.query<{ id: string }>(
    `select id from weeks where world_id = $1 and status = 'open' for update`,
    [worldId],
  );
  if (week.rows[0]) return week.rows[0].id;
  const world = await client.query("select 1 from worlds where id = $1", [worldId]);
  if (world.rowCount === 0) throw new BoardError("missing");
  throw new BoardError("closed");
}

export async function listWorlds() {
  const result = await getPool().query<WorldListItem>(
    "select id, name from worlds order by lower(name)",
  );
  return result.rows;
}

export async function canCreateWorld(userId: string | undefined) {
  if (!userId || !isUuid(userId)) return false;
  const result = await getPool().query<{ allowed: boolean }>(
    `select (
       is_owner
       or exists (select 1 from world_editors e where e.user_id = users.id)
     ) as allowed
     from users
     where id = $1`,
    [userId],
  );
  return result.rows[0]?.allowed ?? false;
}

export async function canEditWorld(userId: string | undefined, worldId: string) {
  if (!userId || !isUuid(userId) || !isUuid(worldId)) return false;
  const result = await getPool().query(
    `select 1
     from users u
     where u.id = $1
       and (
         u.is_owner
         or exists (
           select 1 from world_editors e
           where e.world_id = $2 and e.user_id = u.id
         )
       )`,
    [userId, worldId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function createWorld(input: { userId: string; name: string }) {
  if (!isUuid(input.userId)) throw new BoardError("forbidden");
  const name = cleanName(input.name);
  if (name.length === 0 || name.length > 80) throw new BoardError("name");

  try {
    return await withTransaction(async (client) => {
      const allowed = await client.query(
        `select 1
         from users u
         where u.id = $1
           and (
             u.is_owner
             or exists (select 1 from world_editors e where e.user_id = u.id)
           )`,
        [input.userId],
      );
      if (allowed.rowCount === 0) throw new BoardError("forbidden");

      const world = await client.query<{ id: string }>(
        "insert into worlds (name, created_by) values ($1, $2) returning id",
        [name, input.userId],
      );
      const worldId = world.rows[0].id;
      await client.query(
        "insert into world_editors (world_id, user_id, appointed_by) values ($1, $2, $2)",
        [worldId, input.userId],
      );
      const week = await client.query<{ id: string }>(
        "insert into weeks (world_id, sequence, status) values ($1, 1, 'open') returning id",
        [worldId],
      );
      await client.query(
        `insert into board_cells (week_id, "row", column_position)
         select $1, r, c
         from generate_series(1, 5) as r
         cross join generate_series(1, 5) as c`,
        [week.rows[0].id],
      );
      return worldId;
    });
  } catch (error) {
    if (error instanceof BoardError) throw error;
    if (uniqueViolation(error)) throw new BoardError("duplicate");
    throw error;
  }
}

async function readBoard(input: {
  worldId: string;
  worldName: string;
  weekId: string;
  sequence: number;
}): Promise<OpenBoard | "missing"> {
  const cells = await getPool().query<{
    row: number;
    column_position: number;
    house_id: number | null;
    house_name: string | null;
    status: string;
  }>(
    `select c."row", c.column_position, c.house_id, h.name as house_name, c.status
     from board_cells c
     left join houses h on h.id = c.house_id
     where c.week_id = $1
     order by c."row", c.column_position`,
    [input.weekId],
  );
  if (cells.rows.length !== 25) return "missing";

  return {
    worldId: input.worldId,
    worldName: input.worldName,
    weekId: input.weekId,
    sequence: input.sequence,
    cells: cells.rows.map((cell) => ({
      row: Number(cell.row),
      column: Number(cell.column_position),
      houseId: cell.house_id === null ? null : Number(cell.house_id),
      houseName: cell.house_name,
      status: isTileStatus(cell.status) ? cell.status : "idle",
    })),
  };
}

export async function loadOpenBoard(worldId: string): Promise<OpenBoard | "missing" | "closed"> {
  if (!isUuid(worldId)) return "missing";
  const world = await getPool().query<{ id: string; name: string; week_id: string | null; sequence: number | null }>(
    `select w.id, w.name, wk.id as week_id, wk.sequence
     from worlds w
     left join weeks wk on wk.world_id = w.id and wk.status = 'open'
     where w.id = $1`,
    [worldId],
  );
  const header = world.rows[0];
  if (!header) return "missing";
  if (!header.week_id || header.sequence === null) return "closed";
  return readBoard({
    worldId: header.id,
    worldName: header.name,
    weekId: header.week_id,
    sequence: header.sequence,
  });
}

export async function listClosedWeeks(worldId: string): Promise<{ sequence: number }[]> {
  if (!isUuid(worldId)) return [];
  const result = await getPool().query<{ sequence: number }>(
    `select sequence
     from weeks
     where world_id = $1 and status = 'closed'
     order by sequence desc`,
    [worldId],
  );
  return result.rows.map((row) => ({ sequence: Number(row.sequence) }));
}

export async function loadClosedWeek(worldId: string, sequence: number): Promise<OpenBoard | "missing" | "open"> {
  if (!isUuid(worldId) || !Number.isInteger(sequence) || sequence < 1 || sequence > 100000) return "missing";
  const week = await getPool().query<{ name: string; week_id: string; status: string }>(
    `select w.name, wk.id as week_id, wk.status
     from weeks wk
     join worlds w on w.id = wk.world_id
     where wk.world_id = $1 and wk.sequence = $2`,
    [worldId, sequence],
  );
  const row = week.rows[0];
  if (!row) return "missing";
  if (row.status === "open") return "open";
  if (row.status !== "closed") return "missing";
  return readBoard({ worldId, worldName: row.name, weekId: row.week_id, sequence });
}

export async function closeWeek(input: { userId: string; worldId: string }) {
  if (!isUuid(input.userId) || !isUuid(input.worldId)) throw new BoardError("forbidden");
  return withTransaction(async (client) => {
    await assertEditor(client, input.userId, input.worldId);
    const weekId = await openWeekId(client, input.worldId);
    const closed = await client.query<{ sequence: number }>(
      `update weeks
       set status = 'closed', closed_at = now(), closed_by = $2
       where id = $1 and status = 'open'
       returning sequence`,
      [weekId, input.userId],
    );
    const sequence = closed.rows[0]?.sequence;
    if (sequence === undefined) throw new BoardError("closed");
    const nextSequence = Number(sequence) + 1;
    const next = await client.query<{ id: string }>(
      `insert into weeks (world_id, sequence, status) values ($1, $2, 'open') returning id`,
      [input.worldId, nextSequence],
    );
    await client.query(
      `insert into board_cells (week_id, "row", column_position)
       select $1, r, c
       from generate_series(1, 5) as r
       cross join generate_series(1, 5) as c`,
      [next.rows[0].id],
    );
    return { closedSequence: Number(sequence), nextSequence };
  });
}

export async function listHouses() {
  const result = await getPool().query<HouseOption>("select id, name from houses order by name");
  return result.rows;
}

function placementsFromCells(cells: Placement[]) {
  if (cells.length !== 25) throw new BoardError("missing");
  const seen = new Set<number>();
  for (const cell of cells) {
    if (cell.row < 1 || cell.row > 5 || cell.column < 1 || cell.column > 5) throw new BoardError("missing");
    if (cell.houseId === null) continue;
    if (!Number.isInteger(cell.houseId) || cell.houseId < 1) throw new BoardError("missing");
    if (seen.has(cell.houseId)) throw new BoardError("taken");
    seen.add(cell.houseId);
  }
  return seen;
}

export async function savePlacements(input: { userId: string; worldId: string; cells: Placement[] }) {
  if (!isUuid(input.userId) || !isUuid(input.worldId)) throw new BoardError("forbidden");
  const houseIds = [...placementsFromCells(input.cells)];

  await withTransaction(async (client) => {
    await assertEditor(client, input.userId, input.worldId);
    const weekId = await openWeekId(client, input.worldId);
    if (houseIds.length > 0) {
      const known = await client.query<{ id: number }>("select id from houses where id = any($1::smallint[])", [
        houseIds,
      ]);
      if (known.rowCount !== houseIds.length) throw new BoardError("missing");
    }

    const current = await client.query<{ row: number; column_position: number; house_id: number | null; status: string }>(
      `select "row", column_position, house_id, status from board_cells where week_id = $1 for update`,
      [weekId],
    );
    if (current.rowCount !== 25) throw new BoardError("missing");
    await client.query(`update board_cells set house_id = null where week_id = $1`, [weekId]);

    for (const cell of input.cells) {
      const previous = current.rows.find(
        (row) => Number(row.row) === cell.row && Number(row.column_position) === cell.column,
      );
      if (!previous) throw new BoardError("missing");
      const previousHouse = previous.house_id === null ? null : Number(previous.house_id);
      const sameHouse = previousHouse !== null && previousHouse === cell.houseId;
      const status = sameHouse && isTileStatus(previous.status) ? previous.status : "idle";
      await client.query(
        `update board_cells
         set house_id = $4, status = $5
         where week_id = $1 and "row" = $2 and column_position = $3`,
        [weekId, cell.row, cell.column, cell.houseId, status],
      );
    }
  });
}

export async function cycleTile(input: { userId: string; worldId: string; row: number; column: number }) {
  if (!isUuid(input.userId) || !isUuid(input.worldId)) throw new BoardError("forbidden");
  if (input.row < 1 || input.row > 5 || input.column < 1 || input.column > 5) throw new BoardError("missing");

  await withTransaction(async (client) => {
    await assertEditor(client, input.userId, input.worldId);
    const weekId = await openWeekId(client, input.worldId);
    const current = await client.query<{ status: string; house_id: number | null }>(
      `select status, house_id
       from board_cells
       where week_id = $1 and "row" = $2 and column_position = $3
       for update`,
      [weekId, input.row, input.column],
    );
    const cell = current.rows[0];
    if (!cell) throw new BoardError("missing");
    if (cell.house_id === null || !isTileStatus(cell.status)) throw new BoardError("empty");
    await client.query(
      `update board_cells
       set status = $4
       where week_id = $1 and "row" = $2 and column_position = $3`,
      [weekId, input.row, input.column, cycleStatus(cell.status)],
    );
  });
}

export function readPlacements(formData: FormData): Placement[] {
  const cells: Placement[] = [];
  for (let row = 1; row <= 5; row += 1) {
    for (let column = 1; column <= 5; column += 1) {
      const raw = formData.get(`r${row}c${column}`);
      if (typeof raw !== "string") throw new BoardError("missing");
      if (raw === "") {
        cells.push({ row, column, houseId: null });
        continue;
      }
      if (!/^[0-9]+$/.test(raw)) throw new BoardError("missing");
      cells.push({ row, column, houseId: Number(raw) });
    }
  }
  return cells;
}
