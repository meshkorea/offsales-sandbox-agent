import { type ReactNode, useEffect } from "react";
import type { FoundryBillingPlanId } from "@sandbox-agent/foundry-shared";
import { useInterest } from "@sandbox-agent/foundry-client";
import { Navigate, Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { MockLayout } from "../components/mock-layout";
import {
  MockAccountSettingsPage,
  MockHostedCheckoutPage,
  MockOrganizationBillingPage,
  MockOrganizationSelectorPage,
  MockOrganizationSettingsPage,
  MockSignInPage,
} from "../components/mock-onboarding";
import { defaultWorkspaceId, isMockFrontendClient } from "../lib/env";
import { interestManager } from "../lib/interest";
import { activeMockOrganization, getMockOrganizationById, isAppSnapshotBootstrapping, useMockAppClient, useMockAppSnapshot } from "../lib/mock-app";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexRoute,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signin",
  component: SignInRoute,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: AccountRoute,
});

const organizationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/organizations",
  component: OrganizationsRoute,
});

const organizationSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/organizations/$organizationId/settings",
  component: OrganizationSettingsRoute,
});

const organizationBillingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/organizations/$organizationId/billing",
  component: OrganizationBillingRoute,
});

const organizationCheckoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/organizations/$organizationId/checkout/$planId",
  component: OrganizationCheckoutRoute,
});

const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspaces/$workspaceId",
  component: WorkspaceLayoutRoute,
});

const workspaceIndexRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/",
  component: WorkspaceRoute,
});

const taskRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "tasks/$taskId",
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: typeof search.sessionId === "string" && search.sessionId.trim().length > 0 ? search.sessionId : undefined,
  }),
  component: TaskRoute,
});

const repoRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "repos/$repoId",
  component: RepoRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  accountRoute,
  organizationsRoute,
  organizationSettingsRoute,
  organizationBillingRoute,
  organizationCheckoutRoute,
  workspaceRoute.addChildren([workspaceIndexRoute, taskRoute, repoRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function WorkspaceLayoutRoute() {
  return <Outlet />;
}

function AppLoadingScreen({ label }: { label: string }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, rgba(255, 79, 0, 0.16), transparent 28%), radial-gradient(circle at top right, rgba(24, 140, 255, 0.18), transparent 32%), #050505",
        color: "#ffffff",
        fontSize: "16px",
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}

function IndexRoute() {
  const snapshot = useMockAppSnapshot();
  if (!isMockFrontendClient && isAppSnapshotBootstrapping(snapshot)) {
    return <AppLoadingScreen label="Restoring Foundry session..." />;
  }
  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  const activeOrganization = activeMockOrganization(snapshot);
  if (activeOrganization) {
    return <Navigate to="/workspaces/$workspaceId" params={{ workspaceId: activeOrganization.workspaceId }} replace />;
  }

  return <Navigate to="/organizations" replace />;
}

function SignInRoute() {
  const snapshot = useMockAppSnapshot();
  if (!isMockFrontendClient && isAppSnapshotBootstrapping(snapshot)) {
    return <AppLoadingScreen label="Restoring Foundry session..." />;
  }
  if (snapshot.auth.status === "signed_in") {
    return <IndexRoute />;
  }

  return <MockSignInPage />;
}

function AccountRoute() {
  const snapshot = useMockAppSnapshot();
  if (!isMockFrontendClient && isAppSnapshotBootstrapping(snapshot)) {
    return <AppLoadingScreen label="Loading account..." />;
  }
  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  return <MockAccountSettingsPage />;
}

function OrganizationsRoute() {
  const snapshot = useMockAppSnapshot();
  if (!isMockFrontendClient && isAppSnapshotBootstrapping(snapshot)) {
    return <AppLoadingScreen label="Loading organizations..." />;
  }
  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  return <MockOrganizationSelectorPage />;
}

function OrganizationSettingsRoute() {
  const snapshot = useMockAppSnapshot();
  if (!isMockFrontendClient && isAppSnapshotBootstrapping(snapshot)) {
    return <AppLoadingScreen label="Loading organization settings..." />;
  }
  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  const { organizationId } = organizationSettingsRoute.useParams();
  const organization = getMockOrganizationById(snapshot, organizationId);
  if (!organization) {
    return <Navigate to="/organizations" replace />;
  }

  return <MockOrganizationSettingsPage organization={organization} />;
}

function OrganizationBillingRoute() {
  const snapshot = useMockAppSnapshot();
  if (!isMockFrontendClient && isAppSnapshotBootstrapping(snapshot)) {
    return <AppLoadingScreen label="Loading billing..." />;
  }
  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  const { organizationId } = organizationBillingRoute.useParams();
  const organization = getMockOrganizationById(snapshot, organizationId);
  if (!organization) {
    return <Navigate to="/organizations" replace />;
  }

  return <MockOrganizationBillingPage organization={organization} />;
}

function OrganizationCheckoutRoute() {
  const snapshot = useMockAppSnapshot();
  if (!isMockFrontendClient && isAppSnapshotBootstrapping(snapshot)) {
    return <AppLoadingScreen label="Loading checkout..." />;
  }
  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  const { organizationId, planId } = organizationCheckoutRoute.useParams();
  const organization = getMockOrganizationById(snapshot, organizationId);
  if (!organization) {
    return <Navigate to="/organizations" replace />;
  }

  return <MockHostedCheckoutPage organization={organization} planId={planId as FoundryBillingPlanId} />;
}

function WorkspaceRoute() {
  const { workspaceId } = workspaceRoute.useParams();
  return (
    <AppWorkspaceGate workspaceId={workspaceId}>
      <WorkspaceView workspaceId={workspaceId} selectedTaskId={null} selectedSessionId={null} />
    </AppWorkspaceGate>
  );
}

function WorkspaceView({
  workspaceId,
  selectedTaskId,
  selectedSessionId,
}: {
  workspaceId: string;
  selectedTaskId: string | null;
  selectedSessionId: string | null;
}) {
  return <MockLayout workspaceId={workspaceId} selectedTaskId={selectedTaskId} selectedSessionId={selectedSessionId} />;
}

function TaskRoute() {
  const { workspaceId, taskId } = taskRoute.useParams();
  const { sessionId } = taskRoute.useSearch();
  return (
    <AppWorkspaceGate workspaceId={workspaceId}>
      <TaskView workspaceId={workspaceId} taskId={taskId} sessionId={sessionId ?? null} />
    </AppWorkspaceGate>
  );
}

function TaskView({ workspaceId, taskId, sessionId }: { workspaceId: string; taskId: string; sessionId: string | null }) {
  return <MockLayout workspaceId={workspaceId} selectedTaskId={taskId} selectedSessionId={sessionId} />;
}

function RepoRoute() {
  const { workspaceId, repoId } = repoRoute.useParams();
  return (
    <AppWorkspaceGate workspaceId={workspaceId}>
      <RepoRouteInner workspaceId={workspaceId} repoId={repoId} />
    </AppWorkspaceGate>
  );
}

function AppWorkspaceGate({ workspaceId, children }: { workspaceId: string; children: ReactNode }) {
  const client = useMockAppClient();
  const snapshot = useMockAppSnapshot();
  const organization = snapshot.organizations.find((candidate) => candidate.workspaceId === workspaceId) ?? null;

  useEffect(() => {
    if (organization && snapshot.activeOrganizationId !== organization.id) {
      void client.selectOrganization(organization.id);
    }
  }, [client, organization, snapshot.activeOrganizationId]);

  if (!isMockFrontendClient && isAppSnapshotBootstrapping(snapshot)) {
    return <AppLoadingScreen label="Loading workspace..." />;
  }

  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  if (!organization) {
    return isMockFrontendClient ? <Navigate to="/organizations" replace /> : <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RepoRouteInner({ workspaceId, repoId }: { workspaceId: string; repoId: string }) {
  const workspaceState = useInterest(interestManager, "workspace", { workspaceId });
  const activeTaskId = workspaceState.data?.taskSummaries.find((task) => task.repoId === repoId)?.id;
  if (!activeTaskId) {
    return <Navigate to="/workspaces/$workspaceId" params={{ workspaceId }} replace />;
  }
  return <Navigate to="/workspaces/$workspaceId/tasks/$taskId" params={{ workspaceId, taskId: activeTaskId }} search={{ sessionId: undefined }} replace />;
}

function RootLayout() {
  return (
    <>
      <Outlet />
    </>
  );
}
