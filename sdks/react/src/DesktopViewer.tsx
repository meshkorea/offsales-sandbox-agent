"use client";

import type { CSSProperties, MouseEvent, WheelEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { DesktopMouseButton, DesktopStreamErrorStatus, DesktopStreamReadyStatus, DesktopStreamSession, SandboxAgent } from "sandbox-agent";

type ConnectionState = "connecting" | "ready" | "closed" | "error";

export type DesktopViewerClient = Pick<SandboxAgent, "startDesktopStream" | "stopDesktopStream" | "connectDesktopStream">;

export interface DesktopViewerProps {
  client: DesktopViewerClient;
  className?: string;
  style?: CSSProperties;
  autoStart?: boolean;
  showStatusBar?: boolean;
  tabIndex?: number;
  onConnect?: (status: DesktopStreamReadyStatus) => void;
  onDisconnect?: () => void;
  onError?: (error: DesktopStreamErrorStatus | Error) => void;
}

const shellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  width: "100%",
};

const statusBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 14px",
  fontSize: 12,
  lineHeight: 1.4,
};

const viewportStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  overflow: "hidden",
  background: "#000",
  outline: "none",
};

const videoBaseStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  userSelect: "none",
};

const hintStyle: CSSProperties = {
  opacity: 0.66,
};

const getStatusColor = (state: ConnectionState): string => {
  switch (state) {
    case "ready":
      return "#15803d";
    case "error":
      return "#b91c1c";
    case "closed":
      return "#b45309";
    default:
      return "#475569";
  }
};

export const DesktopViewer = ({
  client,
  className,
  style,
  autoStart = true,
  showStatusBar = true,
  tabIndex = 0,
  onConnect,
  onDisconnect,
  onError,
}: DesktopViewerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<DesktopStreamSession | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(autoStart ? "connecting" : "closed");
  const [statusMessage, setStatusMessage] = useState(autoStart ? "Starting desktop stream..." : "Stream not started.");
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);

  // Store callbacks and client in refs to keep them out of the effect deps.
  const onConnectRef = useRef(onConnect);
  onConnectRef.current = onConnect;
  const onDisconnectRef = useRef(onDisconnect);
  onDisconnectRef.current = onDisconnect;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const clientRef = useRef(client);
  clientRef.current = client;

  useEffect(() => {
    if (!autoStart) {
      setConnectionState("closed");
      setStatusMessage("Stream not started.");
      return;
    }

    let cancelled = false;
    setConnectionState("connecting");
    setStatusMessage("Starting desktop stream...");
    setResolution(null);

    const cl = clientRef.current;

    const connect = async () => {
      try {
        await cl.startDesktopStream();
        if (cancelled) return;

        const session = cl.connectDesktopStream();
        sessionRef.current = session;

        session.onReady((status) => {
          if (cancelled) return;
          setResolution({ width: status.width, height: status.height });
          setStatusMessage("Negotiating WebRTC...");
          onConnectRef.current?.(status);
        });

        session.onTrack((stream) => {
          if (cancelled) return;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setConnectionState("ready");
          setStatusMessage("Desktop stream connected.");
          // Grab keyboard focus when connected.
          wrapperRef.current?.focus();
        });

        session.onConnect(() => {
          if (cancelled) return;
          setConnectionState("ready");
          setStatusMessage("Desktop stream connected.");
          wrapperRef.current?.focus();
        });

        session.onError((error) => {
          if (cancelled) return;
          setConnectionState("error");
          setStatusMessage(error instanceof Error ? error.message : error.message);
          onErrorRef.current?.(error);
        });

        session.onDisconnect(() => {
          if (cancelled) return;
          setConnectionState((cur) => (cur === "error" ? cur : "closed"));
          setStatusMessage((cur) => (cur === "Desktop stream connected." ? "Desktop stream disconnected." : cur));
          onDisconnectRef.current?.();
        });
      } catch (error) {
        if (cancelled) return;
        const nextError = error instanceof Error ? error : new Error("Failed to start desktop stream.");
        setConnectionState("error");
        setStatusMessage(nextError.message);
        onErrorRef.current?.(nextError);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      const session = sessionRef.current;
      if (session) {
        session.close();
        sessionRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      // Note: we do NOT call stopDesktopStream() here. The parent component
      // manages the stream lifecycle. Calling stop on unmount would kill the
      // streaming process and race with subsequent mounts.
    };
  }, [autoStart]);

  const scalePoint = (clientX: number, clientY: number) => {
    const video = videoRef.current;
    if (!video || !resolution) return null;
    const rect = video.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = Math.max(0, Math.min(resolution.width, ((clientX - rect.left) / rect.width) * resolution.width));
    const y = Math.max(0, Math.min(resolution.height, ((clientY - rect.top) / rect.height) * resolution.height));
    return { x: Math.round(x), y: Math.round(y) };
  };

  const buttonFromMouseEvent = (event: MouseEvent<HTMLDivElement>): DesktopMouseButton => {
    switch (event.button) {
      case 1:
        return "middle";
      case 2:
        return "right";
      default:
        return "left";
    }
  };

  const withSession = (fn: (s: DesktopStreamSession) => void) => {
    const s = sessionRef.current;
    if (s) fn(s);
  };

  return (
    <div className={className} style={{ ...shellStyle, ...style }}>
      {showStatusBar && (
        <div style={statusBarStyle}>
          <span style={{ color: getStatusColor(connectionState) }}>{statusMessage}</span>
          <span style={hintStyle}>{resolution ? `${resolution.width}\u00d7${resolution.height}` : "Awaiting stream"}</span>
        </div>
      )}
      <div
        ref={wrapperRef}
        role="application"
        tabIndex={tabIndex}
        style={viewportStyle}
        onMouseMove={(event) => {
          const point = scalePoint(event.clientX, event.clientY);
          if (!point) return;
          withSession((s) => s.moveMouse(point.x, point.y));
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          // Ensure keyboard focus stays on the viewport when clicking.
          wrapperRef.current?.focus();
          const point = scalePoint(event.clientX, event.clientY);
          if (!point) return;
          withSession((s) => s.mouseDown(buttonFromMouseEvent(event), point.x, point.y));
        }}
        onMouseUp={(event) => {
          const point = scalePoint(event.clientX, event.clientY);
          if (!point) return;
          withSession((s) => s.mouseUp(buttonFromMouseEvent(event), point.x, point.y));
        }}
        onWheel={(event: WheelEvent<HTMLDivElement>) => {
          event.preventDefault();
          const point = scalePoint(event.clientX, event.clientY);
          if (!point) return;
          withSession((s) => s.scroll(point.x, point.y, Math.round(event.deltaX), Math.round(event.deltaY)));
        }}
        onKeyDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          withSession((s) => s.keyDown(event.key));
        }}
        onKeyUp={(event) => {
          event.stopPropagation();
          withSession((s) => s.keyUp(event.key));
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <video ref={videoRef} autoPlay playsInline muted style={videoBaseStyle} />
      </div>
    </div>
  );
};
