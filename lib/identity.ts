import { getPool, withTransaction } from "@/lib/db";

const providers = new Set(["google", "steam"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class IdentityTaken extends Error {
  constructor() {
    super("IdentityTaken");
    this.name = "IdentityTaken";
  }
}

export async function linkIdentity(input: {
  provider: string;
  subject: string;
  currentUserId: string | null;
}) {
  if (!providers.has(input.provider) || input.subject.length === 0 || input.subject.length > 256) {
    throw new Error("Invalid identity");
  }
  const currentUserId =
    input.currentUserId !== null && uuidPattern.test(input.currentUserId) ? input.currentUserId : null;

  return withTransaction(async (client) => {
    // Serializes the first-user owner flag with the identity insert.
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", ["landsraad-identity"]);

    const existing = await client.query<{ user_id: string }>(
      "select user_id from identities where provider = $1 and provider_subject = $2",
      [input.provider, input.subject],
    );
    const ownerId = existing.rows[0]?.user_id;
    if (ownerId) {
      if (currentUserId === null || currentUserId === ownerId) return ownerId;
      throw new IdentityTaken();
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

    await client.query(
      "insert into identities (user_id, provider, provider_subject) values ($1, $2, $3)",
      [userId, input.provider, input.subject],
    );
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
  const identities = await getPool().query<{ provider: string }>(
    "select provider from identities where user_id = $1 order by created_at",
    [userId],
  );
  return {
    isOwner: user.rows[0].is_owner,
    providers: identities.rows.map((row) => row.provider),
  };
}
