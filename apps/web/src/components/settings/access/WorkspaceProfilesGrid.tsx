import type React from "react";

export interface WorkspaceProfilesGridProps {
	// biome-ignore lint/suspicious/noExplicitAny: profile list
	profiles: any[];
	activeMode?: string;
	clinicModeLabels: Record<string, { title?: string }>;
	viewLabels: Record<string, string>;
}

export const WorkspaceProfilesGrid: React.FC<WorkspaceProfilesGridProps> = ({
	profiles,
	activeMode,
	clinicModeLabels,
	viewLabels,
}) => {
	if (!profiles.length) return null;

	return (
		<div className="workspace-profile-grid">
			{profiles.map((profile) => (
				<article
					className={`workspace-profile-card ${profile.mode === activeMode ? "active" : ""}`}
					key={profile.id}
				>
					<div className="workspace-profile-head">
						<span>{clinicModeLabels[profile.mode]?.title ?? profile.mode}</span>
						<strong>{profile.title}</strong>
						<p>{profile.description}</p>
					</div>
					<section className="workspace-token-row" aria-label="Разделы профиля">
						{(profile.visibleSections ?? []).map((section: string) => (
							<span key={section}>{viewLabels[section] ?? section}</span>
						))}
					</section>
					<ul>
						{(profile.automations ?? []).slice(0, 3).map((automation: string) => (
							<li key={automation}>{automation}</li>
						))}
					</ul>
					<small>
						{profile.compactNavigation
							? "Компактная навигация для телефона"
							: "Расширенная навигация для команды"}
					</small>
				</article>
			))}
		</div>
	);
};
