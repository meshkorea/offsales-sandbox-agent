import { describe, expect, it } from "vitest";
import type { BackendClient } from "../src/backend-client.js";
import { createHandoffWorkbenchClient } from "../src/workbench-client.js";

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("createHandoffWorkbenchClient", () => {
  it("scopes mock clients by workspace", async () => {
    const alpha = createHandoffWorkbenchClient({
      mode: "mock",
      workspaceId: "mock-alpha",
    });
    const beta = createHandoffWorkbenchClient({
      mode: "mock",
      workspaceId: "mock-beta",
    });

    const alphaInitial = alpha.getSnapshot();
    const betaInitial = beta.getSnapshot();
    expect(alphaInitial.workspaceId).toBe("mock-alpha");
    expect(betaInitial.workspaceId).toBe("mock-beta");

    await alpha.createHandoff({
      repoId: alphaInitial.repos[0]!.id,
      task: "Ship alpha-only change",
      title: "Alpha only",
    });

    expect(alpha.getSnapshot().handoffs).toHaveLength(alphaInitial.handoffs.length + 1);
    expect(beta.getSnapshot().handoffs).toHaveLength(betaInitial.handoffs.length);
  });

  it("uses the initial task to bootstrap a new mock handoff session", async () => {
    const client = createHandoffWorkbenchClient({
      mode: "mock",
      workspaceId: "mock-onboarding",
    });
    const snapshot = client.getSnapshot();

    const created = await client.createHandoff({
      repoId: snapshot.repos[0]!.id,
      task: "Reply with exactly: MOCK_WORKBENCH_READY",
      title: "Mock onboarding",
      branch: "feat/mock-onboarding",
      model: "gpt-4o",
    });

    const runningHandoff = client.getSnapshot().handoffs.find((handoff) => handoff.id === created.handoffId);
    expect(runningHandoff).toEqual(
      expect.objectContaining({
        title: "Mock onboarding",
        branch: "feat/mock-onboarding",
        status: "running",
      }),
    );
    expect(runningHandoff?.tabs[0]).toEqual(
      expect.objectContaining({
        id: created.tabId,
        created: true,
        status: "running",
      }),
    );
    expect(runningHandoff?.tabs[0]?.transcript).toEqual([
      expect.objectContaining({
        sender: "client",
        payload: expect.objectContaining({
          method: "session/prompt",
        }),
      }),
    ]);

    await sleep(2_700);

    const completedHandoff = client.getSnapshot().handoffs.find((handoff) => handoff.id === created.handoffId);
    expect(completedHandoff?.status).toBe("idle");
    expect(completedHandoff?.tabs[0]).toEqual(
      expect.objectContaining({
        status: "idle",
        unread: true,
      }),
    );
    expect(completedHandoff?.tabs[0]?.transcript).toEqual([
      expect.objectContaining({ sender: "client" }),
      expect.objectContaining({ sender: "agent" }),
    ]);
  });

  it("routes remote push actions through the backend boundary", async () => {
    const actions: Array<{ workspaceId: string; handoffId: string; action: string }> = [];
    let snapshotReads = 0;
    const backend = {
      async runAction(workspaceId: string, handoffId: string, action: string): Promise<void> {
        actions.push({ workspaceId, handoffId, action });
      },
      async getWorkbench(workspaceId: string) {
        snapshotReads += 1;
        return {
          workspaceId,
          repos: [],
          projects: [],
          handoffs: [],
        };
      },
      subscribeWorkbench(): () => void {
        return () => {};
      },
    } as unknown as BackendClient;

    const client = createHandoffWorkbenchClient({
      mode: "remote",
      backend,
      workspaceId: "remote-ws",
    });

    await client.pushHandoff({ handoffId: "handoff-123" });

    expect(actions).toEqual([
      {
        workspaceId: "remote-ws",
        handoffId: "handoff-123",
        action: "push",
      },
    ]);
    expect(snapshotReads).toBe(1);
  });
});
