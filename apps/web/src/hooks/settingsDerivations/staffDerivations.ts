import type { Dashboard, RoleQueue, StaffMember } from "@dental/shared";
import type { RoleAccessPolicy, WorkspaceProfile } from "./types";

export interface StaffDerivationsParams {
	newStaffName?: string;
	newChairName?: string;
	telegramAdminSecretDraft?: string;
	settingsTab?: string;
	dashboard?: Dashboard | null;
	telegramLinkStaffOptions?: StaffMember[];
	activeWorkspaceProfile?: WorkspaceProfile | null;
}

export function deriveStaffSettings(params: StaffDerivationsParams) {
	const {
		newStaffName,
		newChairName,
		telegramAdminSecretDraft,
		settingsTab,
		dashboard,
		telegramLinkStaffOptions,
		activeWorkspaceProfile,
	} = params;

	const _newStaffReadyToCreate = (newStaffName || "").trim().length > 0;
	const _newChairReadyToCreate = (newChairName || "").trim().length > 0;
	const _adminSecretReady = (telegramAdminSecretDraft || "").trim().length > 0;
	const _adminSecretScopeWarning =
		settingsTab === "telegram"
			? "Этот секрет относится только к Telegram. Он не разблокирует настройки клиники, расписание или клинические данные, если для них включены отдельные секреты."
			: "Этот секрет относится только к настройкам клиники. Он не разблокирует расписание, Telegram или клинические данные, если для них включены отдельные секреты.";

	const _typedRoleQueues = (dashboard?.shiftIntelligence?.roleQueues ??
		[]) as RoleQueue[];
	const _typedStaffMembers = (dashboard?.clinicSettings?.staff ??
		[]) as StaffMember[];
	const _typedTelegramLinkStaffOptions = (telegramLinkStaffOptions ??
		[]) as StaffMember[];
	const _typedActiveWorkspaceProfile =
		activeWorkspaceProfile as WorkspaceProfile | null;
	const _typedWorkspaceProfiles = (dashboard?.clinicSettings
		?.workspaceProfiles ?? []) as WorkspaceProfile[];
	const _typedRoleAccessPolicies = (dashboard?.clinicSettings
		?.roleAccessPolicies ?? []) as RoleAccessPolicy[];

	return {
		_newStaffReadyToCreate,
		_newChairReadyToCreate,
		_adminSecretReady,
		_adminSecretScopeWarning,
		_typedRoleQueues,
		_typedStaffMembers,
		_typedTelegramLinkStaffOptions,
		_typedActiveWorkspaceProfile,
		_typedWorkspaceProfiles,
		_typedRoleAccessPolicies,
	};
}
