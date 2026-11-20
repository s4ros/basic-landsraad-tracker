import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, test } from "node:test";
import { Client } from "pg";
import {
  BoardError,
  clearHouse,
  closeWeek,
  createWorld,
  cycleTile,
  loadClosedWeek,
  loadOpenBoard,
  placeHouse,
  savePlacements,
} from "@/lib/board";
import { getPool } from "@/lib/db";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const database = new URL(databaseUrl);
if (database.pathname !== "/landsraad_test") {
  throw new Error("Refusing to test against a database other than landsraad_test");
}

function postgresCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}

async function ensureTestDatabase() {
  const admin = new URL(databaseUrl!);
  admin.pathname = "/landsraad";
  const client = new Client({ connectionString: admin.href });
  await client.connect();
  try {
    await client.query("create database landsraad_test");
  } catch (error) {
    if (postgresCode(error) !== "42P04") throw error;
  } finally {
    await client.end();
  }
}

async function migrate() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      create table if not exists schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )
    `);
    const files = readdirSync(new URL("../db/migrations/", import.meta.url))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const applied = await client.query("select 1 from schema_migrations where version = $1", [file]);
      if (applied.rowCount) continue;
      const sql = readFileSync(new URL(`../db/migrations/${file}`, import.meta.url), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

before(async () => {
  await ensureTestDatabase();
  await migrate();
});

async function openCells(worldId: string) {
  const result = await getPool().query<{
    row: number;
    column_position: number;
    house_id: number | null;
    status: string;
  }>(
    `select c."row", c.column_position, c.house_id, c.status
     from board_cells c
     join weeks wk on wk.id = c.week_id
     where wk.world_id = $1 and wk.status = 'open'
     order by c."row", c.column_position`,
    [worldId],
  );
  return result.rows.map((cell) => ({
    row: Number(cell.row),
    column: Number(cell.column_position),
    houseId: cell.house_id === null ? null : Number(cell.house_id),
    status: cell.status,
  }));
}

function cellOf(cells: Awaited<ReturnType<typeof openCells>>, row: number, column: number) {
  const cell = cells.find((item) => item.row === row && item.column === column);
  assert.ok(cell);
  return cell;
}

async function rejectsCode(run: () => Promise<unknown>, code: BoardError["code"]) {
  await assert.rejects(run, (error: unknown) => {
    assert.ok(error instanceof BoardError);
    assert.equal(error.code, code);
    return true;
  });
}

function emptyGrid(houseId: number | null) {
  const cells: { row: number; column: number; houseId: number | null }[] = [];
  for (let row = 1; row <= 5; row += 1) {
    for (let column = 1; column <= 5; column += 1) {
      cells.push({ row, column, houseId: row === 1 && column === 1 ? houseId : null });
    }
  }
  return cells;
}

test("an editor closes the open week and the next board starts empty", async () => {
  const pool = getPool();
  const name = `test-close-${Date.now()}`;
  const createdUserIds: string[] = [];
  let ownerId = "";
  try {
    const existingOwner = await pool.query<{ id: string }>("select id from users where is_owner");
    if (existingOwner.rows[0]) {
      ownerId = existingOwner.rows[0].id;
    } else {
      const created = await pool.query<{ id: string }>("insert into users (is_owner) values (true) returning id");
      ownerId = created.rows[0].id;
      createdUserIds.push(ownerId);
    }
    const stranger = await pool.query<{ id: string }>("insert into users (is_owner) values (false) returning id");
    const strangerId = stranger.rows[0].id;
    createdUserIds.push(strangerId);

    const worldId = await createWorld({ userId: ownerId, name });
    await savePlacements({ userId: ownerId, worldId, cells: emptyGrid(1) });
    await cycleTile({ userId: ownerId, worldId, row: 1, column: 1 });

    const open = await loadOpenBoard(worldId);
    assert.notEqual(open, "missing");
    assert.notEqual(open, "closed");
    if (open === "missing" || open === "closed") return;
    assert.equal(open.sequence, 1);
    assert.equal(open.cells[0]?.status, "ready");
    assert.equal(open.cells[0]?.houseName, "Imota");

    const firstClose = await closeWeek({ userId: ownerId, worldId });
    assert.deepEqual(firstClose, { closedSequence: 1, nextSequence: 2 });

    const closedRow = await pool.query<{ status: string; closed_at: Date | null; closed_by: string | null; tile_status: string }>(
      `select wk.status, wk.closed_at, wk.closed_by, c.status as tile_status
       from weeks wk
       join board_cells c on c.week_id = wk.id and c."row" = 1 and c.column_position = 1
       where wk.world_id = $1 and wk.sequence = 1`,
      [worldId],
    );
    assert.equal(closedRow.rows[0]?.status, "closed");
    assert.ok(closedRow.rows[0]?.closed_at);
    assert.equal(closedRow.rows[0]?.closed_by, ownerId);
    assert.equal(closedRow.rows[0]?.tile_status, "ready");

    const history = await loadClosedWeek(worldId, 1);
    assert.notEqual(history, "missing");
    assert.notEqual(history, "open");
    if (history === "missing" || history === "open") return;
    assert.equal(history.sequence, 1);
    assert.equal(history.cells[0]?.houseName, "Imota");
    assert.equal(history.cells[0]?.status, "ready");
    assert.equal(await loadClosedWeek(worldId, 2), "open");
    assert.equal(await loadClosedWeek(worldId, 99), "missing");

    const next = await loadOpenBoard(worldId);
    assert.notEqual(next, "missing");
    assert.notEqual(next, "closed");
    if (next === "missing" || next === "closed") return;
    assert.equal(next.sequence, 2);
    assert.equal(next.cells.length, 25);
    assert.ok(next.cells.every((cell) => cell.houseId === null && cell.status === "idle"));

    const secondClose = await closeWeek({ userId: ownerId, worldId });
    assert.deepEqual(secondClose, { closedSequence: 2, nextSequence: 3 });

    const before = await loadOpenBoard(worldId);
    await assert.rejects(() => closeWeek({ userId: strangerId, worldId }), (error: unknown) => {
      assert.ok(error instanceof BoardError);
      assert.equal(error.code, "forbidden");
      return true;
    });
    const after = await loadOpenBoard(worldId);
    assert.deepEqual(after, before);
  } finally {
    await pool.query("delete from worlds where name = $1", [name]);
    if (createdUserIds.length > 0) {
      await pool.query("delete from users where id = any($1::uuid[])", [createdUserIds]);
    }
  }
});

test("placeHouse and clearHouse change one open cell", async () => {
  const pool = getPool();
  const name = `test-place-${Date.now()}`;
  const createdUserIds: string[] = [];
  let ownerId = "";
  try {
    const existingOwner = await pool.query<{ id: string }>("select id from users where is_owner");
    if (existingOwner.rows[0]) {
      ownerId = existingOwner.rows[0].id;
    } else {
      const created = await pool.query<{ id: string }>("insert into users (is_owner) values (true) returning id");
      ownerId = created.rows[0].id;
      createdUserIds.push(ownerId);
    }
    const stranger = await pool.query<{ id: string }>("insert into users (is_owner) values (false) returning id");
    const strangerId = stranger.rows[0].id;
    createdUserIds.push(strangerId);

    const worldId = await createWorld({ userId: ownerId, name });

    await placeHouse({ userId: ownerId, worldId, row: 1, column: 1, houseId: 1 });
    const placed = await openCells(worldId);
    assert.deepEqual(cellOf(placed, 1, 1), { row: 1, column: 1, houseId: 1, status: "idle" });

    await rejectsCode(() => placeHouse({ userId: ownerId, worldId, row: 1, column: 2, houseId: 1 }), "taken");
    const duplicated = await openCells(worldId);
    assert.deepEqual(cellOf(duplicated, 1, 2), { row: 1, column: 2, houseId: null, status: "idle" });
    assert.deepEqual(cellOf(duplicated, 1, 1), { row: 1, column: 1, houseId: 1, status: "idle" });

    await cycleTile({ userId: ownerId, worldId, row: 1, column: 1 });
    await rejectsCode(() => placeHouse({ userId: ownerId, worldId, row: 1, column: 1, houseId: 2 }), "taken");
    const occupied = await openCells(worldId);
    assert.deepEqual(cellOf(occupied, 1, 1), { row: 1, column: 1, houseId: 1, status: "ready" });

    await clearHouse({ userId: ownerId, worldId, row: 1, column: 1 });
    const cleared = await openCells(worldId);
    assert.deepEqual(cellOf(cleared, 1, 1), { row: 1, column: 1, houseId: null, status: "idle" });
    await placeHouse({ userId: ownerId, worldId, row: 2, column: 2, houseId: 1 });
    const moved = await openCells(worldId);
    assert.deepEqual(cellOf(moved, 2, 2), { row: 2, column: 2, houseId: 1, status: "idle" });

    await rejectsCode(() => clearHouse({ userId: ownerId, worldId, row: 1, column: 2 }), "empty");
    assert.deepEqual(cellOf(await openCells(worldId), 1, 2), { row: 1, column: 2, houseId: null, status: "idle" });

    const beforeStranger = await openCells(worldId);
    await rejectsCode(() => placeHouse({ userId: strangerId, worldId, row: 1, column: 2, houseId: 2 }), "forbidden");
    await rejectsCode(() => clearHouse({ userId: strangerId, worldId, row: 2, column: 2 }), "forbidden");
    assert.deepEqual(await openCells(worldId), beforeStranger);

    const beforeBad = await openCells(worldId);
    await rejectsCode(
      () => placeHouse({ userId: "not-a-uuid", worldId, row: 1, column: 2, houseId: 2 }),
      "forbidden",
    );
    await rejectsCode(
      () => placeHouse({ userId: ownerId, worldId: "not-a-uuid", row: 1, column: 2, houseId: 2 }),
      "forbidden",
    );
    await rejectsCode(
      () => clearHouse({ userId: "not-a-uuid", worldId, row: 2, column: 2 }),
      "forbidden",
    );
    await rejectsCode(() => placeHouse({ userId: ownerId, worldId, row: 0, column: 1, houseId: 2 }), "missing");
    await rejectsCode(() => placeHouse({ userId: ownerId, worldId, row: 6, column: 1, houseId: 2 }), "missing");
    await rejectsCode(() => placeHouse({ userId: ownerId, worldId, row: 1, column: 0, houseId: 2 }), "missing");
    await rejectsCode(() => clearHouse({ userId: ownerId, worldId, row: 1, column: 6 }), "missing");
    await rejectsCode(() => placeHouse({ userId: ownerId, worldId, row: 1, column: 2, houseId: 0 }), "missing");
    await rejectsCode(() => placeHouse({ userId: ownerId, worldId, row: 1, column: 2, houseId: 26 }), "missing");
    await rejectsCode(() => placeHouse({ userId: ownerId, worldId, row: 1, column: 2, houseId: 1.5 }), "missing");
    assert.deepEqual(await openCells(worldId), beforeBad);

    await closeWeek({ userId: ownerId, worldId });
    await pool.query(
      `update weeks set status = 'closed', closed_at = now(), closed_by = $2
       where world_id = $1 and status = 'open'`,
      [worldId, ownerId],
    );
    const frozen = await pool.query(
      `select wk.sequence, c."row", c.column_position, c.house_id, c.status
       from weeks wk
       join board_cells c on c.week_id = wk.id
       where wk.world_id = $1
       order by wk.sequence, c."row", c.column_position`,
      [worldId],
    );
    await rejectsCode(() => placeHouse({ userId: ownerId, worldId, row: 1, column: 1, houseId: 2 }), "closed");
    await rejectsCode(() => clearHouse({ userId: ownerId, worldId, row: 2, column: 2 }), "closed");
    const still = await pool.query(
      `select wk.sequence, c."row", c.column_position, c.house_id, c.status
       from weeks wk
       join board_cells c on c.week_id = wk.id
       where wk.world_id = $1
       order by wk.sequence, c."row", c.column_position`,
      [worldId],
    );
    assert.deepEqual(still.rows, frozen.rows);
  } finally {
    await pool.query("delete from worlds where name = $1", [name]);
    if (createdUserIds.length > 0) {
      await pool.query("delete from users where id = any($1::uuid[])", [createdUserIds]);
    }
  }
});
