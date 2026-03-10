import { describe, expect, it } from "vitest";
import type { HandoffWorkbenchSnapshot } from "@sandbox-agent/factory-shared";
import { resolveRepoRouteHandoffId } from "./workbench-routing";

const snapshot: HandoffWorkbenchSnapshot = {
  workspaceId: "default",
  repos: [
    { id: "repo-a", label: "acme/repo-a" },
    { id: "repo-b", label: "acme/repo-b" },
  ],
  projects: [],
  handoffs: [
    {
      id: "handoff-a",
      repoId: "repo-a",
      title: "Alpha",
      status: "idle",
      repoName: "acme/repo-a",
      updatedAtMs: 20,
      branch: "feature/alpha",
      pullRequest: null,
      tabs: [],
      fileChanges: [],
      diffs: {},
      fileTree: [],
    },
  ],
};

describe("resolveRepoRouteHandoffId", () => {
  it("finds the active handoff for a repo route", () => {
    expect(resolveRepoRouteHandoffId(snapshot, "repo-a")).toBe("handoff-a");
  });

  it("returns null when a repo has no handoff yet", () => {
    expect(resolveRepoRouteHandoffId(snapshot, "repo-b")).toBeNull();
  });
});
