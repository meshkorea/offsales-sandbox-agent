import { useEffect, useSyncExternalStore } from "react";
import { setFrontendErrorContext } from "@sandbox-agent/factory-frontend-errors/client";
import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { MockLayout } from "../components/mock-layout";
import { defaultWorkspaceId } from "../lib/env";
import { getHandoffWorkbenchClient, resolveRepoRouteHandoffId } from "../lib/workbench";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <Navigate
      to="/workspaces/$workspaceId"
      params={{ workspaceId: defaultWorkspaceId }}
      replace
    />
  ),
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

function WorkspaceRoute() {
  const { workspaceId } = workspaceRoute.useParams();
  const client = getHandoffWorkbenchClient(workspaceId);
  useEffect(() => {
    setFrontendErrorContext({
      workspaceId,
      handoffId: undefined,
    });
  }, [workspaceId]);
  return (
    <MockLayout
      client={client}
      workspaceId={workspaceId}
      selectedHandoffId={null}
      selectedSessionId={null}
    />
  );
}

function HandoffRoute() {
  const { workspaceId, handoffId } = handoffRoute.useParams();
  const { sessionId } = handoffRoute.useSearch();
  const client = getHandoffWorkbenchClient(workspaceId);
  useEffect(() => {
    setFrontendErrorContext({
      workspaceId,
      handoffId,
      repoId: undefined,
    });
  }, [handoffId, workspaceId]);
  return (
    <MockLayout
      client={client}
      workspaceId={workspaceId}
      selectedHandoffId={handoffId}
      selectedSessionId={sessionId ?? null}
    />
  );
}

function RepoRoute() {
  const { workspaceId, repoId } = repoRoute.useParams();
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
