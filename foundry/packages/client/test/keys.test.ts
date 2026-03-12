import { describe, expect, it } from "vitest";
import { githubStateKey, historyKey, organizationKey, repositoryKey, sandboxInstanceKey, taskKey, taskStatusSyncKey } from "../src/keys.js";

describe("actor keys", () => {
  it("prefixes every key with organization namespace", () => {
    const keys = [
      organizationKey("default"),
      repositoryKey("default", "repo"),
      githubStateKey("default"),
      taskKey("default", "repo", "task"),
      sandboxInstanceKey("default", "daytona", "sbx"),
      historyKey("default", "repo"),
      taskStatusSyncKey("default", "repo", "task", "sandbox-1", "session-1"),
    ];

    for (const key of keys) {
      expect(key[0]).toBe("org");
      expect(key[1]).toBe("default");
    }
  });
});
