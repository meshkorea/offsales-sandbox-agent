import { useEffect, useMemo, useState } from "react";
import {
  type FactoryBillingPlanId,
  type FactoryOrganization,
  type FactoryOrganizationMember,
  type FactoryUser,
} from "@sandbox-agent/factory-shared";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Building2, CreditCard, Github, LoaderCircle, ShieldCheck, Users } from "lucide-react";
import {
  activeMockUser,
  eligibleOrganizations,
  useMockAppClient,
  useMockAppSnapshot,
} from "../lib/mock-app";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const planCatalog: Record<
  FactoryBillingPlanId,
  {
    label: string;
    price: string;
    seats: string;
    summary: string;
  }
> = {
  free: {
    label: "Free",
    price: "$0",
    seats: "1 seat included",
    summary: "Best for a personal workspace and quick evaluations.",
  },
  team: {
    label: "Team",
    price: "$240/mo",
    seats: "5 seats included",
    summary: "GitHub org onboarding, shared billing, and seat accrual on first prompt.",
  },
  enterprise: {
    label: "Enterprise",
    price: "$1,200/mo",
    seats: "25 seats included",
    summary: "Enterprise controls, larger seat pools, and procurement-ready billing.",
  },
};

function appSurfaceStyle(): React.CSSProperties {
  return {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    background:
      "radial-gradient(circle at top left, rgba(255, 79, 0, 0.16), transparent 28%), radial-gradient(circle at top right, rgba(24, 140, 255, 0.18), transparent 32%), #050505",
    color: "#ffffff",
  };
}

function topBarStyle(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 28px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(0, 0, 0, 0.36)",
    backdropFilter: "blur(16px)",
  };
}

function contentWrapStyle(): React.CSSProperties {
  return {
    width: "min(1180px, calc(100vw - 40px))",
    margin: "0 auto",
    padding: "28px 0 40px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  };
}

function primaryButtonStyle(): React.CSSProperties {
  return {
    border: 0,
    borderRadius: "999px",
    padding: "11px 16px",
    background: "#ff4f00",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function secondaryButtonStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(255, 255, 255, 0.16)",
    borderRadius: "999px",
    padding: "10px 15px",
    background: "rgba(255, 255, 255, 0.03)",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  };
}

function subtleButtonStyle(): React.CSSProperties {
  return {
    border: 0,
    borderRadius: "999px",
    padding: "10px 14px",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  };
}

function cardStyle(): React.CSSProperties {
  return {
    background: "linear-gradient(180deg, rgba(21, 21, 24, 0.96), rgba(10, 10, 11, 0.98))",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "24px",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.36)",
  };
}

function badgeStyle(background: string, color = "#f4f4f5"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "999px",
    background,
    color,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.01em",
  };
}

function formatDate(value: string | null): string {
  if (!value) {
    return "N/A";
  }
  return dateFormatter.format(new Date(value));
}

function workspacePath(organization: FactoryOrganization): string {
  return `/workspaces/${organization.workspaceId}`;
}

function settingsPath(organization: FactoryOrganization): string {
  return `/organizations/${organization.id}/settings`;
}

function billingPath(organization: FactoryOrganization): string {
  return `/organizations/${organization.id}/billing`;
}

function importPath(organization: FactoryOrganization): string {
  return `/organizations/${organization.id}/import`;
}

function checkoutPath(organization: FactoryOrganization, planId: FactoryBillingPlanId): string {
  return `/organizations/${organization.id}/checkout/${planId}`;
}

function statusBadge(organization: FactoryOrganization) {
  if (organization.kind === "personal") {
    return <span style={badgeStyle("rgba(24, 140, 255, 0.18)", "#b9d8ff")}>Personal workspace</span>;
  }
  return <span style={badgeStyle("rgba(255, 79, 0, 0.16)", "#ffd6c7")}>GitHub organization</span>;
}

function githubBadge(organization: FactoryOrganization) {
  if (organization.github.installationStatus === "connected") {
    return <span style={badgeStyle("rgba(46, 160, 67, 0.16)", "#b7f0c3")}>GitHub connected</span>;
  }
  if (organization.github.installationStatus === "reconnect_required") {
    return <span style={badgeStyle("rgba(255, 193, 7, 0.18)", "#ffe6a6")}>Reconnect required</span>;
  }
  return <span style={badgeStyle("rgba(255, 255, 255, 0.08)")}>Install GitHub App</span>;
}

function PageShell({
  user,
  title,
  eyebrow,
  description,
  children,
  actions,
  onSignOut,
}: {
  user: FactoryUser | null;
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onSignOut?: () => void;
}) {
  return (
    <div style={appSurfaceStyle()}>
      <div style={topBarStyle()}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #ff4f00, #ff7a00)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              letterSpacing: "0.06em",
            }}
          >
            SA
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "#a1a1aa" }}>{eyebrow}</div>
            <div style={{ fontSize: "24px", fontWeight: 800 }}>{title}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {actions}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "13px", fontWeight: 700 }}>{user.name}</div>
                <div style={{ fontSize: "12px", color: "#a1a1aa" }}>@{user.githubLogin}</div>
              </div>
              {onSignOut ? (
                <button type="button" onClick={onSignOut} style={secondaryButtonStyle()}>
                  Sign out
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div style={contentWrapStyle()}>
        <div style={{ maxWidth: "720px", color: "#d4d4d8", fontSize: "15px", lineHeight: 1.5 }}>{description}</div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div
      style={{
        ...cardStyle(),
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: "13px", color: "#c4c4ca", lineHeight: 1.5 }}>{caption}</div>
    </div>
  );
}

function MemberRow({ member }: { member: FactoryOrganizationMember }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) 120px",
        gap: "12px",
        padding: "12px 0",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontWeight: 700 }}>{member.name}</div>
        <div style={{ color: "#a1a1aa", fontSize: "13px" }}>{member.email}</div>
      </div>
      <div style={{ color: "#d4d4d8", textTransform: "capitalize" }}>{member.role}</div>
      <div>
        <span
          style={badgeStyle(
            member.state === "active" ? "rgba(46, 160, 67, 0.16)" : "rgba(255, 193, 7, 0.18)",
            member.state === "active" ? "#b7f0c3" : "#ffe6a6",
          )}
        >
          {member.state}
        </span>
      </div>
    </div>
  );
}

export function MockSignInPage() {
  const client = useMockAppClient();
  const navigate = useNavigate();
  const mockAccount = {
    name: "Nathan",
    email: "nathan@acme.dev",
    githubLogin: "nathan",
    label: "Mock account for review",
  };

  return (
    <div style={appSurfaceStyle()}>
      <div style={{ ...contentWrapStyle(), justifyContent: "center", minHeight: "100dvh" }}>
        <div
          style={{
            ...cardStyle(),
            padding: "32px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
            gap: "28px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", justifyContent: "center" }}>
            <span style={badgeStyle("rgba(255, 79, 0, 0.18)", "#ffd6c7")}>Mock Better Auth + GitHub OAuth</span>
            <div style={{ fontSize: "42px", lineHeight: 1.05, fontWeight: 900, maxWidth: "11ch" }}>
              Sign in and land directly in the org onboarding funnel.
            </div>
            <div style={{ fontSize: "16px", lineHeight: 1.6, color: "#d4d4d8", maxWidth: "56ch" }}>
              This mock screen stands in for a basic GitHub OAuth sign-in page. After sign-in, the user moves into the
              separate organization selector and then the rest of the onboarding funnel.
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={badgeStyle("rgba(255, 255, 255, 0.06)")}>
                <Github size={14} />
                GitHub sign-in
              </div>
              <div style={badgeStyle("rgba(255, 255, 255, 0.06)")}>
                <Building2 size={14} />
                Org selection
              </div>
              <div style={badgeStyle("rgba(255, 255, 255, 0.06)")}>
                <CreditCard size={14} />
                Hosted billing
              </div>
            </div>
          </div>
          <div
            style={{
              ...cardStyle(),
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "22px", fontWeight: 800 }}>Continue to Sandbox Agent</div>
              <div style={{ color: "#d4d4d8", lineHeight: 1.55 }}>
                This mock sign-in uses a single GitHub account so the org selection step remains the place where the
                user chooses their workspace.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  await client.signInWithGithub("user-nathan");
                  await navigate({ to: "/organizations" });
                })();
              }}
              style={{
                ...primaryButtonStyle(),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                fontSize: "16px",
                padding: "14px 18px",
              }}
            >
              <Github size={18} />
              Sign in with GitHub
            </button>
            <div
              style={{
                borderRadius: "18px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(255, 255, 255, 0.03)",
                padding: "16px",
                display: "grid",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800 }}>{mockAccount.name}</div>
                  <div style={{ color: "#a1a1aa", fontSize: "13px" }}>
                    @{mockAccount.githubLogin} · {mockAccount.email}
                  </div>
                </div>
                <span style={badgeStyle("rgba(24, 140, 255, 0.16)", "#b9d8ff")}>{mockAccount.label}</span>
              </div>
              <div style={{ color: "#a1a1aa", fontSize: "13px", lineHeight: 1.5 }}>
                Sign-in always lands as this single mock user. Organization choice happens on the next screen.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MockOrganizationSelectorPage() {
  const client = useMockAppClient();
  const snapshot = useMockAppSnapshot();
  const user = activeMockUser(snapshot);
  const organizations: FactoryOrganization[] = eligibleOrganizations(snapshot);
  const navigate = useNavigate();

  return (
    <PageShell
      user={user}
      title="Choose an organization"
      eyebrow="Onboarding"
      description="After GitHub sign-in, choose which personal workspace or GitHub organization to onboard. Organization workspaces simulate GitHub app installation, repository import, and shared billing."
      onSignOut={() => {
        void (async () => {
          await client.signOut();
          await navigate({ to: "/signin" });
        })();
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" }}>
        {organizations.map((organization) => (
          <div
            key={organization.id}
            style={{
              ...cardStyle(),
              padding: "22px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "22px", fontWeight: 800 }}>{organization.settings.displayName}</div>
                <div style={{ color: "#a1a1aa", fontSize: "13px" }}>
                  {organization.settings.slug} · {organization.settings.primaryDomain}
                </div>
              </div>
              {statusBadge(organization)}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {githubBadge(organization)}
              <span style={badgeStyle("rgba(255, 255, 255, 0.06)")}>
                <CreditCard size={14} />
                {planCatalog[organization.billing.planId]!.label}
              </span>
            </div>
            <div style={{ color: "#d4d4d8", lineHeight: 1.55, minHeight: "70px" }}>
              {organization.kind === "personal"
                ? "Personal workspaces skip seat purchasing but still show the same onboarding and billing entry points."
                : "Organization onboarding includes GitHub repo import, seat accrual on first prompt, and billing controls for the shared workspace."}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
              <StatCard
                label="Members"
                value={`${organization.members.length}`}
                caption={`${organization.members.filter((member) => member.state === "active").length} active`}
              />
              <StatCard
                label="Repos"
                value={`${organization.repoCatalog.length}`}
                caption={organization.github.lastSyncLabel}
              />
              <StatCard
                label="Seats"
                value={`${organization.seatAssignments.length}/${organization.billing.seatsIncluded}`}
                caption="Accrue on first prompt"
              />
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    await client.selectOrganization(organization.id);
                    await navigate({
                      to: organization.repoImportStatus === "ready" ? workspacePath(organization) : importPath(organization),
                    });
                  })();
                }}
                style={primaryButtonStyle()}
              >
                Continue as {organization.settings.displayName}
              </button>
              <button type="button" onClick={() => void navigate({ to: settingsPath(organization) })} style={secondaryButtonStyle()}>
                Organization settings
              </button>
              <button type="button" onClick={() => void navigate({ to: billingPath(organization) })} style={subtleButtonStyle()}>
                Billing
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export function MockOrganizationImportPage({ organization }: { organization: FactoryOrganization }) {
  const client = useMockAppClient();
  const snapshot = useMockAppSnapshot();
  const user = activeMockUser(snapshot);
  const navigate = useNavigate();

  useEffect(() => {
    if (organization.repoImportStatus === "ready") {
      void navigate({ to: workspacePath(organization), replace: true });
    }
  }, [navigate, organization]);

  return (
    <PageShell
      user={user}
      title={`Importing ${organization.settings.displayName}`}
      eyebrow="Repository Sync"
      description="This mock view stands in for the post-auth GitHub installation and repository import step. Organization onboarding blocks until repo metadata is ready so the user lands in a populated workspace."
      actions={
        <button type="button" onClick={() => void navigate({ to: "/organizations" })} style={secondaryButtonStyle()}>
          <ArrowLeft size={15} />
          Back
        </button>
      }
      onSignOut={() => {
        void (async () => {
          await client.signOut();
          await navigate({ to: "/signin" });
        })();
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: "18px" }}>
        <div style={{ ...cardStyle(), padding: "28px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <LoaderCircle size={24} style={{ animation: "hf-spin 1s linear infinite" }} />
            <div>
              <div style={{ fontSize: "22px", fontWeight: 800 }}>
                {organization.repoImportStatus === "ready" ? "Import complete" : "Preparing repository catalog"}
              </div>
              <div style={{ color: "#a1a1aa", fontSize: "14px" }}>{organization.github.lastSyncLabel}</div>
            </div>
          </div>
          <div style={{ color: "#d4d4d8", lineHeight: 1.6 }}>
            The mock client now simulates the expected onboarding pause: GitHub app access is validated, repository metadata
            is imported, and the resulting workspace stays blocked until ready.
          </div>
          <div
            style={{
              height: "12px",
              borderRadius: "999px",
              overflow: "hidden",
              background: "rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                width: organization.repoImportStatus === "ready" ? "100%" : "76%",
                height: "100%",
                borderRadius: "999px",
                background: "linear-gradient(90deg, #ff4f00, #ff9d00)",
                transition: "width 200ms ease",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {organization.github.installationStatus !== "connected" ? (
              <button
                type="button"
                onClick={() => void client.reconnectGithub(organization.id)}
                style={primaryButtonStyle()}
              >
                Reconnect GitHub App
              </button>
            ) : null}
            <button type="button" onClick={() => void client.triggerRepoImport(organization.id)} style={secondaryButtonStyle()}>
              Re-run import
            </button>
            <button type="button" onClick={() => void navigate({ to: settingsPath(organization) })} style={subtleButtonStyle()}>
              Review org settings
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gap: "14px" }}>
          <StatCard
            label="GitHub"
            value={organization.github.connectedAccount}
            caption={organization.github.installationStatus.replaceAll("_", " ")}
          />
          <StatCard
            label="Repositories"
            value={`${organization.repoCatalog.length}`}
            caption="Imported into the mock workspace catalog"
          />
          <StatCard
            label="Billing"
            value={planCatalog[organization.billing.planId]!.label}
            caption={`${organization.seatAssignments.length} seats accrued so far`}
          />
        </div>
      </div>
    </PageShell>
  );
}

export function MockOrganizationSettingsPage({ organization }: { organization: FactoryOrganization }) {
  const client = useMockAppClient();
  const snapshot = useMockAppSnapshot();
  const user = activeMockUser(snapshot);
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(organization.settings.displayName);
  const [slug, setSlug] = useState(organization.settings.slug);
  const [primaryDomain, setPrimaryDomain] = useState(organization.settings.primaryDomain);
  const seatCaption = useMemo(
    () => `${organization.seatAssignments.length} of ${organization.billing.seatsIncluded} seats already accrued`,
    [organization.billing.seatsIncluded, organization.seatAssignments.length],
  );

  useEffect(() => {
    setDisplayName(organization.settings.displayName);
    setSlug(organization.settings.slug);
    setPrimaryDomain(organization.settings.primaryDomain);
  }, [organization]);

  return (
    <PageShell
      user={user}
      title={`${organization.settings.displayName} settings`}
      eyebrow="Organization"
      description="This mock settings surface covers the org profile, GitHub installation state, repository import controls, and the seat-accrual rule from the spec. It is intentionally product-shaped even though the real backend is not wired yet."
      actions={
        <>
          <button type="button" onClick={() => void navigate({ to: "/organizations" })} style={secondaryButtonStyle()}>
            <ArrowLeft size={15} />
            Orgs
          </button>
          <button type="button" onClick={() => void navigate({ to: billingPath(organization) })} style={subtleButtonStyle()}>
            Billing
          </button>
          <button type="button" onClick={() => void navigate({ to: workspacePath(organization) })} style={primaryButtonStyle()}>
            Open workspace
          </button>
        </>
      }
      onSignOut={() => {
        void (async () => {
          await client.signOut();
          await navigate({ to: "/signin" });
        })();
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)", gap: "18px" }}>
        <div style={{ display: "grid", gap: "18px" }}>
          <div style={{ ...cardStyle(), padding: "24px", display: "grid", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 800 }}>Organization profile</div>
                <div style={{ color: "#a1a1aa", fontSize: "14px" }}>
                  Mock Better Auth org state persisted in the client package.
                </div>
              </div>
              {statusBadge(organization)}
            </div>
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>Display name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                style={inputStyle()}
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>Slug</span>
                <input value={slug} onChange={(event) => setSlug(event.target.value)} style={inputStyle()} />
              </label>
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>Primary domain</span>
                <input
                  value={primaryDomain}
                  onChange={(event) => setPrimaryDomain(event.target.value)}
                  style={inputStyle()}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() =>
                  void client.updateOrganizationProfile({
                    organizationId: organization.id,
                    displayName,
                    slug,
                    primaryDomain,
                  })
                }
                style={primaryButtonStyle()}
              >
                Save settings
              </button>
              <button type="button" onClick={() => void client.triggerRepoImport(organization.id)} style={secondaryButtonStyle()}>
                Refresh repo import
              </button>
            </div>
          </div>

          <div style={{ ...cardStyle(), padding: "24px", display: "grid", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Github size={18} />
              <div style={{ fontSize: "20px", fontWeight: 800 }}>GitHub access</div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {githubBadge(organization)}
              <span style={badgeStyle("rgba(255, 255, 255, 0.06)")}>{organization.github.connectedAccount}</span>
            </div>
            <div style={{ color: "#d4d4d8", lineHeight: 1.55 }}>
              {organization.github.importedRepoCount} repos imported. Last sync: {organization.github.lastSyncLabel}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => void client.reconnectGithub(organization.id)} style={secondaryButtonStyle()}>
                Reconnect GitHub
              </button>
              <button type="button" onClick={() => void navigate({ to: importPath(organization) })} style={subtleButtonStyle()}>
                Open import flow
              </button>
            </div>
          </div>

          <div style={{ ...cardStyle(), padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <Users size={18} />
              <div style={{ fontSize: "20px", fontWeight: 800 }}>Members and roles</div>
            </div>
            <div style={{ color: "#a1a1aa", fontSize: "14px", marginBottom: "8px" }}>
              Mock org membership feeds seat accrual and billing previews.
            </div>
            {organization.members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: "14px" }}>
          <StatCard
            label="Seat policy"
            value="First prompt"
            caption="Seats accrue when a member sends their first prompt in the workspace."
          />
          <StatCard label="Seat usage" value={`${organization.seatAssignments.length}`} caption={seatCaption} />
          <StatCard
            label="Default model"
            value={organization.settings.defaultModel}
            caption="Shown here to match the expected org-level configuration surface."
          />
        </div>
      </div>
    </PageShell>
  );
}

export function MockOrganizationBillingPage({ organization }: { organization: FactoryOrganization }) {
  const client = useMockAppClient();
  const snapshot = useMockAppSnapshot();
  const user = activeMockUser(snapshot);
  const navigate = useNavigate();

  return (
    <PageShell
      user={user}
      title={`${organization.settings.displayName} billing`}
      eyebrow="Stripe Billing"
      description="This mock page covers plan selection, hosted checkout entry, renewal controls, seat usage, and invoice history. It is the reviewable UI surface for Milestone 2 billing without wiring the real Stripe backend yet."
      actions={
        <>
          <button type="button" onClick={() => void navigate({ to: settingsPath(organization) })} style={secondaryButtonStyle()}>
            Org settings
          </button>
          <button type="button" onClick={() => void navigate({ to: workspacePath(organization) })} style={primaryButtonStyle()}>
            Open workspace
          </button>
        </>
      }
      onSignOut={() => {
        void (async () => {
          await client.signOut();
          await navigate({ to: "/signin" });
        })();
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px" }}>
        <StatCard
          label="Current plan"
          value={planCatalog[organization.billing.planId]!.label}
          caption={organization.billing.status.replaceAll("_", " ")}
        />
        <StatCard
          label="Seats used"
          value={`${organization.seatAssignments.length}/${organization.billing.seatsIncluded}`}
          caption="Seat accrual happens on first prompt in the workspace."
        />
        <StatCard
          label="Renewal"
          value={formatDate(organization.billing.renewalAt)}
          caption={`Payment method: ${organization.billing.paymentMethodLabel}`}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
        {(Object.entries(planCatalog) as Array<[FactoryBillingPlanId, (typeof planCatalog)[FactoryBillingPlanId]]>).map(([planId, plan]) => {
          const isCurrent = organization.billing.planId === planId;
          return (
            <div key={planId} style={{ ...cardStyle(), padding: "22px", display: "grid", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "22px", fontWeight: 800 }}>{plan.label}</div>
                  <div style={{ color: "#a1a1aa", fontSize: "13px" }}>{plan.seats}</div>
                </div>
                {isCurrent ? <span style={badgeStyle("rgba(46, 160, 67, 0.16)", "#b7f0c3")}>Current</span> : null}
              </div>
              <div style={{ fontSize: "34px", fontWeight: 900 }}>{plan.price}</div>
              <div style={{ color: "#d4d4d8", lineHeight: 1.55, minHeight: "70px" }}>{plan.summary}</div>
              <button
                type="button"
                onClick={() =>
                  isCurrent
                    ? void navigate({ to: billingPath(organization) })
                    : void navigate({ to: checkoutPath(organization, planId) })
                }
                style={isCurrent ? secondaryButtonStyle() : primaryButtonStyle()}
              >
                {isCurrent ? "Current plan" : `Choose ${plan.label}`}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(320px, 1.1fr)", gap: "18px" }}>
        <div style={{ ...cardStyle(), padding: "24px", display: "grid", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={18} />
            <div style={{ fontSize: "20px", fontWeight: 800 }}>Subscription controls</div>
          </div>
          <div style={{ color: "#d4d4d8", lineHeight: 1.55 }}>
            Stripe customer {organization.billing.stripeCustomerId}. This mock screen intentionally mirrors a hosted
            billing portal entry point and the in-product summary beside it.
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {organization.billing.status === "scheduled_cancel" ? (
              <button type="button" onClick={() => void client.resumeSubscription(organization.id)} style={primaryButtonStyle()}>
                Resume subscription
              </button>
            ) : (
              <button type="button" onClick={() => void client.cancelScheduledRenewal(organization.id)} style={secondaryButtonStyle()}>
                Cancel at period end
              </button>
            )}
            <button
              type="button"
              onClick={() => void navigate({ to: checkoutPath(organization, organization.billing.planId) })}
              style={subtleButtonStyle()}
            >
              Open hosted checkout mock
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle(), padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <BadgeCheck size={18} />
            <div style={{ fontSize: "20px", fontWeight: 800 }}>Invoices</div>
          </div>
          <div style={{ color: "#a1a1aa", fontSize: "14px", marginBottom: "8px" }}>
            Recent hosted billing activity for review.
          </div>
          {organization.billing.invoices.length === 0 ? (
            <div style={{ color: "#d4d4d8" }}>No invoices yet.</div>
          ) : (
            organization.billing.invoices.map((invoice) => (
              <div
                key={invoice.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 120px 90px",
                  gap: "12px",
                  alignItems: "center",
                  padding: "12px 0",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{invoice.label}</div>
                  <div style={{ fontSize: "13px", color: "#a1a1aa" }}>{invoice.issuedAt}</div>
                </div>
                <div style={{ fontWeight: 700 }}>${invoice.amountUsd}</div>
                <div>
                  <span
                    style={badgeStyle(
                      invoice.status === "paid" ? "rgba(46, 160, 67, 0.16)" : "rgba(255, 193, 7, 0.18)",
                      invoice.status === "paid" ? "#b7f0c3" : "#ffe6a6",
                    )}
                  >
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}

export function MockHostedCheckoutPage({
  organization,
  planId,
}: {
  organization: FactoryOrganization;
  planId: FactoryBillingPlanId;
}) {
  const client = useMockAppClient();
  const snapshot = useMockAppSnapshot();
  const user = activeMockUser(snapshot);
  const navigate = useNavigate();
  const plan = planCatalog[planId]!;

  return (
    <PageShell
      user={user}
      title={`Checkout ${plan.label}`}
      eyebrow="Hosted Checkout"
      description="This is the mock hosted Stripe step. Completing checkout updates the org billing state in the client package and returns the reviewer to the billing screen."
      actions={
        <button type="button" onClick={() => void navigate({ to: billingPath(organization) })} style={secondaryButtonStyle()}>
          <ArrowLeft size={15} />
          Back to billing
        </button>
      }
      onSignOut={() => {
        void (async () => {
          await client.signOut();
          await navigate({ to: "/signin" });
        })();
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.95fr) minmax(320px, 1.05fr)", gap: "18px" }}>
        <div style={{ ...cardStyle(), padding: "24px", display: "grid", gap: "14px" }}>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>Order summary</div>
          <div style={{ color: "#d4d4d8", lineHeight: 1.55 }}>
            {organization.settings.displayName} is checking out on the {plan.label} plan.
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            <CheckoutLine label="Plan" value={plan.label} />
            <CheckoutLine label="Price" value={plan.price} />
            <CheckoutLine label="Included seats" value={plan.seats} />
            <CheckoutLine label="Payment method" value={planId === "enterprise" ? "ACH mandate" : "Visa ending in 4242"} />
          </div>
        </div>
        <div style={{ ...cardStyle(), padding: "24px", display: "grid", gap: "16px" }}>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>Mock card details</div>
          <div style={{ display: "grid", gap: "12px" }}>
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>Cardholder</span>
              <input value={organization.settings.displayName} readOnly style={inputStyle()} />
            </label>
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>Card number</span>
              <input value="4242 4242 4242 4242" readOnly style={inputStyle()} />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                await client.completeHostedCheckout(organization.id, planId);
                await navigate({ to: billingPath(organization), replace: true });
              })();
            }}
            style={primaryButtonStyle()}
          >
            Complete checkout
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function CheckoutLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px 0",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div style={{ color: "#a1a1aa" }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    background: "rgba(255, 255, 255, 0.04)",
    color: "#ffffff",
    padding: "12px 14px",
    outline: "none",
  };
}
