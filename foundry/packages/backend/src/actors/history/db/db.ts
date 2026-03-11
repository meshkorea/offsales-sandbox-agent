import { actorSqliteDb } from "../../../db/actor-sqlite.js";
import * as schema from "./schema.js";
import migrations from "./migrations.js";

export const historyDb = actorSqliteDb({
  actorName: "history",
  schema,
  migrations,
  migrationsFolderUrl: new URL("./drizzle/", import.meta.url),
});
