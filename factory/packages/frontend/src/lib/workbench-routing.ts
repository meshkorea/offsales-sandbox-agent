import type { HandoffWorkbenchSnapshot } from "@sandbox-agent/factory-shared";

export function resolveRepoRouteHandoffId(
  snapshot: HandoffWorkbenchSnapshot,
  repoId: string,
): string | null {
  return snapshot.handoffs.find((handoff) => handoff.repoId === repoId)?.id ?? null;
}
