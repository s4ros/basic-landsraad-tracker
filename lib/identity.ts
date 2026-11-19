import type { PoolClient } from "pg";
import { getPool, withTransaction } from "@/lib/db";
import { cleanDisplayName } from "@/lib/steam-profile";

const providers = new Set(["google", "steam"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class IdentityTaken extends Error {
  constructor() {
    super("IdentityTaken");
    this.name = "IdentityTaken";
  }
}

function normalizeEmail(email: string | null) {
  if (email === null) return null;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 320 || /\s/.test(trimmed) || !trimmed.includes("@")) {
    return null;
  }
  return trimmed;
}

function isEmailConflict(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: string; constraint?: string };
  return candidate.code === "23505" && candidate.constraint === "identities_email_lower";
}

async function storeLabel(
  client: PoolClient,
  mode: "insert" | "update",
  userId: string,
  provider: string,
  subject: string,
  displayName: string,
  email: string | null,
) {
  await client.query("savepoint identity_email");
  try {
    if (mode === "insert") {
      await client.query(
        `insert into identities (user_id, provider, provider_subject, display_name, email)
         values ($1, $2, $3, $4, $5)`,
        [userId, provider, subject, displayName, email],
      );
    } else {
      await client.query(
        `update identities
         set display_name = $3, email = coalesce($4, email)
         where provider = $1 and provider_subject = $2`,
        [provider, subject, displayName, email],
      );
    }
    await client.query("release savepoint identity_email");
  } catch (error) {
    if (!isEmailConflict(error)) throw error;
    await client.query("rollback to savepoint identity_email");
    if (mode === "insert") {
      await client.query(
        `insert into identities (user_id, provider, provider_subject, display_name, email)
         values ($1, $2, $3, $4, null)`,
        [userId, provider, subject, displayName],
      );
    } else {
      await client.query(
        `update identities set display_name = $3, email = null
         where provider = $1 and provider_subject = $2`,
        [provider, subject, displayName],
      );
    }
    await client.query("release savepoint identity_email");
  }
}

export async function linkIdentity(input: {
  provider: string;
  subject: string;
  currentUserId: string | null;
  displayName: string;
  email: string | null;
}) {
  if (!providers.has(input.provider) || input.subject.length === 0 || input.subject.length > 256) {
    throw new Error("Invalid identity");
  }
  const currentUserId =
    input.currentUserId !== null && uuidPattern.test(input.currentUserId) ? input.currentUserId : null;
  const displayName = cleanDisplayName(input.displayName, input.provider === "steam" ? "Steam" : "Google");
  const email = normalizeEmail(input.email);

  return withTransaction(async (client) => {
    // Serializes the first-user owner flag with the identity insert.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", ["landsraad-identity"]);

    const existing = await client.query<{ user_id: string }>(
      "select user_id from identities where provider = $1 and provider_subject = $2",
      [input.provider, input.subject],
    );
    const ownerId = existing.rows[0]?.user_id;
    if (ownerId) {
      if (currentUserId !== null && currentUserId !== ownerId) throw new IdentityTaken();
      await storeLabel(client, "update", ownerId, input.provider, input.subject, displayName, email);
      return ownerId;
    }

    let userId = currentUserId;
    if (userId) {
      const user = await client.query("select 1 from users where id = $1", [userId]);
      if (user.rows.length === 0) userId = null;
    }
    if (!userId) {
      const created = await client.query<{ id: string }>(
        `insert into users (is_owner)
         values ((select not exists (select 1 from users where is_owner)))
         returning id`,
      );
      userId = created.rows[0].id;
    }

    await storeLabel(client, "insert", userId, input.provider, input.subject, displayName, email);
    return userId;
  });
}

export async function findUserId(provider: string, subject: string) {
  const result = await getPool().query<{ user_id: string }>(
    "select user_id from identities where provider = $1 and provider_subject = $2",
    [provider, subject],
  );
  return result.rows[0]?.user_id ?? null;
}

export async function accountSummary(userId: string) {
  if (!uuidPattern.test(userId)) return null;
  const user = await getPool().query<{ is_owner: boolean }>(
    "select is_owner from users where id = $1",
    [userId],
  );
  if (user.rows.length === 0) return null;
  const identities = await getPool().query<{ provider: string; display_name: string }>(
    "select provider, display_name from identities where user_id = $1 order by created_at",
    [userId],
  );
  return {
    isOwner: user.rows[0].is_owner,
    providers: identities.rows.map((row) => row.provider),
    labels: identities.rows.map((row) => ({
      provider: row.provider,
      displayName: row.display_name,
    })),
  };
}
