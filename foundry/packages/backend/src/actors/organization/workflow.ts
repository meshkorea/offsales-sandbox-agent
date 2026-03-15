// @ts-nocheck
import { Loop } from "rivetkit/workflow";
import { logActorWarning, resolveErrorMessage } from "../logging.js";
import type { CreateTaskInput } from "@sandbox-agent/foundry-shared";
import {
  applyGithubDataProjectionMutation,
  applyGithubRepositoryProjectionMutation,
  applyGithubSyncProgressMutation,
  createTaskMutation,
  recordGithubWebhookReceiptMutation,
  refreshOrganizationSnapshotMutation,
} from "./actions.js";
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

export async function runOrganizationWorkflow(ctx: any): Promise<void> {
  await ctx.loop("organization-command-loop", async (loopCtx: any) => {
    const msg = await loopCtx.queue.next("next-organization-command", {
      names: [...ORGANIZATION_QUEUE_NAMES],
      completable: true,
    });
    if (!msg) {
      return Loop.continue(undefined);
    }

    try {
      if (msg.name === "organization.command.createTask") {
        const result = await loopCtx.step({
          name: "organization-create-task",
          timeout: 5 * 60_000,
          run: async () => createTaskMutation(loopCtx, msg.body as CreateTaskInput),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.snapshot.broadcast") {
        await loopCtx.step({
          name: "organization-snapshot-broadcast",
          timeout: 60_000,
          run: async () => refreshOrganizationSnapshotMutation(loopCtx),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.syncGithubSession") {
        await loopCtx.step({
          name: "organization-sync-github-session",
          timeout: 60_000,
          run: async () => {
            const { syncGithubOrganizations } = await import("./app-shell.js");
            await syncGithubOrganizations(loopCtx, msg.body as { sessionId: string; accessToken: string });
          },
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.session_index.upsert") {
        const result = await loopCtx.step({
          name: "organization-better-auth-session-index-upsert",
          timeout: 60_000,
          run: async () => betterAuthUpsertSessionIndexMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.session_index.delete") {
        await loopCtx.step({
          name: "organization-better-auth-session-index-delete",
          timeout: 60_000,
          run: async () => betterAuthDeleteSessionIndexMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.email_index.upsert") {
        const result = await loopCtx.step({
          name: "organization-better-auth-email-index-upsert",
          timeout: 60_000,
          run: async () => betterAuthUpsertEmailIndexMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.email_index.delete") {
        await loopCtx.step({
          name: "organization-better-auth-email-index-delete",
          timeout: 60_000,
          run: async () => betterAuthDeleteEmailIndexMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.account_index.upsert") {
        const result = await loopCtx.step({
          name: "organization-better-auth-account-index-upsert",
          timeout: 60_000,
          run: async () => betterAuthUpsertAccountIndexMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.account_index.delete") {
        await loopCtx.step({
          name: "organization-better-auth-account-index-delete",
          timeout: 60_000,
          run: async () => betterAuthDeleteAccountIndexMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.verification.create") {
        const result = await loopCtx.step({
          name: "organization-better-auth-verification-create",
          timeout: 60_000,
          run: async () => betterAuthCreateVerificationMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.verification.update") {
        const result = await loopCtx.step({
          name: "organization-better-auth-verification-update",
          timeout: 60_000,
          run: async () => betterAuthUpdateVerificationMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.verification.update_many") {
        const result = await loopCtx.step({
          name: "organization-better-auth-verification-update-many",
          timeout: 60_000,
          run: async () => betterAuthUpdateManyVerificationMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.verification.delete") {
        await loopCtx.step({
          name: "organization-better-auth-verification-delete",
          timeout: 60_000,
          run: async () => betterAuthDeleteVerificationMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.better_auth.verification.delete_many") {
        const result = await loopCtx.step({
          name: "organization-better-auth-verification-delete-many",
          timeout: 60_000,
          run: async () => betterAuthDeleteManyVerificationMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.github.repository_projection.apply") {
        await loopCtx.step({
          name: "organization-github-repository-projection-apply",
          timeout: 60_000,
          run: async () => applyGithubRepositoryProjectionMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.github.data_projection.apply") {
        await loopCtx.step({
          name: "organization-github-data-projection-apply",
          timeout: 60_000,
          run: async () => applyGithubDataProjectionMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.github.sync_progress.apply") {
        await loopCtx.step({
          name: "organization-github-sync-progress-apply",
          timeout: 60_000,
          run: async () => applyGithubSyncProgressMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.github.webhook_receipt.record") {
        await loopCtx.step({
          name: "organization-github-webhook-receipt-record",
          timeout: 60_000,
          run: async () => recordGithubWebhookReceiptMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.github.organization_shell.sync_from_github") {
        const result = await loopCtx.step({
          name: "organization-github-organization-shell-sync-from-github",
          timeout: 60_000,
          run: async () => syncOrganizationShellFromGithubMutation(loopCtx, msg.body),
        });
        await msg.complete(result);
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.shell.profile.update") {
        await loopCtx.step({
          name: "organization-shell-profile-update",
          timeout: 60_000,
          run: async () => updateOrganizationShellProfileMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.shell.sync_started.mark") {
        await loopCtx.step({
          name: "organization-shell-sync-started-mark",
          timeout: 60_000,
          run: async () => markOrganizationSyncStartedMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.billing.stripe_customer.apply") {
        await loopCtx.step({
          name: "organization-billing-stripe-customer-apply",
          timeout: 60_000,
          run: async () => applyOrganizationStripeCustomerMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.billing.stripe_subscription.apply") {
        await loopCtx.step({
          name: "organization-billing-stripe-subscription-apply",
          timeout: 60_000,
          run: async () => applyOrganizationStripeSubscriptionMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.billing.free_plan.apply") {
        await loopCtx.step({
          name: "organization-billing-free-plan-apply",
          timeout: 60_000,
          run: async () => applyOrganizationFreePlanMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.billing.payment_method.set") {
        await loopCtx.step({
          name: "organization-billing-payment-method-set",
          timeout: 60_000,
          run: async () => setOrganizationBillingPaymentMethodMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.billing.status.set") {
        await loopCtx.step({
          name: "organization-billing-status-set",
          timeout: 60_000,
          run: async () => setOrganizationBillingStatusMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.billing.invoice.upsert") {
        await loopCtx.step({
          name: "organization-billing-invoice-upsert",
          timeout: 60_000,
          run: async () => upsertOrganizationInvoiceMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }

      if (msg.name === "organization.command.billing.seat_usage.record") {
        await loopCtx.step({
          name: "organization-billing-seat-usage-record",
          timeout: 60_000,
          run: async () => recordOrganizationSeatUsageMutation(loopCtx, msg.body),
        });
        await msg.complete({ ok: true });
        return Loop.continue(undefined);
      }
    } catch (error) {
      const message = resolveErrorMessage(error);
      logActorWarning("organization", "organization workflow command failed", {
        queueName: msg.name,
        error: message,
      });
      await msg.complete({ error: message }).catch((completeError: unknown) => {
        logActorWarning("organization", "organization workflow failed completing error response", {
          queueName: msg.name,
          error: resolveErrorMessage(completeError),
        });
      });
    }

    return Loop.continue(undefined);
  });
}
