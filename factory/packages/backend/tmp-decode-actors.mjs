import { Database } from "bun:sqlite";
import { TO_CLIENT_VERSIONED, decodeWorkflowHistoryTransport } from "rivetkit/inspector";

const targets = [
  { actorId: "2e443238457137bf", handoffId: "7df7656e-bbd2-4b8c-bf0f-30d4df2f619a" },
  { actorId: "0e53dd77ef06862f", handoffId: "0e01a31c-2dc1-4a1d-8ab0-9f0816359a85" },
  { actorId: "ea8c0e764c836e5f", handoffId: "cdc22436-4020-4f73-b3e7-7782fec29ae4" },
];

function decodeAscii(u8) {
  return new TextDecoder().decode(u8).replace(/[\x00-\x1F\x7F-\xFF]/g, ".");
}

function locationToNames(entry, names) {
  return entry.location.map((seg) => {
    if (seg.tag === "WorkflowNameIndex") return names[seg.val] ?? `#${seg.val}`;
    if (seg.tag === "WorkflowLoopIterationMarker") return `iter(${seg.val.iteration})`;
    return seg.tag;
  });
}

for (const t of targets) {
  const db = new Database(`/root/.local/share/sandbox-agent-factory/rivetkit/databases/${t.actorId}.db`, { readonly: true });
  const token = new TextDecoder().decode(db.query("SELECT value FROM kv WHERE hex(key)=?").get("03").value);

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:7750/gateway/${t.actorId}/inspector/connect`, [`rivet_inspector_token.${token}`]);
    ws.binaryType = "arraybuffer";
    const to = setTimeout(() => reject(new Error("timeout")), 15000);

    ws.onmessage = (ev) => {
      const data = ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : new Uint8Array(ev.data.buffer);
      const msg = TO_CLIENT_VERSIONED.deserializeWithEmbeddedVersion(data);
      if (msg.body.tag !== "Init") return;

      const wh = decodeWorkflowHistoryTransport(msg.body.val.workflowHistory);
      const entryMetadata = wh.entryMetadata;
      const enriched = wh.entries.map((e) => {
        const meta = entryMetadata.get(e.id);
        return {
          id: e.id,
          path: locationToNames(e, wh.nameRegistry).join("/"),
          kind: e.kind.tag,
          status: meta?.status ?? null,
          error: meta?.error ?? null,
          attempts: meta?.attempts ?? null,
          entryError: e.kind.tag === "WorkflowStepEntry" ? (e.kind.val.error ?? null) : null,
        };
      });

      const wfStateRow = db.query("SELECT value FROM kv WHERE hex(key)=?").get("0715041501");
      const wfState = wfStateRow?.value ? decodeAscii(new Uint8Array(wfStateRow.value)) : null;

      console.log(JSON.stringify({
        handoffId: t.handoffId,
        actorId: t.actorId,
        wfState,
        names: wh.nameRegistry,
        entries: enriched,
      }, null, 2));

      clearTimeout(to);
      ws.close();
      resolve();
    };

    ws.onerror = (err) => {
      clearTimeout(to);
      reject(err);
    };
  });
}
