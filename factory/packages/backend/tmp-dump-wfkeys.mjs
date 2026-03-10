import { Database } from "bun:sqlite";

const db = new Database("/root/.local/share/sandbox-agent-factory/rivetkit/databases/2e443238457137bf.db", { readonly: true });
const rows = db.query("SELECT hex(key) as k, value as v FROM kv WHERE hex(key) LIKE ? ORDER BY key").all("07%");
const out = rows.map((r) => {
  const bytes = new Uint8Array(r.v);
  const txt = new TextDecoder().decode(bytes).replace(/[\x00-\x1F\x7F-\xFF]/g, ".");
  return { k: r.k, vlen: bytes.length, txt: txt.slice(0, 260) };
});
console.log(JSON.stringify(out, null, 2));
