import { AdminSecretUnlockDomain, denteAdminSecretRequestHeaders, operatorWorkflowFailureMessage, WorkflowResponseError } from "../../AppHelpers";
import { useSettingsStore } from "../../store/settingsStore";
import { useAppStore } from "../../store/appStore";

export function useAuthLogic({
    setError,
    loadDashboard,
    loadTelegramControlPlane
}: any) {
    const {
        dashboard,
        currentView,
        settingsTab,
        accessUnlockRequired,
        setAccessUnlockRequired,
        setAccessUnlockMessage,
        setDashboard
    } = useAppStore();

    const {
        onboardingStep,
        clinicalAdminSecretDraft,
        setClinicalAdminSecretDraft,
        settingsAdminSecretDraft,
        setSettingsAdminSecretDraft,
        scheduleAdminSecretDraft,
        setScheduleAdminSecretDraft,
        telegramAdminSecretDraft,
        setTelegramAdminSecretDraft,
        clinicalAdminSecretSession,
        setClinicalAdminSecretSession,
        settingsAdminSecretSession,
        setSettingsAdminSecretSession,
        scheduleAdminSecretSession,
        setScheduleAdminSecretSession,
        telegramAdminSecretSession,
        setTelegramAdminSecretSession,
    } = useSettingsStore();

	function rememberAdminSecret(
		secret: string,
		domain: AdminSecretUnlockDomain,
	) {
		const normalized = secret.trim();
		if (!normalized) return;
		if (domain === "all" || domain === "clinical")
			setClinicalAdminSecretSession(normalized);
		if (domain === "all" || domain === "settings")
			setSettingsAdminSecretSession(normalized);
		if (domain === "all" || domain === "schedule")
			setScheduleAdminSecretSession(normalized);
		if (domain === "all" || domain === "telegram")
			setTelegramAdminSecretSession(normalized);
	}

	function forgetAdminSecret(domain: AdminSecretUnlockDomain) {
		if (domain === "all" || domain === "clinical")
			setClinicalAdminSecretSession("");
		if (domain === "all" || domain === "settings")
			setSettingsAdminSecretSession("");
		if (domain === "all" || domain === "schedule")
			setScheduleAdminSecretSession("");
		if (domain === "all" || domain === "telegram")
			setTelegramAdminSecretSession("");
	}

	function currentAdminSecretUnlockDomain(): AdminSecretUnlockDomain {
		if (accessUnlockRequired || !dashboard) return "all";
		if (currentView === "schedule") return "schedule";
		if (currentView === "settings")
			return settingsTab === "telegram" ? "telegram" : "settings";
		if (onboardingStep === "telegram") return "telegram";
		return "clinical";
	}

	function resolvedAdminSecretUnlockDomain(
		domainOverride?: AdminSecretUnlockDomain,
	): AdminSecretUnlockDomain {
		return domainOverride ?? currentAdminSecretUnlockDomain();
	}

	function adminSecretDraftForDomain(domain: AdminSecretUnlockDomain): string {
		if (domain === "settings") return settingsAdminSecretDraft;
		if (domain === "schedule") return scheduleAdminSecretDraft;
		if (domain === "telegram") return telegramAdminSecretDraft;
		return clinicalAdminSecretDraft;
	}

	function clearAdminSecretDraft(domain: AdminSecretUnlockDomain) {
		if (domain === "all" || domain === "clinical")
			setClinicalAdminSecretDraft("");
		if (domain === "all" || domain === "settings")
			setSettingsAdminSecretDraft("");
		if (domain === "all" || domain === "schedule")
			setScheduleAdminSecretDraft("");
		if (domain === "all" || domain === "telegram")
			setTelegramAdminSecretDraft("");
	}

	function settingsAccessHeaders(
		extra: Record<string, string> = {},
		adminSecretOverride?: string,
	): Record<string, string> {
		return denteAdminSecretRequestHeaders(
			extra,
			adminSecretOverride ?? settingsAdminSecretSession,
		);
	}

	function scheduleMutationHeaders(
		extra: Record<string, string> = {},
		adminSecretOverride?: string,
	): Record<string, string> {
		return denteAdminSecretRequestHeaders(
			extra,
			adminSecretOverride ?? scheduleAdminSecretSession,
		);
	}

	function denteClinicalMutationHeaders(
		extra: Record<string, string> = {},
		adminSecretOverride?: string,
	): Record<string, string> {
		return denteAdminSecretRequestHeaders(
			extra,
			adminSecretOverride ?? clinicalAdminSecretSession,
		);
	}

	function denteClinicalReadHeaders(
		extra: Record<string, string> = {},
		adminSecretOverride?: string,
	): Record<string, string> {
		return denteAdminSecretRequestHeaders(
			extra,
			adminSecretOverride ?? clinicalAdminSecretSession,
		);
	}

	function revokeObjectUrlIfNeeded(url: string): void {
		if (url.startsWith("blob:")) URL.revokeObjectURL(url);
	}

	function revokeObjectUrlMap(urls: Record<string, string>): void {
		Object.values(urls).forEach(revokeObjectUrlIfNeeded);
	}

	function unlockTelegramAdminSession(
		domainOverride?: AdminSecretUnlockDomain,
	) {
		const domain = resolvedAdminSecretUnlockDomain(domainOverride);
		const secret = adminSecretDraftForDomain(domain).trim();
		if (!secret) {
			setError(
				"Введите секрет администратора клиники, если он включен в серверных настройках клиники.",
			);
			return;
		}
		rememberAdminSecret(secret, domain);
		clearAdminSecretDraft(domain);
		setError(null);
		if (domain === "settings" || domain === "schedule") return;
		if (domain === "telegram") {
			void loadTelegramControlPlane({ adminSecret: secret });
			return;
		}
		setAccessUnlockRequired(false);
		setAccessUnlockMessage("");
		void loadDashboard({ adminSecret: secret })
			.then(() => {
				if (domain === "all")
					void loadTelegramControlPlane({ adminSecret: secret, silent: true });
			})
			.catch((loadError: unknown) => {
				forgetAdminSecret(domain);
				setError(
					operatorWorkflowFailureMessage(
						"Не удалось загрузить данные клиники",
						loadError,
					),
				);
			});
	}

	function lockTelegramAdminSession(domainOverride?: AdminSecretUnlockDomain) {
		const domain = resolvedAdminSecretUnlockDomain(domainOverride);
		forgetAdminSecret(domain);
		clearAdminSecretDraft(domain);
		if (domain === "settings" || domain === "schedule" || domain === "telegram")
			return;
		setDashboard(null);
		void loadDashboard().catch((loadError: unknown) => {
			setError(
				operatorWorkflowFailureMessage(
					"Не удалось загрузить данные клиники",
					loadError,
				),
			);
		});
	}

	const activeWorkspaceProfile =
		dashboard?.clinicSettings?.workspaceProfiles?.find(
			(profile) => profile.mode === dashboard?.clinicSettings?.profile?.mode,
		) ?? dashboard?.clinicSettings?.workspaceProfiles?.[0];
	const settingsAdminSecretDomain: AdminSecretUnlockDomain =
		settingsTab === "telegram" ? "telegram" : "settings";

    return {
        activeWorkspaceProfile,
        settingsAdminSecretDomain,
        rememberAdminSecret,
        forgetAdminSecret,
        currentAdminSecretUnlockDomain,
        resolvedAdminSecretUnlockDomain,
        adminSecretDraftForDomain,
        clearAdminSecretDraft,
        settingsAccessHeaders,
        scheduleMutationHeaders,
        denteClinicalMutationHeaders,
        denteClinicalReadHeaders,
        unlockTelegramAdminSession,
        lockTelegramAdminSession,
        revokeObjectUrlIfNeeded,
        revokeObjectUrlMap,
    };
}
