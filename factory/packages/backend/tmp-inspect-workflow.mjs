import { Database } from "bun:sqlite";
import { TO_CLIENT_VERSIONED, decodeWorkflowHistoryTransport } from "rivetkit/inspector";
import util from "node:util";

const actorId = "2e443238457137bf";
const db = new Database(`/root/.local/share/sandbox-agent-factory/rivetkit/databases/${actorId}.db`, { readonly: true });
const row = db.query("SELECT value FROM kv WHERE hex(key) = ?").get("03");
const token = new TextDecoder().decode(row.value);

const ws = new WebSocket(`ws://127.0.0.1:7750/gateway/${actorId}/inspector/connect`, [`rivet_inspector_token.${token}`]);
ws.binaryType = "arraybuffer";
const timeout = setTimeout(() => process.exit(2), 15000);
ws.onmessage = (ev) => {
  const data = ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : new Uint8Array(ev.data.buffer);
  const msg = TO_CLIENT_VERSIONED.deserializeWithEmbeddedVersion(data);
  const init = msg.body?.tag === "Init" ? msg.body.val : null;
  if (!init) {
    console.log("unexpected", util.inspect(msg, { depth: 4 }));
    process.exit(1);
  }
  const decoded = decodeWorkflowHistoryTransport(init.workflowHistory);
  console.log(util.inspect(decoded, { depth: 10, colors: false, compact: false, breakLength: 140 }));
  clearTimeout(timeout);
  ws.close();
  process.exit(0);
};
ws.onerror = () => {
  clearTimeout(timeout);
  process.exit(1);
};
