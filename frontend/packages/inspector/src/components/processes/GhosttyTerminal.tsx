import { AlertCircle, Loader2, PlugZap, SquareTerminal } from "lucide-react";
import { FitAddon, Terminal, init } from "ghostty-web";
import { useEffect, useRef, useState } from "react";
import type { SandboxAgent } from "sandbox-agent";

type ProcessTerminalClientFrame =
  | {
      type: "input";
      data: string;
      encoding?: string;
    }
  | {
      type: "resize";
      cols: number;
      rows: number;
    }
  | {
      type: "close";
    };

type ProcessTerminalServerFrame =
  | {
      type: "ready";
      processId: string;
    }
  | {
      type: "exit";
      exitCode?: number | null;
    }
  | {
      type: "error";
      message: string;
    };

type ConnectionState = "connecting" | "ready" | "closed" | "error";

const terminalTheme = {
  background: "#09090b",
  foreground: "#f4f4f5",
  cursor: "#f97316",
  cursorAccent: "#09090b",
  selectionBackground: "#27272a",
  black: "#18181b",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#fbbf24",
  blue: "#60a5fa",
  magenta: "#f472b6",
  cyan: "#22d3ee",
  white: "#e4e4e7",
  brightBlack: "#3f3f46",
  brightRed: "#fb7185",
  brightGreen: "#86efac",
  brightYellow: "#fde047",
  brightBlue: "#93c5fd",
  brightMagenta: "#f9a8d4",
  brightCyan: "#67e8f9",
  brightWhite: "#fafafa",
};

const GhosttyTerminal = ({
  client,
  processId,
  onExit,
}: {
  client: SandboxAgent;
  processId: string;
  onExit?: () => void;
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [statusMessage, setStatusMessage] = useState("Connecting to PTY...");
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let terminal: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let socket: WebSocket | null = null;
    let resizeRaf = 0;
    let removeDataListener: { dispose(): void } | null = null;
    let removeResizeListener: { dispose(): void } | null = null;

    const syncSize = () => {
      if (!terminal || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      const frame: ProcessTerminalClientFrame = {
        type: "resize",
        cols: terminal.cols,
        rows: terminal.rows,
      };
      socket.send(JSON.stringify(frame));
    };

    const connect = async () => {
      try {
        await init();
        if (cancelled || !hostRef.current) {
          return;
        }

        terminal = new Terminal({
          allowTransparency: true,
          cursorBlink: true,
          cursorStyle: "block",
          fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace",
          fontSize: 13,
          smoothScrollDuration: 90,
          theme: terminalTheme,
        });
        fitAddon = new FitAddon();

        terminal.open(hostRef.current);
        terminal.loadAddon(fitAddon);
        fitAddon.fit();
        fitAddon.observeResize();
        terminal.focus();

        removeDataListener = terminal.onData((data) => {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            return;
          }
          const frame: ProcessTerminalClientFrame = {
            type: "input",
            data,
          };
          socket.send(JSON.stringify(frame));
        });

        removeResizeListener = terminal.onResize(() => {
          if (resizeRaf) {
            window.cancelAnimationFrame(resizeRaf);
          }
          resizeRaf = window.requestAnimationFrame(syncSize);
        });

        const nextSocket = client.connectProcessTerminalWebSocket(processId);
        nextSocket.binaryType = "arraybuffer";
        socket = nextSocket;

        nextSocket.addEventListener("message", async (event) => {
          if (cancelled) {
            return;
          }

          if (typeof event.data === "string") {
            const frame = parseServerFrame(event.data);
            if (!frame) {
              setConnectionState("error");
              setStatusMessage("Received invalid terminal control frame.");
              return;
            }

            if (frame.type === "ready") {
              setConnectionState("ready");
              setStatusMessage("Connected");
              syncSize();
              return;
            }

            if (frame.type === "exit") {
              setConnectionState("closed");
              setExitCode(frame.exitCode ?? null);
              setStatusMessage(
                frame.exitCode == null ? "Process exited." : `Process exited with code ${frame.exitCode}.`
              );
              onExit?.();
              return;
            }

            setConnectionState("error");
            setStatusMessage(frame.message);
            return;
          }

          if (!terminal) {
            return;
          }

          const bytes = await decodeBinaryFrame(event.data);
          if (!cancelled) {
            terminal.write(bytes);
          }
        });

        nextSocket.addEventListener("error", () => {
          if (cancelled) {
            return;
          }
          setConnectionState("error");
          setStatusMessage("Terminal websocket connection failed.");
        });

        nextSocket.addEventListener("close", () => {
          if (cancelled) {
            return;
          }
          setConnectionState((current) => (current === "error" ? current : "closed"));
          setStatusMessage((current) => (current === "Connected" ? "Terminal disconnected." : current));
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setConnectionState("error");
        setStatusMessage(error instanceof Error ? error.message : "Failed to initialize Ghostty terminal.");
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (resizeRaf) {
        window.cancelAnimationFrame(resizeRaf);
      }
      removeDataListener?.dispose();
      removeResizeListener?.dispose();
      if (socket?.readyState === WebSocket.OPEN) {
        const frame: ProcessTerminalClientFrame = { type: "close" };
        socket.send(JSON.stringify(frame));
      }
      socket?.close();
      terminal?.dispose();
    };
  }, [client, onExit, processId]);

  return (
    <div className="process-terminal-shell">
      <div className="process-terminal-meta">
        <div className="inline-row">
          <SquareTerminal size={13} />
          <span>Ghostty PTY</span>
        </div>
        <div className={`process-terminal-status ${connectionState}`}>
          {connectionState === "connecting" ? <Loader2 size={12} className="spinner-icon" /> : null}
          {connectionState === "ready" ? <PlugZap size={12} /> : null}
          {connectionState === "error" ? <AlertCircle size={12} /> : null}
          <span>{statusMessage}</span>
          {exitCode != null ? <span className="mono">exit={exitCode}</span> : null}
        </div>
      </div>
      <div
        ref={hostRef}
        className="process-terminal-host"
        role="presentation"
        onClick={() => {
          hostRef.current?.querySelector("textarea")?.focus();
        }}
      />
    </div>
  );
};

function parseServerFrame(payload: string): ProcessTerminalServerFrame | null {
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      return null;
    }

    if (
      parsed.type === "ready" &&
      "processId" in parsed &&
      typeof parsed.processId === "string"
    ) {
      return parsed as ProcessTerminalServerFrame;
    }

    if (
      parsed.type === "exit" &&
      (!("exitCode" in parsed) ||
        parsed.exitCode == null ||
        typeof parsed.exitCode === "number")
    ) {
      return parsed as ProcessTerminalServerFrame;
    }

    if (
      parsed.type === "error" &&
      "message" in parsed &&
      typeof parsed.message === "string"
    ) {
      return parsed as ProcessTerminalServerFrame;
    }
  } catch {
    return null;
  }

  return null;
}

async function decodeBinaryFrame(data: unknown): Promise<Uint8Array> {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }

  throw new Error(`Unsupported terminal payload: ${String(data)}`);
}

export default GhosttyTerminal;
