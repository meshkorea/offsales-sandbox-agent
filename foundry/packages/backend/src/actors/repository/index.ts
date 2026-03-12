import { actor, queue } from "rivetkit";
import { workflow } from "rivetkit/workflow";
import { repositoryDb } from "./db/db.js";
import { reportWorkflowIssueToOrganization } from "../runtime-issues.js";
import { PROJECT_QUEUE_NAMES as REPOSITORY_QUEUE_NAMES, projectActions as repositoryActions, runProjectWorkflow as runRepositoryWorkflow } from "./actions.js";

export interface RepositoryInput {
  workspaceId: string;
  repoId: string;
  remoteUrl: string;
}

const repositoryConfig: any = {
  db: repositoryDb,
  queues: Object.fromEntries(REPOSITORY_QUEUE_NAMES.map((name) => [name, queue()])),
  options: {
    actionTimeout: 5 * 60_000,
  },
  createState: (_c, input: RepositoryInput) => ({
    workspaceId: input.workspaceId,
    repoId: input.repoId,
    remoteUrl: input.remoteUrl,
    localPath: null as string | null,
    taskIndexHydrated: false,
  }),
  actions: repositoryActions,
  run: workflow(runRepositoryWorkflow, {
    onError: async (c: any, event) => {
      await reportWorkflowIssueToOrganization(c, event, {
        actorType: "repository",
        organizationId: c.state.workspaceId,
        scopeId: c.state.repoId,
        scopeLabel: `Repository ${c.state.repoId}`,
      });
    },
  }),
};

export const repository = (actor as any)(repositoryConfig);
