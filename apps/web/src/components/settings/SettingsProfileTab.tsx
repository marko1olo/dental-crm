import { User } from "lucide-react";
import "./SettingsProfileTab.css";
import { useLocalDeviceSettings } from "../../hooks/useLocalDeviceSettings";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useThemeStore } from "../../store/themeStore";
import { useUiStore } from "../../store/uiStore";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { useWorkspaceProfileStore } from "../../hooks/useWorkspaceProfile";

import { useProfileSettingsLogic } from "./profile/useProfileSettingsLogic";
import { ProfilePersonalSection } from "./profile/ProfilePersonalSection";
import { ProfileReferralSection } from "./profile/ProfileReferralSection";
import { ProfilePasswordSection } from "./profile/ProfilePasswordSection";
import { ProfilePinSection } from "./profile/ProfilePinSection";
import { ProfileAppearanceSection } from "./profile/ProfileAppearanceSection";

export function SettingsProfileTab() {
	const themeStore = useThemeStore();
	const uiStore = useUiStore();
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const { staffRoleLabels, activeStaffUser, dashboard } = mergedProps;
	const hasReferralModule = useWorkspaceProfileStore((s) => s.hasReferralModule);

	const { settings: localDeviceSettings, setHighContrast } = useLocalDeviceSettings();
	const highContrast = localDeviceSettings.highContrast;

	const {
		profile,
		profileLoading,
		oldPassword,
		setOldPassword,
		newPassword,
		setNewPassword,
		confirmPassword,
		setConfirmPassword,
		showOldPw,
		setShowOldPw,
		showNewPw,
		setShowNewPw,
		passwordLoading,
		handleUpdatePassword,
		oldPin,
		setOldPin,
		newPin,
		setNewPin,
		confirmPin,
		setConfirmPin,
		pinLoading,
		handleUpdatePin,
	} = useProfileSettingsLogic(activeStaffUser ?? null);

	if (profileLoading) {
		return <div className="profile-studio-container animate-fade-in" style={{ padding: "20px" }}>Загрузка профиля...</div>;
	}

	return (
		<div className="profile-studio-container animate-fade-in">
			<div className="import-copy" style={{ marginBottom: "0" }}>
				<User aria-hidden="true" />
				<div>
					<p className="eyebrow">Мой профиль</p>
					<h2 id="tabpanel-profile-title">Настройки аккаунта</h2>
					<p>
						Личные данные, пароль и PIN-код для входа в систему, а также
						предпочтения интерфейса.
					</p>
				</div>
			</div>

			<div
				className="profile-form-grid"
				style={{ display: "flex", flexDirection: "column", gap: "24px" }}
			>
				<ProfilePersonalSection
					profile={profile}
					staffRoleLabels={staffRoleLabels}
				/>

				{hasReferralModule && (
					<ProfileReferralSection
						profile={profile}
						dashboard={dashboard}
					/>
				)}

				<ProfilePasswordSection
					oldPassword={oldPassword}
					setOldPassword={setOldPassword}
					newPassword={newPassword}
					setNewPassword={setNewPassword}
					confirmPassword={confirmPassword}
					setConfirmPassword={setConfirmPassword}
					showOldPw={showOldPw}
					setShowOldPw={setShowOldPw}
					showNewPw={showNewPw}
					setShowNewPw={setShowNewPw}
					passwordLoading={passwordLoading}
					handleUpdatePassword={handleUpdatePassword}
				/>

				<ProfilePinSection
					oldPin={oldPin}
					setOldPin={setOldPin}
					newPin={newPin}
					setNewPin={setNewPin}
					confirmPin={confirmPin}
					setConfirmPin={setConfirmPin}
					pinLoading={pinLoading}
					handleUpdatePin={handleUpdatePin}
				/>

				<ProfileAppearanceSection
					themeStore={themeStore}
					useThemeStore={useThemeStore}
					uiStore={uiStore}
					useUiStore={useUiStore}
					highContrast={highContrast}
					setHighContrast={setHighContrast}
					appLogic={appLogic}
				/>
			</div>
		</div>
	);
}
