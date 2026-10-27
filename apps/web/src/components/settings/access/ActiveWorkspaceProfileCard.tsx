import type React from "react";

export interface ActiveWorkspaceProfileCardProps {
	// biome-ignore lint/suspicious/noExplicitAny: profile payload
	profile: any;
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
