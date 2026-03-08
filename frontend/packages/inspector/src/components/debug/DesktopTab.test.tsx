// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SandboxAgent } from "sandbox-agent";
import DesktopTab from "./DesktopTab";

type MockDesktopClient = Pick<
  SandboxAgent,
  "getDesktopStatus" | "startDesktop" | "stopDesktop" | "takeDesktopScreenshot"
>;

describe("DesktopTab", () => {
  let container: HTMLDivElement;
  let root: Root;
  let createObjectUrl: ReturnType<typeof vi.fn>;
  let revokeObjectUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    createObjectUrl = vi.fn(() => "blob:test-screenshot");
    revokeObjectUrl = vi.fn();
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: createObjectUrl,
        revokeObjectURL: revokeObjectUrl,
      }),
    );
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders install remediation when desktop deps are missing", async () => {
    const client = {
      getDesktopStatus: vi.fn().mockResolvedValue({
        state: "install_required",
        display: null,
        resolution: null,
        startedAt: null,
        lastError: {
          code: "desktop_dependencies_missing",
          message: "Desktop dependencies are not installed",
        },
        missingDependencies: ["Xvfb", "openbox"],
        installCommand: "sandbox-agent install desktop --yes",
        processes: [],
        runtimeLogPath: "/tmp/runtime.log",
      }),
      startDesktop: vi.fn(),
      stopDesktop: vi.fn(),
      takeDesktopScreenshot: vi.fn(),
    } as unknown as MockDesktopClient;

    await act(async () => {
      root.render(<DesktopTab getClient={() => client as unknown as SandboxAgent} />);
    });

    expect(container.textContent).toContain("install_required");
    expect(container.textContent).toContain("sandbox-agent install desktop --yes");
    expect(container.textContent).toContain("Xvfb");
    expect(client.getDesktopStatus).toHaveBeenCalledTimes(1);
  });

  it("starts desktop, refreshes screenshot, and stops desktop", async () => {
    const client = {
      getDesktopStatus: vi.fn().mockResolvedValue({
        state: "inactive",
        display: null,
        resolution: null,
        startedAt: null,
        lastError: null,
        missingDependencies: [],
        installCommand: null,
        processes: [],
        runtimeLogPath: null,
      }),
      startDesktop: vi.fn().mockResolvedValue({
        state: "active",
        display: ":99",
        resolution: { width: 1440, height: 900, dpi: 96 },
        startedAt: "2026-03-07T00:00:00Z",
        lastError: null,
        missingDependencies: [],
        installCommand: null,
        processes: [],
        runtimeLogPath: "/tmp/runtime.log",
      }),
      stopDesktop: vi.fn().mockResolvedValue({
        state: "inactive",
        display: null,
        resolution: null,
        startedAt: null,
        lastError: null,
        missingDependencies: [],
        installCommand: null,
        processes: [],
        runtimeLogPath: "/tmp/runtime.log",
      }),
      takeDesktopScreenshot: vi.fn().mockResolvedValue(
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      ),
    } as unknown as MockDesktopClient;

    await act(async () => {
      root.render(<DesktopTab getClient={() => client as unknown as SandboxAgent} />);
    });

    const startButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Start Desktop"),
    );
    expect(startButton).toBeTruthy();

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await vi.runAllTimersAsync();
    });

    expect(client.startDesktop).toHaveBeenCalledTimes(1);
    expect(client.takeDesktopScreenshot).toHaveBeenCalled();
    const screenshot = container.querySelector("img[alt='Desktop screenshot']") as HTMLImageElement | null;
    expect(screenshot?.src).toContain("blob:test-screenshot");

    const stopButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Stop Desktop"),
    );
    expect(stopButton).toBeTruthy();

    await act(async () => {
      stopButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await vi.runAllTimersAsync();
    });

    expect(client.stopDesktop).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("inactive");
  });
});
