// @ts-nocheck
import { logActorWarning, resolveErrorMessage } from "../logging.js";
import { applyGithubSyncProgressMutation, recordGithubWebhookReceiptMutation, refreshOrganizationSnapshotMutation } from "./actions.js";
import {
  applyTaskSummaryUpdateMutation,
  createTaskMutation,
  refreshTaskSummaryForBranchMutation,
  registerTaskBranchMutation,
  removeTaskSummaryMutation,
} from "./actions/task-mutations.js";
import {
  betterAuthCreateVerificationMutation,
  betterAuthDeleteAccountIndexMutation,
  betterAuthDeleteEmailIndexMutation,
  betterAuthDeleteManyVerificationMutation,
  betterAuthDeleteSessionIndexMutation,
  betterAuthDeleteVerificationMutation,
  betterAuthUpdateManyVerificationMutation,
  betterAuthUpdateVerificationMutation,
  betterAuthUpsertAccountIndexMutation,
  betterAuthUpsertEmailIndexMutation,
  betterAuthUpsertSessionIndexMutation,
} from "./actions/better-auth.js";
import {
  applyOrganizationFreePlanMutation,
  applyOrganizationStripeCustomerMutation,
  applyOrganizationStripeSubscriptionMutation,
  markOrganizationSyncStartedMutation,
  recordOrganizationSeatUsageMutation,
  setOrganizationBillingPaymentMethodMutation,
  setOrganizationBillingStatusMutation,
  syncOrganizationShellFromGithubMutation,
  updateOrganizationShellProfileMutation,
  upsertOrganizationInvoiceMutation,
} from "./app-shell.js";
import { ORGANIZATION_QUEUE_NAMES } from "./queues.js";

// Command handler dispatch table — maps queue name to handler function.
const COMMAND_HANDLERS: Record<string, (c: any, body: any) => Promise<any>> = {
  "organization.command.createTask": (c, body) => createTaskMutation(c, body),
  "organization.command.materializeTask": (c, body) => createTaskMutation(c, body),
  "organization.command.registerTaskBranch": (c, body) => registerTaskBranchMutation(c, body),
  "organization.command.applyTaskSummaryUpdate": async (c, body) => {
    await applyTaskSummaryUpdateMutation(c, body);
    return { ok: true };
  },
  "organization.command.removeTaskSummary": async (c, body) => {
    await removeTaskSummaryMutation(c, body);
    return { ok: true };
  },
  "organization.command.refreshTaskSummaryForBranch": async (c, body) => {
    await refreshTaskSummaryForBranchMutation(c, body);
    return { ok: true };
  },
  "organization.command.snapshot.broadcast": async (c, _body) => {
    await refreshOrganizationSnapshotMutation(c);
    return { ok: true };
  },
  "organization.command.syncGithubSession": async (c, body) => {
    const { syncGithubOrganizations } = await import("./app-shell.js");
    await syncGithubOrganizations(c, body);
    return { ok: true };
  },
  "organization.command.better_auth.session_index.upsert": (c, body) => betterAuthUpsertSessionIndexMutation(c, body),
  "organization.command.better_auth.session_index.delete": async (c, body) => {
    await betterAuthDeleteSessionIndexMutation(c, body);
    return { ok: true };
  },
  "organization.command.better_auth.email_index.upsert": (c, body) => betterAuthUpsertEmailIndexMutation(c, body),
  "organization.command.better_auth.email_index.delete": async (c, body) => {
    await betterAuthDeleteEmailIndexMutation(c, body);
    return { ok: true };
  },
  "organization.command.better_auth.account_index.upsert": (c, body) => betterAuthUpsertAccountIndexMutation(c, body),
  "organization.command.better_auth.account_index.delete": async (c, body) => {
    await betterAuthDeleteAccountIndexMutation(c, body);
    return { ok: true };
  },
  "organization.command.better_auth.verification.create": (c, body) => betterAuthCreateVerificationMutation(c, body),
  "organization.command.better_auth.verification.update": (c, body) => betterAuthUpdateVerificationMutation(c, body),
  "organization.command.better_auth.verification.update_many": (c, body) => betterAuthUpdateManyVerificationMutation(c, body),
  "organization.command.better_auth.verification.delete": async (c, body) => {
    await betterAuthDeleteVerificationMutation(c, body);
    return { ok: true };
  },
  "organization.command.better_auth.verification.delete_many": (c, body) => betterAuthDeleteManyVerificationMutation(c, body),
  "organization.command.github.sync_progress.apply": async (c, body) => {
    await applyGithubSyncProgressMutation(c, body);
    return { ok: true };
  },
  "organization.command.github.webhook_receipt.record": async (c, body) => {
    await recordGithubWebhookReceiptMutation(c, body);
    return { ok: true };
  },
  "organization.command.github.organization_shell.sync_from_github": (c, body) => syncOrganizationShellFromGithubMutation(c, body),
  "organization.command.shell.profile.update": async (c, body) => {
    await updateOrganizationShellProfileMutation(c, body);
    return { ok: true };
  },
  "organization.command.shell.sync_started.mark": async (c, body) => {
    await markOrganizationSyncStartedMutation(c, body);
    return { ok: true };
  },
  "organization.command.billing.stripe_customer.apply": async (c, body) => {
    await applyOrganizationStripeCustomerMutation(c, body);
    return { ok: true };
  },
  "organization.command.billing.stripe_subscription.apply": async (c, body) => {
    await applyOrganizationStripeSubscriptionMutation(c, body);
    return { ok: true };
  },
  "organization.command.billing.free_plan.apply": async (c, body) => {
    await applyOrganizationFreePlanMutation(c, body);
    return { ok: true };
  },
  "organization.command.billing.payment_method.set": async (c, body) => {
    await setOrganizationBillingPaymentMethodMutation(c, body);
    return { ok: true };
  },
  "organization.command.billing.status.set": async (c, body) => {
    await setOrganizationBillingStatusMutation(c, body);
    return { ok: true };
  },
  "organization.command.billing.invoice.upsert": async (c, body) => {
    await upsertOrganizationInvoiceMutation(c, body);
    return { ok: true };
  },
  "organization.command.billing.seat_usage.record": async (c, body) => {
    await recordOrganizationSeatUsageMutation(c, body);
    return { ok: true };
  },
};

/**
 * Plain run handler (no workflow engine). Drains the queue using `c.queue.iter()`
 * with completable messages. This avoids the RivetKit bug where actors created
 * from another actor's workflow context never start their `run: workflow(...)`.
 *
 * The queue is still durable — messages survive restarts. Only in-flight processing
 * of a single message is lost on crash (the message is retried). All mutations are
 * idempotent, so this is safe.
 */
export async function runOrganizationCommandLoop(c: any): Promise<void> {
  for await (const msg of c.queue.iter({ names: [...ORGANIZATION_QUEUE_NAMES], completable: true })) {
    try {
      const handler = COMMAND_HANDLERS[msg.name];
      if (handler) {
        const result = await handler(c, msg.body);
        await msg.complete(result);
      } else {
        logActorWarning("organization", "unknown queue message", { queueName: msg.name });
        await msg.complete({ error: `Unknown command: ${msg.name}` });
      }
    } catch (error) {
      const message = resolveErrorMessage(error);
      logActorWarning("organization", "organization command failed", {
        queueName: msg.name,
        error: message,
      });
      await msg.complete({ error: message }).catch((completeError: unknown) => {
        logActorWarning("organization", "organization command failed completing error response", {
          queueName: msg.name,
          error: resolveErrorMessage(completeError),
        });
      });
    }
  }
}
