import type { DesktopMouseButton } from "./types.ts";

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSED = 3;

export interface DesktopStreamReadyStatus {
  type: "ready";
  width: number;
  height: number;
}

export interface DesktopStreamErrorStatus {
  type: "error";
  message: string;
}

export type DesktopStreamStatusMessage = DesktopStreamReadyStatus | DesktopStreamErrorStatus;

export interface DesktopStreamConnectOptions {
  accessToken?: string;
  WebSocket?: typeof WebSocket;
  protocols?: string | string[];
  RTCPeerConnection?: typeof RTCPeerConnection;
  rtcConfig?: RTCConfiguration;
}

/**
 * Data channel binary input protocol (Big Endian).
 *
 * Byte 0: opcode
 *   0x01 = mouse_move    (bytes 1-2: u16 BE x, bytes 3-4: u16 BE y)
 *   0x02 = mouse_down    (byte 1: u8 button)
 *   0x03 = mouse_up      (byte 1: u8 button)
 *   0x04 = mouse_scroll  (bytes 1-2: i16 BE dx, bytes 3-4: i16 BE dy)
 *   0x05 = key_down      (bytes 1-4: u32 BE keysym)
 *   0x06 = key_up        (bytes 1-4: u32 BE keysym)
 */
const OP_MOUSE_MOVE = 0x01;
const OP_MOUSE_DOWN = 0x02;
const OP_MOUSE_UP = 0x03;
const OP_MOUSE_SCROLL = 0x04;
const OP_KEY_DOWN = 0x05;
const OP_KEY_UP = 0x06;

function mouseButtonToX11(button?: DesktopMouseButton): number {
  switch (button) {
    case "middle":
      return 2;
    case "right":
      return 3;
    default:
      return 1;
  }
}

function keyToX11Keysym(key: string): number {
  if (key.length === 1) {
    const cp = key.charCodeAt(0);
    if (cp >= 0x20 && cp <= 0x7e) return cp;
    return 0x01000000 + cp;
  }

  const map: Record<string, number> = {
    Backspace: 0xff08,
    Tab: 0xff09,
    Return: 0xff0d,
    Enter: 0xff0d,
    Escape: 0xff1b,
    Delete: 0xffff,
    Home: 0xff50,
    Left: 0xff51,
    ArrowLeft: 0xff51,
    Up: 0xff52,
    ArrowUp: 0xff52,
    Right: 0xff53,
    ArrowRight: 0xff53,
    Down: 0xff54,
    ArrowDown: 0xff54,
    PageUp: 0xff55,
    PageDown: 0xff56,
    End: 0xff57,
    Insert: 0xff63,
    F1: 0xffbe,
    F2: 0xffbf,
    F3: 0xffc0,
    F4: 0xffc1,
    F5: 0xffc2,
    F6: 0xffc3,
    F7: 0xffc4,
    F8: 0xffc5,
    F9: 0xffc6,
    F10: 0xffc7,
    F11: 0xffc8,
    F12: 0xffc9,
    Shift: 0xffe1,
    ShiftLeft: 0xffe1,
    ShiftRight: 0xffe2,
    Control: 0xffe3,
    ControlLeft: 0xffe3,
    ControlRight: 0xffe4,
    Alt: 0xffe9,
    AltLeft: 0xffe9,
    AltRight: 0xffea,
    Meta: 0xffeb,
    MetaLeft: 0xffeb,
    MetaRight: 0xffec,
    CapsLock: 0xffe5,
    NumLock: 0xff7f,
    ScrollLock: 0xff14,
    " ": 0x0020,
    Space: 0x0020,
  };

  return map[key] ?? 0;
}

export class DesktopStreamSession {
  readonly socket: WebSocket;
  readonly closed: Promise<void>;

  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private mediaStream: MediaStream | null = null;
  private connected = false;
  private pendingCandidates: Record<string, unknown>[] = [];
  private cachedReadyStatus: DesktopStreamReadyStatus | null = null;

  private readonly readyListeners = new Set<(status: DesktopStreamReadyStatus) => void>();
  private readonly trackListeners = new Set<(stream: MediaStream) => void>();
  private readonly connectListeners = new Set<() => void>();
  private readonly disconnectListeners = new Set<() => void>();
  private readonly errorListeners = new Set<(error: DesktopStreamErrorStatus | Error) => void>();

  private closedResolve!: () => void;
  private readonly PeerConnection: typeof RTCPeerConnection;
  private readonly rtcConfig: RTCConfiguration;

  constructor(socket: WebSocket, options: DesktopStreamConnectOptions = {}) {
    this.socket = socket;
    this.PeerConnection = options.RTCPeerConnection ?? globalThis.RTCPeerConnection;
    this.rtcConfig = options.rtcConfig ?? {};

    this.closed = new Promise<void>((resolve) => {
      this.closedResolve = resolve;
    });

    this.socket.addEventListener("message", (event) => {
      this.handleMessage(event.data as string);
    });
    this.socket.addEventListener("error", () => {
      this.emitError(new Error("Desktop stream signaling connection failed."));
    });
    this.socket.addEventListener("close", () => {
      this.teardownPeerConnection();
      this.closedResolve();
      for (const listener of this.disconnectListeners) {
        listener();
      }
    });
  }

  onReady(listener: (status: DesktopStreamReadyStatus) => void): () => void {
    this.readyListeners.add(listener);
    if (this.cachedReadyStatus) {
      listener(this.cachedReadyStatus);
    }
    return () => {
      this.readyListeners.delete(listener);
    };
  }

  onTrack(listener: (stream: MediaStream) => void): () => void {
    this.trackListeners.add(listener);
    if (this.mediaStream) {
      listener(this.mediaStream);
    }
    return () => {
      this.trackListeners.delete(listener);
    };
  }

  onConnect(listener: () => void): () => void {
    this.connectListeners.add(listener);
    return () => {
      this.connectListeners.delete(listener);
    };
  }

  onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.add(listener);
    return () => {
      this.disconnectListeners.delete(listener);
    };
  }

  onError(listener: (error: DesktopStreamErrorStatus | Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /** @deprecated Use onDisconnect instead. */
  onClose(listener: () => void): () => void {
    return this.onDisconnect(listener);
  }

  /** @deprecated No longer emits JPEG frames. Use onTrack for WebRTC media. */
  onFrame(_listener: (frame: Uint8Array) => void): () => void {
    return () => {};
  }

  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  moveMouse(x: number, y: number): void {
    if (this.dataChannel?.readyState === "open") {
      const buf = new ArrayBuffer(5);
      const view = new DataView(buf);
      view.setUint8(0, OP_MOUSE_MOVE);
      view.setUint16(1, x, false);
      view.setUint16(3, y, false);
      this.dataChannel.send(buf);
    } else {
      this.sendSignaling("moveMouse", { x, y });
    }
  }

  mouseDown(button?: DesktopMouseButton, x?: number, y?: number): void {
    if (x != null && y != null) {
      this.moveMouse(x, y);
    }
    if (this.dataChannel?.readyState === "open") {
      const buf = new ArrayBuffer(2);
      const view = new DataView(buf);
      view.setUint8(0, OP_MOUSE_DOWN);
      view.setUint8(1, mouseButtonToX11(button));
      this.dataChannel.send(buf);
    } else {
      this.sendSignaling("mouseDown", { button, x, y });
    }
  }

  mouseUp(button?: DesktopMouseButton, x?: number, y?: number): void {
    if (x != null && y != null) {
      this.moveMouse(x, y);
    }
    if (this.dataChannel?.readyState === "open") {
      const buf = new ArrayBuffer(2);
      const view = new DataView(buf);
      view.setUint8(0, OP_MOUSE_UP);
      view.setUint8(1, mouseButtonToX11(button));
      this.dataChannel.send(buf);
    } else {
      this.sendSignaling("mouseUp", { button, x, y });
    }
  }

  scroll(x: number, y: number, deltaX?: number, deltaY?: number): void {
    this.moveMouse(x, y);
    if (this.dataChannel?.readyState === "open") {
      const buf = new ArrayBuffer(5);
      const view = new DataView(buf);
      view.setUint8(0, OP_MOUSE_SCROLL);
      view.setInt16(1, deltaX ?? 0, false);
      view.setInt16(3, deltaY ?? 0, false);
      this.dataChannel.send(buf);
    } else {
      this.sendSignaling("scroll", { x, y, deltaX, deltaY });
    }
  }

  keyDown(key: string): void {
    const keysym = keyToX11Keysym(key);
    if (keysym === 0) return;
    if (this.dataChannel?.readyState === "open") {
      const buf = new ArrayBuffer(5);
      const view = new DataView(buf);
      view.setUint8(0, OP_KEY_DOWN);
      view.setUint32(1, keysym, false);
      this.dataChannel.send(buf);
    } else {
      this.sendSignaling("keyDown", { key });
    }
  }

  keyUp(key: string): void {
    const keysym = keyToX11Keysym(key);
    if (keysym === 0) return;
    if (this.dataChannel?.readyState === "open") {
      const buf = new ArrayBuffer(5);
      const view = new DataView(buf);
      view.setUint8(0, OP_KEY_UP);
      view.setUint32(1, keysym, false);
      this.dataChannel.send(buf);
    } else {
      this.sendSignaling("keyUp", { key });
    }
  }

  close(): void {
    this.teardownPeerConnection();
    if (this.socket.readyState !== WS_READY_STATE_CLOSED) {
      this.socket.close();
    }
  }

  private handleMessage(data: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = (msg.type as string) ?? "";

    switch (type) {
      case "ready": {
        const status: DesktopStreamReadyStatus = {
          type: "ready",
          width: Number(msg.width) || 0,
          height: Number(msg.height) || 0,
        };
        this.cachedReadyStatus = status;
        for (const listener of this.readyListeners) {
          listener(status);
        }
        break;
      }

      case "offer": {
        if (msg.sdp) {
          void this.handleOffer(msg.sdp as string);
        }
        break;
      }

      case "candidate": {
        void this.handleCandidate(msg as unknown as RTCIceCandidateInit);
        break;
      }

      case "error": {
        const errorStatus: DesktopStreamErrorStatus = {
          type: "error",
          message: (msg.message as string) ?? "Unknown error",
        };
        this.emitError(errorStatus);
        break;
      }

      default:
        break;
    }
  }

  private async handleOffer(sdp: string): Promise<void> {
    try {
      const config: RTCConfiguration = {
        ...this.rtcConfig,
        iceServers: this.rtcConfig.iceServers ?? [{ urls: "stun:stun.l.google.com:19302" }],
      };
      const pc = new this.PeerConnection(config);
      this.pc = pc;

      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        this.mediaStream = stream;
        for (const listener of this.trackListeners) {
          listener(stream);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendJson({
            type: "candidate",
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case "connected":
            if (!this.connected) {
              this.connected = true;
              for (const listener of this.connectListeners) {
                listener();
              }
            }
            break;
          case "closed":
          case "failed":
            this.emitError(new Error(`WebRTC connection ${pc.connectionState}.`));
            break;
        }
      };

      pc.oniceconnectionstatechange = () => {
        switch (pc.iceConnectionState) {
          case "connected":
            if (!this.connected) {
              this.connected = true;
              for (const listener of this.connectListeners) {
                listener();
              }
            }
            break;
          case "closed":
          case "failed":
            this.emitError(new Error(`WebRTC ICE ${pc.iceConnectionState}.`));
            break;
        }
      };

      // Server creates the data channel; client receives it.
      pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.dataChannel.binaryType = "arraybuffer";
        this.dataChannel.onerror = () => {
          this.emitError(new Error("WebRTC data channel error."));
        };
        this.dataChannel.onclose = () => {
          this.dataChannel = null;
        };
      };

      await pc.setRemoteDescription({ type: "offer", sdp });

      // Flush any ICE candidates that arrived before the PC was ready.
      for (const pending of this.pendingCandidates) {
        try {
          await pc.addIceCandidate(pending as unknown as RTCIceCandidateInit);
        } catch {
          // ignore stale candidates
        }
      }
      this.pendingCandidates = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.sendJson({ type: "answer", sdp: answer.sdp });
    } catch (error) {
      this.emitError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async handleCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) {
      this.pendingCandidates.push(candidate as unknown as Record<string, unknown>);
      return;
    }
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (error) {
      this.emitError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /** Send a JSON message to the server. */
  private sendJson(msg: Record<string, unknown>): void {
    if (this.socket.readyState !== WS_READY_STATE_OPEN) return;
    this.socket.send(JSON.stringify(msg));
  }

  /** Send a typed input message over the signaling WebSocket as fallback. */
  private sendSignaling(type: string, data: Record<string, unknown>): void {
    this.sendJson({ type, ...data });
  }

  /** Tear down the peer connection, nullifying handlers first to prevent stale
   *  callbacks. */
  private teardownPeerConnection(): void {
    if (this.dataChannel) {
      this.dataChannel.onerror = null;
      this.dataChannel.onmessage = null;
      this.dataChannel.onopen = null;
      this.dataChannel.onclose = null;
      try {
        this.dataChannel.close();
      } catch {
        /* ignore */
      }
      this.dataChannel = null;
    }
    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.onicecandidateerror = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onsignalingstatechange = null;
      this.pc.onnegotiationneeded = null;
      this.pc.ontrack = null;
      this.pc.ondatachannel = null;
      try {
        this.pc.close();
      } catch {
        /* ignore */
      }
      this.pc = null;
    }
    this.mediaStream = null;
    this.connected = false;
  }

  private emitError(error: DesktopStreamErrorStatus | Error): void {
    for (const listener of this.errorListeners) {
      listener(error);
    }
  }
}
