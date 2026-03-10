import { useEffect, useSyncExternalStore } from "react";
import { setFrontendErrorContext } from "@sandbox-agent/factory-frontend-errors/client";
import { type MockBillingPlanId } from "@sandbox-agent/factory-client";
import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { MockLayout } from "../components/mock-layout";
import {
  MockHostedCheckoutPage,
  MockOrganizationBillingPage,
  MockOrganizationImportPage,
  MockOrganizationSelectorPage,
  MockOrganizationSettingsPage,
  MockSignInPage,
} from "../components/mock-onboarding";
import { defaultWorkspaceId } from "../lib/env";
import {
  activeMockOrganization,
  activeMockUser,
  getMockOrganizationById,
  eligibleOrganizations,
  useMockAppSnapshot,
} from "../lib/mock-app";
import { getHandoffWorkbenchClient, resolveRepoRouteHandoffId } from "../lib/workbench";

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

const organizationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/organizations",
  component: OrganizationsRoute,
});

const organizationImportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/organizations/$organizationId/import",
  component: OrganizationImportRoute,
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

const handoffRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "handoffs/$handoffId",
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: typeof search.sessionId === "string" && search.sessionId.trim().length > 0 ? search.sessionId : undefined,
  }),
  component: HandoffRoute,
});

const repoRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "repos/$repoId",
  component: RepoRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  signInRoute,
  organizationsRoute,
  organizationImportRoute,
  organizationSettingsRoute,
  organizationBillingRoute,
  organizationCheckoutRoute,
  workspaceRoute.addChildren([workspaceIndexRoute, handoffRoute, repoRoute]),
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

function IndexRoute() {
  const snapshot = useMockAppSnapshot();
  return <NavigateToMockHome snapshot={snapshot} replace />;
}

function SignInRoute() {
  const snapshot = useMockAppSnapshot();

  if (snapshot.auth.status === "signed_in") {
    return <NavigateToMockHome snapshot={snapshot} replace />;
  }

  return <MockSignInPage />;
}

function OrganizationsRoute() {
  const snapshot = useMockAppSnapshot();

  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  return <MockOrganizationSelectorPage />;
}

function OrganizationImportRoute() {
  const snapshot = useMockAppSnapshot();
  const organization = useGuardedMockOrganization(organizationImportRoute.useParams().organizationId);

  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  if (!organization) {
    return <Navigate to="/organizations" replace />;
  }

  return <MockOrganizationImportPage organization={organization} />;
}

function OrganizationSettingsRoute() {
  const snapshot = useMockAppSnapshot();
  const organization = useGuardedMockOrganization(organizationSettingsRoute.useParams().organizationId);

  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  if (!organization) {
    return <Navigate to="/organizations" replace />;
  }

  return <MockOrganizationSettingsPage organization={organization} />;
}

function OrganizationBillingRoute() {
  const snapshot = useMockAppSnapshot();
  const organization = useGuardedMockOrganization(organizationBillingRoute.useParams().organizationId);

  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  if (!organization) {
    return <Navigate to="/organizations" replace />;
  }

  return <MockOrganizationBillingPage organization={organization} />;
}

function OrganizationCheckoutRoute() {
  const { organizationId, planId } = organizationCheckoutRoute.useParams();
  const snapshot = useMockAppSnapshot();
  const organization = useGuardedMockOrganization(organizationId);

  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  if (!organization) {
    return <Navigate to="/organizations" replace />;
  }

  if (!isMockBillingPlanId(planId)) {
    return (
      <Navigate
        to="/organizations/$organizationId/billing"
        params={{ organizationId }}
        replace
      />
    );
  }

  return <MockHostedCheckoutPage organization={organization} planId={planId} />;
}

function WorkspaceRoute() {
  const { workspaceId } = workspaceRoute.useParams();

  return (
    <MockWorkspaceGate workspaceId={workspaceId}>
      <WorkspaceView workspaceId={workspaceId} selectedHandoffId={null} selectedSessionId={null} />
    </MockWorkspaceGate>
  );
}

function HandoffRoute() {
  const { workspaceId, handoffId } = handoffRoute.useParams();
  const { sessionId } = handoffRoute.useSearch();

  return (
    <MockWorkspaceGate workspaceId={workspaceId}>
      <WorkspaceView workspaceId={workspaceId} selectedHandoffId={handoffId} selectedSessionId={sessionId ?? null} />
    </MockWorkspaceGate>
  );
}

function RepoRoute() {
  const { workspaceId, repoId } = repoRoute.useParams();

  return (
    <MockWorkspaceGate workspaceId={workspaceId}>
      <RepoRouteInner workspaceId={workspaceId} repoId={repoId} />
    </MockWorkspaceGate>
  );
}

function RepoRouteInner({ workspaceId, repoId }: { workspaceId: string; repoId: string }) {
  const client = getHandoffWorkbenchClient(workspaceId);
  const snapshot = useSyncExternalStore(
    client.subscribe.bind(client),
    client.getSnapshot.bind(client),
    client.getSnapshot.bind(client),
  );

  useEffect(() => {
    setFrontendErrorContext({
      workspaceId,
      handoffId: undefined,
      repoId,
    });
  }, [repoId, workspaceId]);

  const activeHandoffId = resolveRepoRouteHandoffId(snapshot, repoId);
  if (!activeHandoffId) {
    return (
      <Navigate
        to="/workspaces/$workspaceId"
        params={{ workspaceId }}
        replace
      />
    );
  }
  return (
    <Navigate
      to="/workspaces/$workspaceId/handoffs/$handoffId"
      params={{
        workspaceId,
        handoffId: activeHandoffId,
      }}
      search={{ sessionId: undefined }}
      replace
    />
  );
}

function WorkspaceView({
  workspaceId,
  selectedHandoffId,
  selectedSessionId,
}: {
  workspaceId: string;
  selectedHandoffId: string | null;
  selectedSessionId: string | null;
}) {
  const client = getHandoffWorkbenchClient(workspaceId);
  const navigate = useNavigate();
  const snapshot = useMockAppSnapshot();
  const organization = eligibleOrganizations(snapshot).find((candidate) => candidate.workspaceId === workspaceId) ?? null;

  useEffect(() => {
    setFrontendErrorContext({
      workspaceId,
      handoffId: selectedHandoffId ?? undefined,
      repoId: undefined,
    });
  }, [selectedHandoffId, workspaceId]);

  return (
    <MockLayout
      client={client}
      workspaceId={workspaceId}
      selectedHandoffId={selectedHandoffId}
      selectedSessionId={selectedSessionId}
      sidebarTitle={organization?.settings.displayName}
      sidebarSubtitle={
        organization
          ? `${organization.billing.planId} plan · ${organization.seatAssignments.length}/${organization.billing.seatsIncluded} seats`
          : undefined
      }
      sidebarActions={
        organization
          ? [
              {
                label: "Switch org",
                onClick: () => void navigate({ to: "/organizations" }),
              },
              {
                label: "Settings",
                onClick: () =>
                  void navigate({
                    to: "/organizations/$organizationId/settings",
                    params: { organizationId: organization.id },
                  }),
              },
              {
                label: "Billing",
                onClick: () =>
                  void navigate({
                    to: "/organizations/$organizationId/billing",
                    params: { organizationId: organization.id },
                  }),
              },
            ]
          : undefined
      }
    />
  );
}

function MockWorkspaceGate({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const snapshot = useMockAppSnapshot();

  if (snapshot.auth.status === "signed_out") {
    return <Navigate to="/signin" replace />;
  }

  const activeOrganization = activeMockOrganization(snapshot);
  const workspaceOrganization = eligibleOrganizations(snapshot).find((candidate) => candidate.workspaceId === workspaceId) ?? null;

  if (!workspaceOrganization) {
    return <NavigateToMockHome snapshot={snapshot} replace />;
  }

  if (!activeOrganization || activeOrganization.id !== workspaceOrganization.id) {
    return <Navigate to="/organizations" replace />;
  }

  if (workspaceOrganization.repoImportStatus !== "ready") {
    return (
      <Navigate
        to="/organizations/$organizationId/import"
        params={{ organizationId: workspaceOrganization.id }}
        replace
      />
    );
  }

  return <>{children}</>;
}

function NavigateToMockHome({
  snapshot,
  replace = false,
}: {
  snapshot: ReturnType<typeof useMockAppSnapshot>;
  replace?: boolean;
}) {
  const activeOrganization = activeMockOrganization(snapshot);
  const organizations = eligibleOrganizations(snapshot);
  const targetOrganization =
    activeOrganization ?? (organizations.length === 1 ? organizations[0] ?? null : null);

  if (snapshot.auth.status === "signed_out" || !activeMockUser(snapshot)) {
    return <Navigate to="/signin" replace={replace} />;
  }

  if (!targetOrganization) {
    return snapshot.users.length === 0 ? (
      <Navigate
        to="/workspaces/$workspaceId"
        params={{ workspaceId: defaultWorkspaceId }}
        replace={replace}
      />
    ) : (
      <Navigate to="/organizations" replace={replace} />
    );
  }

  if (targetOrganization.repoImportStatus !== "ready") {
    return (
      <Navigate
        to="/organizations/$organizationId/import"
        params={{ organizationId: targetOrganization.id }}
        replace={replace}
      />
    );
  }

  return (
    <Navigate
      to="/workspaces/$workspaceId"
      params={{ workspaceId: targetOrganization.workspaceId }}
      replace={replace}
    />
  );
}

function useGuardedMockOrganization(organizationId: string) {
  const snapshot = useMockAppSnapshot();
  const user = activeMockUser(snapshot);

  if (!user) {
    return null;
  }

  const organization = getMockOrganizationById(snapshot, organizationId);
  if (!organization) {
    return null;
  }

  return user.eligibleOrganizationIds.includes(organization.id) ? organization : null;
}

function isMockBillingPlanId(planId: string): planId is MockBillingPlanId {
  return planId === "free" || planId === "team" || planId === "enterprise";
}

function RootLayout() {
  return (
    <>
      <RouteContextSync />
      <Outlet />
    </>
  );
}

function RouteContextSync() {
  const location = useRouterState({
    select: (state) => state.location,
  });

  useEffect(() => {
    setFrontendErrorContext({
      route: `${location.pathname}${location.search}${location.hash}`,
    });
  }, [location.hash, location.pathname, location.search]);

  return null;
}
