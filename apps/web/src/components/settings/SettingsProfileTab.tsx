import type React from "react";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { PROFILE_PANEL_SUBJECT, type StaffProfile } from "./settingsProfileLoad";
import { SettingsProfileYandexSection } from "./SettingsProfileYandexSection";
import { ProfileLoadingStates } from "./profile/ProfileLoadingStates";
import { ProfilePasswordSection } from "./profile/ProfilePasswordSection";
import { ProfilePersonalDataSection } from "./profile/ProfilePersonalDataSection";
import { ProfilePinSection } from "./profile/ProfilePinSection";
import { useSettingsProfile } from "./profile/useSettingsProfile";

interface SettingsProfileTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props: Record<string, any>;
}

export function SettingsProfileTab({ props }: SettingsProfileTabProps) {
	const initialProfile = (props.activeStaffUser as StaffProfile | undefined) ?? null;
	const { profile, loadState, loadProfile } = useSettingsProfile(initialProfile);

	if (!profile) {
		return <ProfileLoadingStates loadState={loadState} onRetry={() => void loadProfile()} />;
	}

	return (
		<div className="settings-tab-pane animate-fade-in-up max-w-4xl w-full">
			<div className="mb-6">
				<h2 id="tabpanel-profile-title" className="text-lg md:text-xl font-bold text-[var(--ink)] tracking-tight m-0">
					Мой профиль
				</h2>
				<p className="text-xs text-[var(--muted)] mt-1 m-0">
					Личные данные, пароль и PIN-код для входа в систему
				</p>
			</div>

			{loadState.phase === "failed" && (
				<div className="mb-6">
					<PanelLoadFailure
						subject={PROFILE_PANEL_SUBJECT}
						status={loadState.status}
						onRetry={() => void loadProfile()}
					/>
				</div>
			)}

			<div className="flex flex-col gap-6 w-full">
				<ProfilePersonalDataSection profile={profile} />
				<ProfilePasswordSection />
				<SettingsProfileYandexSection profile={profile} />
				<ProfilePinSection />
			</div>
		</div>
	);
}
