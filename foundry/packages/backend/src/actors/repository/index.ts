import { actor, queue } from "rivetkit";
import { workflow } from "rivetkit/workflow";
import { repositoryDb } from "./db/db.js";
import { repositoryActions } from "./actions.js";
import { REPOSITORY_QUEUE_NAMES, runRepositoryWorkflow } from "./workflow.js";

export interface RepositoryInput {
  organizationId: string;
  repoId: string;
}

export const repository = actor({
  db: repositoryDb,
  queues: Object.fromEntries(REPOSITORY_QUEUE_NAMES.map((name) => [name, queue()])),
  options: {
    name: "Repository",
    icon: "folder",
    actionTimeout: 5 * 60_000,
  },
  createState: (_c, input: RepositoryInput) => ({
    organizationId: input.organizationId,
    repoId: input.repoId,
  }),
  actions: repositoryActions,
  run: workflow(runRepositoryWorkflow),
});
