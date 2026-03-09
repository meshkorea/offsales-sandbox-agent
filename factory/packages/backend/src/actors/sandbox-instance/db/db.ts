import { actorSqliteDb } from "../../../db/actor-sqlite.js";
import * as schema from "./schema.js";
import migrations from "./migrations.js";

export const sandboxInstanceDb = actorSqliteDb({
  actorName: "sandbox-instance",
  schema,
  migrations,
  migrationsFolderUrl: new URL("./drizzle/", import.meta.url),
});
