import type React from "react";

export interface WorkspaceProfileItem {
	scope: string;
	title: string;
	description?: string;
	defaultSection: string;
	primaryRoles?: readonly string[];
	[key: string]: unknown;
}

export interface ActiveWorkspaceProfileCardProps {
	profile?: WorkspaceProfileItem | null | undefined;
	workspaceScopeLabels: Record<string, string>;
	staffRoleLabels: Record<string, string>;
	viewLabels: Record<string, string>;
}

export const ActiveWorkspaceProfileCard: React.FC<ActiveWorkspaceProfileCardProps> = ({
	profile,
	workspaceScopeLabels,
	staffRoleLabels,
	viewLabels,
}) => {
	if (!profile) return null;

	return (
		<article className="active-workspace-card">
			<div>
				<span>{workspaceScopeLabels[profile.scope]}</span>
				<h3>{profile.title}</h3>
				<p>{profile.description}</p>
			</div>
			<div className="workspace-token-row">
				<strong>Старт: {viewLabels[profile.defaultSection]}</strong>
				{(profile.primaryRoles ?? []).map((role: string) => (
					<span key={role}>{staffRoleLabels[role] ?? role}</span>
				))}
			</div>
		</article>
	);
};
