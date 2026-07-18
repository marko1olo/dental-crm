import React from "react";
import { viewLabels as workspaceViewLabels } from "../../../workspaceShell";

export function AccessActiveWorkspace({
	typedActiveWorkspaceProfile,
	workspaceScopeLabels,
	staffRoleLabels,
}: {
	typedActiveWorkspaceProfile: any;
	workspaceScopeLabels: any;
	staffRoleLabels: any;
}) {
	const viewLabels = workspaceViewLabels as Record<string, string>;

	if (!typedActiveWorkspaceProfile) return null;

	return (
		<section className="access-workspace-active">
			<div className="access-workspace-active-head">
				<div>
					<h3>{typedActiveWorkspaceProfile.title}</h3>
					<p>{typedActiveWorkspaceProfile.description}</p>
				</div>
				<span className="access-workspace-active-badge">
					{workspaceScopeLabels[typedActiveWorkspaceProfile.scope]}
				</span>
			</div>
			<div className="access-workspace-active-roles">
				<strong>
					Стартовый экран:{" "}
					{viewLabels[typedActiveWorkspaceProfile.defaultSection]}
				</strong>
				<span style={{ margin: "0 8px", opacity: 0.5 }}>|</span>
				{typedActiveWorkspaceProfile.primaryRoles.map((role: string) => (
					<span key={role}>{staffRoleLabels[role]}</span>
				))}
			</div>
		</section>
	);
}
