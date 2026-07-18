import React from "react";
import "./SettingsAccessTab.css";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";

import { AccessInviteForm } from "./access/AccessInviteForm";
import { AccessActiveWorkspace } from "./access/AccessActiveWorkspace";
import { AccessPolicyGrid } from "./access/AccessPolicyGrid";

type WorkspaceProfile = any;
type RoleAccessPolicy = any;

export function SettingsAccessTab({ settingsTab }: { settingsTab: string }) {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		dashboard,
		activeWorkspaceProfile,
		workspaceScopeLabels,
		staffRoleLabels,
		policyAuditEventLabels,
	} = mergedProps;

	if (settingsTab !== "access") return null;

	const hasAssistants = activeWorkspaceProfile?.hasAssistants ?? true;
	const typedActiveWorkspaceProfile =
		activeWorkspaceProfile as WorkspaceProfile | null;
	const typedRoleAccessPolicies = (dashboard?.clinicSettings
		?.roleAccessPolicies ?? []) as RoleAccessPolicy[];

	return (
		<div className="access-studio-container animate-fade-in">
			<AccessInviteForm hasAssistants={hasAssistants} />

			<AccessActiveWorkspace
				typedActiveWorkspaceProfile={typedActiveWorkspaceProfile}
				workspaceScopeLabels={workspaceScopeLabels}
				staffRoleLabels={staffRoleLabels}
			/>

			<AccessPolicyGrid
				typedRoleAccessPolicies={typedRoleAccessPolicies}
				workspaceScopeLabels={workspaceScopeLabels}
				policyAuditEventLabels={policyAuditEventLabels}
			/>
		</div>
	);
}
