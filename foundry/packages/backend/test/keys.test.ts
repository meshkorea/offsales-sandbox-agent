import { describe, expect, it } from "vitest";
import { auditLogKey, githubDataKey, organizationKey, repositoryKey, taskKey, taskSandboxKey } from "../src/actors/keys.js";

describe("actor keys", () => {
  it("prefixes every key with organization namespace", () => {
    const keys = [
      organizationKey("default"),
      repositoryKey("default", "repo"),
      taskKey("default", "repo", "task"),
      taskSandboxKey("default", "sbx"),
      auditLogKey("default", "repo"),
      githubDataKey("default"),
    ];

    for (const key of keys) {
      expect(key[0]).toBe("org");
      expect(key[1]).toBe("default");
    }
  });
});
