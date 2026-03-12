import {
  GitHubAppClient,
  type GitHubInstallationRecord,
  type GitHubMemberRecord,
  type GitHubOAuthSession,
  type GitHubOrgIdentity,
  type GitHubPullRequestRecord,
  type GitHubRepositoryRecord,
  type GitHubViewerIdentity,
  type GitHubWebhookEvent,
} from "./app-github.js";
import {
  StripeAppClient,
  type StripeCheckoutCompletion,
  type StripeCheckoutSession,
  type StripePortalSession,
  type StripeSubscriptionSnapshot,
  type StripeWebhookEvent,
} from "./app-stripe.js";
import type { FoundryBillingPlanId } from "@sandbox-agent/foundry-shared";

export type AppShellGithubClient = Pick<
  GitHubAppClient,
  | "isAppConfigured"
  | "isWebhookConfigured"
  | "buildAuthorizeUrl"
  | "exchangeCode"
  | "getTokenScopes"
  | "getViewer"
  | "listOrganizations"
  | "listInstallations"
  | "listUserRepositories"
  | "listUserPullRequests"
  | "listInstallationRepositories"
  | "listInstallationMembers"
  | "listInstallationPullRequests"
  | "buildInstallationUrl"
  | "verifyWebhookEvent"
>;

export type AppShellStripeClient = Pick<
  StripeAppClient,
  | "isConfigured"
  | "createCustomer"
  | "createCheckoutSession"
  | "retrieveCheckoutCompletion"
  | "retrieveSubscription"
  | "createPortalSession"
  | "updateSubscriptionCancellation"
  | "verifyWebhookEvent"
  | "planIdForPriceId"
>;

export interface AppShellServices {
  appUrl: string;
  github: AppShellGithubClient;
  stripe: AppShellStripeClient;
}

export interface CreateAppShellServicesOptions {
  appUrl?: string;
  github?: AppShellGithubClient;
  stripe?: AppShellStripeClient;
}

export function createDefaultAppShellServices(options: CreateAppShellServicesOptions = {}): AppShellServices {
  return {
    appUrl: (options.appUrl ?? process.env.APP_URL ?? "http://localhost:4173").replace(/\/$/, ""),
    github: options.github ?? new GitHubAppClient(),
    stripe: options.stripe ?? new StripeAppClient(),
  };
}

export type {
  GitHubInstallationRecord,
  GitHubMemberRecord,
  GitHubOAuthSession,
  GitHubOrgIdentity,
  GitHubPullRequestRecord,
  GitHubRepositoryRecord,
  GitHubViewerIdentity,
  GitHubWebhookEvent,
  StripeCheckoutCompletion,
  StripeCheckoutSession,
  StripePortalSession,
  StripeSubscriptionSnapshot,
  StripeWebhookEvent,
  FoundryBillingPlanId,
};
