import { Database } from "bun:sqlite";
import {
  TO_CLIENT_VERSIONED,
  TO_SERVER_VERSIONED,
  CURRENT_VERSION,
  decodeWorkflowHistoryTransport,
} from "rivetkit/inspector";
import { decodeReadRangeWire } from "/rivet-handoff-fixes/rivetkit-typescript/packages/traces/src/encoding.ts";
import { readRangeWireToOtlp } from "/rivet-handoff-fixes/rivetkit-typescript/packages/traces/src/read-range.ts";

const actorId = "2e443238457137bf";
const db = new Database(`/root/.local/share/sandbox-agent-factory/rivetkit/databases/${actorId}.db`, { readonly: true });
const row = db.query("SELECT value FROM kv WHERE hex(key)=?").get("03");
const token = new TextDecoder().decode(row.value);

const ws = new WebSocket(`ws://127.0.0.1:7750/gateway/${actorId}/inspector/connect`, [`rivet_inspector_token.${token}`]);
ws.binaryType = "arraybuffer";

let sent = false;
const timeout = setTimeout(() => {
  console.error("timeout");
  process.exit(2);
}, 20000);

function send(body) {
  const bytes = TO_SERVER_VERSIONED.serializeWithEmbeddedVersion({ body }, CURRENT_VERSION);
  ws.send(bytes);
}

ws.onmessage = (ev) => {
  const data = ev.data instanceof ArrayBuffer ? new Uint8Array(ev.data) : new Uint8Array(ev.data.buffer);
  const msg = TO_CLIENT_VERSIONED.deserializeWithEmbeddedVersion(data);

  if (!sent && msg.body.tag === "Init") {
    const init = msg.body.val;
    const wh = decodeWorkflowHistoryTransport(init.workflowHistory);
    const queueSize = Number(init.queueSize);
    console.log(JSON.stringify({ tag: "InitSummary", queueSize, rpcs: init.rpcs, historyEntries: wh.entries.length, names: wh.nameRegistry }, null, 2));

    send({ tag: "QueueRequest", val: { id: 1n, limit: 20n } });
    send({ tag: "WorkflowHistoryRequest", val: { id: 2n } });
    send({ tag: "TraceQueryRequest", val: { id: 3n, startMs: 0n, endMs: BigInt(Date.now()), limit: 2000n } });
    sent = true;
    return;
  }

  if (msg.body.tag === "QueueResponse") {
    const status = msg.body.val.status;
    console.log(JSON.stringify({ tag: "QueueResponse", size: Number(status.size), truncated: status.truncated, messages: status.messages.map((m) => ({ id: Number(m.id), name: m.name, createdAtMs: Number(m.createdAtMs) })) }, null, 2));
    return;
  }

  if (msg.body.tag === "WorkflowHistoryResponse") {
    const wh = decodeWorkflowHistoryTransport(msg.body.val.history);
    console.log(JSON.stringify({ tag: "WorkflowHistoryResponse", isWorkflowEnabled: msg.body.val.isWorkflowEnabled, entryCount: wh.entries.length, names: wh.nameRegistry }, null, 2));
    return;
  }

  if (msg.body.tag === "TraceQueryResponse") {
    const wire = decodeReadRangeWire(new Uint8Array(msg.body.val.payload));
    const otlp = readRangeWireToOtlp(wire, { attributes: [], droppedAttributesCount: 0 });
    const spans = (((otlp?.resourceSpans ?? [])[0]?.scopeSpans ?? [])[0]?.spans ?? []).map((s) => ({ name: s.name, status: s.status?.code }));
    console.log(JSON.stringify({ tag: "TraceQueryResponse", spanCount: spans.length, tail: spans.slice(-25) }, null, 2));
    clearTimeout(timeout);
    ws.close();
    process.exit(0);
    return;
  }
};

ws.onerror = (e) => {
  console.error("ws error", e);
  clearTimeout(timeout);
  process.exit(1);
};
