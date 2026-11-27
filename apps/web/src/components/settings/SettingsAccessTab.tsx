import type React from "react";
import { viewLabels as workspaceViewLabels } from "../../utils/routeUtils";
import { GranularRoleMatrixView } from "./GranularRoleMatrixView";
import { AccessSecurityGuaranteesGrid } from "./access/AccessSecurityGuaranteesGrid";
import { AccessSecurityHero } from "./access/AccessSecurityHero";
import { ActiveWorkspaceProfileCard } from "./access/ActiveWorkspaceProfileCard";
import { InviteStaffCard } from "./access/InviteStaffCard";

export interface SettingsAccessTabProps {
	props?: {
		dashboard?: {
			clinicSettings?: {
				profile?: { mode?: string };
			};
		};
		activeWorkspaceProfile?: import("./access/ActiveWorkspaceProfileCard").WorkspaceProfileItem | null | undefined;
		workspaceScopeLabels?: Record<string, string>;
		staffRoleLabels?: Record<string, string>;
		clinicModeLabels?: Record<string, { title?: string }>;
		policyAuditEventLabels?: Record<string, string>;
		[key: string]: unknown;
	};
	settingsTab?: string;
	[key: string]: unknown;
}

export function SettingsAccessTab({ props = {} }: SettingsAccessTabProps) {
	const {
		activeWorkspaceProfile,
		workspaceScopeLabels = {},
		staffRoleLabels = {},
	} = props || {};
	const viewLabels = (workspaceViewLabels || {}) as Record<string, string>;

	return (
		<section
			className="access-settings flex flex-col gap-6 pb-32 sm:pb-24 w-full max-w-full min-w-0"
			aria-label="Доступы, рабочие профили и роли"
		>
			<AccessSecurityHero />
			<GranularRoleMatrixView />
			<AccessSecurityGuaranteesGrid />
			<InviteStaffCard />
			<ActiveWorkspaceProfileCard
				profile={activeWorkspaceProfile}
				workspaceScopeLabels={workspaceScopeLabels}
				staffRoleLabels={staffRoleLabels}
				viewLabels={viewLabels}
			/>
			<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</section>
	);
}

export default SettingsAccessTab;
