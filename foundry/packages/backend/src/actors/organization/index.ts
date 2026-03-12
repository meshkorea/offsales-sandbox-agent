import { actor, queue } from "rivetkit";
import { workflow } from "rivetkit/workflow";
import { organizationDb } from "./db/db.js";
import { reportWorkflowIssueToOrganization } from "../runtime-issues.js";
import {
  WORKSPACE_QUEUE_NAMES as ORGANIZATION_QUEUE_NAMES,
  runWorkspaceWorkflow as runOrganizationWorkflow,
  workspaceActions as organizationActions,
} from "./actions.js";

const organizationConfig: any = {
  db: organizationDb,
  queues: Object.fromEntries(ORGANIZATION_QUEUE_NAMES.map((name) => [name, queue()])),
  options: {
    actionTimeout: 5 * 60_000,
  },
  createState: (_c, workspaceId: string) => ({
    workspaceId,
  }),
  actions: organizationActions,
  run: workflow(runOrganizationWorkflow, {
    onError: async (c: any, event) => {
      await reportWorkflowIssueToOrganization(c, event, {
        actorType: "organization",
        organizationId: c.state.workspaceId,
        scopeId: c.state.workspaceId,
        scopeLabel: `Organization ${c.state.workspaceId}`,
      });
    },
  }),
};

export const organization = (actor as any)(organizationConfig);
