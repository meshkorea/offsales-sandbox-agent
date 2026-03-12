// @ts-nocheck
import { eq } from "drizzle-orm";
import { actor } from "rivetkit";
import { userGithubDataDb } from "./db/db.js";
import { userGithubData } from "./db/schema.js";

const PROFILE_ROW_ID = 1;

interface UserGithubDataInput {
  userId: string;
}

function parseEligibleOrganizationIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  } catch {
    return [];
  }
}

function encodeEligibleOrganizationIds(value: string[]): string {
  return JSON.stringify([...new Set(value)]);
}

async function readProfileRow(c: any) {
  return await c.db.select().from(userGithubData).where(eq(userGithubData.id, PROFILE_ROW_ID)).get();
}

export const userGithub = actor({
  db: userGithubDataDb,
  createState: (_c, input: UserGithubDataInput) => ({
    userId: input.userId,
  }),
  actions: {
    async upsert(
      c,
      input: {
        githubUserId: string;
        githubLogin: string;
        displayName: string;
        email: string;
        accessToken: string;
        scopes: string[];
        eligibleOrganizationIds: string[];
      },
    ): Promise<void> {
      const now = Date.now();
      await c.db
        .insert(userGithubData)
        .values({
          id: PROFILE_ROW_ID,
          githubUserId: input.githubUserId,
          githubLogin: input.githubLogin,
          displayName: input.displayName,
          email: input.email,
          accessToken: input.accessToken,
          scopesJson: JSON.stringify(input.scopes),
          eligibleOrganizationIdsJson: encodeEligibleOrganizationIds(input.eligibleOrganizationIds),
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userGithubData.id,
          set: {
            githubUserId: input.githubUserId,
            githubLogin: input.githubLogin,
            displayName: input.displayName,
            email: input.email,
            accessToken: input.accessToken,
            scopesJson: JSON.stringify(input.scopes),
            eligibleOrganizationIdsJson: encodeEligibleOrganizationIds(input.eligibleOrganizationIds),
            updatedAt: now,
          },
        })
        .run();
    },

    async getProfile(c): Promise<{
      userId: string;
      githubUserId: string;
      githubLogin: string;
      displayName: string;
      email: string;
      eligibleOrganizationIds: string[];
    } | null> {
      const row = await readProfileRow(c);
      if (!row) {
        return null;
      }
      return {
        userId: c.state.userId,
        githubUserId: row.githubUserId,
        githubLogin: row.githubLogin,
        displayName: row.displayName,
        email: row.email,
        eligibleOrganizationIds: parseEligibleOrganizationIds(row.eligibleOrganizationIdsJson),
      };
    },

    async getAuth(c): Promise<{ accessToken: string; scopes: string[] } | null> {
      const row = await readProfileRow(c);
      if (!row) {
        return null;
      }
      return {
        accessToken: row.accessToken,
        scopes: JSON.parse(row.scopesJson) as string[],
      };
    },
  },
});
