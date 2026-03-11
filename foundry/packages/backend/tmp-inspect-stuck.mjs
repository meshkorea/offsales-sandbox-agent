import { Database } from "bun:sqlite";

const actorIds = [
  "2e443238457137bf", // 7df...
  "2b3fe1c099327eed", // 706...
  "331b7f2a0cd19973", // 70c...
  "329a70fc689f56ca", // 1f14...
  "0e53dd77ef06862f", // 0e01...
  "ea8c0e764c836e5f", // cdc error
];

function decodeAscii(u8) {
  return new TextDecoder().decode(u8).replace(/[\x00-\x1F\x7F-\xFF]/g, ".");
}

for (const actorId of actorIds) {
  const dbPath = `/root/.local/share/sandbox-agent-foundry/rivetkit/databases/${actorId}.db`;
  const db = new Database(dbPath, { readonly: true });

  const wfStateRow = db.query("SELECT value FROM kv WHERE hex(key)=?").get("0715041501");
  const wfState = wfStateRow?.value ? decodeAscii(new Uint8Array(wfStateRow.value)) : null;

  const names = db
    .query("SELECT value FROM kv WHERE hex(key) LIKE ? ORDER BY key")
    .all("07150115%")
    .map((r) => decodeAscii(new Uint8Array(r.value)));

  const queueRows = db
    .query("SELECT hex(key) as k, value FROM kv WHERE hex(key) LIKE ? ORDER BY key")
    .all("05%")
    .map((r) => ({
      key: r.k,
      preview: decodeAscii(new Uint8Array(r.value)).slice(0, 220),
    }));

  const hasCreateSandboxStepName = names.includes("init-create-sandbox") || names.includes("init_create_sandbox");

  console.log(JSON.stringify({
    actorId,
    wfState,
    hasCreateSandboxStepName,
    names,
    queue: queueRows,
  }, null, 2));
}
