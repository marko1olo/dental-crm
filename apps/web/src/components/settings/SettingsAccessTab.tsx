import type React from "react";
import { viewLabels as workspaceViewLabels } from "../../workspaceShell";
import { GranularRoleMatrixView } from "./GranularRoleMatrixView";
import { AccessPoliciesGrid } from "./access/AccessPoliciesGrid";
import { AccessSecurityGuaranteesGrid } from "./access/AccessSecurityGuaranteesGrid";
import { AccessSecurityHero } from "./access/AccessSecurityHero";
import { ActiveWorkspaceProfileCard } from "./access/ActiveWorkspaceProfileCard";
import { InviteStaffCard } from "./access/InviteStaffCard";
import { WorkspaceProfilesGrid } from "./access/WorkspaceProfilesGrid";

export interface SettingsAccessTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props?: any;
	settingsTab?: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	[key: string]: any;
}

export function SettingsAccessTab({ props = {} }: SettingsAccessTabProps) {
	const {
		dashboard,
		activeWorkspaceProfile,
		workspaceScopeLabels = {},
		staffRoleLabels = {},
		clinicModeLabels = {},
		policyAuditEventLabels = {},
	} = props || {};
	const viewLabels = (workspaceViewLabels || {}) as Record<string, string>;

	return (
		<section
			className="access-settings flex flex-col gap-6 pb-32 sm:pb-24 w-full max-w-full min-w-0"
			aria-label="Доступы, рабочие профили и роли"
		>
			<AccessSecurityHero />
			<AccessSecurityGuaranteesGrid />
			<GranularRoleMatrixView />
			<InviteStaffCard />
			<ActiveWorkspaceProfileCard
				profile={activeWorkspaceProfile}
				workspaceScopeLabels={workspaceScopeLabels}
				staffRoleLabels={staffRoleLabels}
				viewLabels={viewLabels}
			/>
			<WorkspaceProfilesGrid
				profiles={dashboard?.clinicSettings?.workspaceProfiles ?? []}
				activeMode={dashboard?.clinicSettings?.profile?.mode}
				clinicModeLabels={clinicModeLabels}
				viewLabels={viewLabels}
			/>
			<AccessPoliciesGrid
				policies={dashboard?.clinicSettings?.roleAccessPolicies ?? []}
				workspaceScopeLabels={workspaceScopeLabels}
				viewLabels={viewLabels}
				policyAuditEventLabels={policyAuditEventLabels}
			/>
			<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</section>
	);
}

export default SettingsAccessTab;
