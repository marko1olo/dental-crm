import { useCallback, useMemo, useRef } from "react";
import {
	type AdminSecretUnlockDomain,
	denteAdminSecretRequestHeaders,
	operatorWorkflowFailureMessage,
} from "../../AppHelpers";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { useAppStore } from "../../store/appStore";
import { useSettingsStore } from "../../store/settingsStore";

// biome-ignore lint/suspicious/noExplicitAny: expected any for loosely typed arguments
export function useAuthLogic({
	setError,
	loadDashboard,
	loadTelegramControlPlane,
}: any) {
	const setErrorRef = useRef(setError);
	setErrorRef.current = setError;
	const loadDashboardRef = useRef(loadDashboard);
	loadDashboardRef.current = loadDashboard;
	const loadTelegramControlPlaneRef = useRef(loadTelegramControlPlane);
	loadTelegramControlPlaneRef.current = loadTelegramControlPlane;
	const {
		dashboard,
		currentView,
		settingsTab,
		accessUnlockRequired,
		setAccessUnlockRequired,
		setAccessUnlockMessage,
		setDashboard,
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

	const rememberAdminSecret = useCallback(
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
		},
		[
			setClinicalAdminSecretSession,
			setSettingsAdminSecretSession,
			setScheduleAdminSecretSession,
			setTelegramAdminSecretSession,
		],
	);

	const forgetAdminSecret = useCallback(
		function forgetAdminSecret(domain: AdminSecretUnlockDomain) {
			if (domain === "all" || domain === "clinical")
				setClinicalAdminSecretSession("");
			if (domain === "all" || domain === "settings")
				setSettingsAdminSecretSession("");
			if (domain === "all" || domain === "schedule")
				setScheduleAdminSecretSession("");
			if (domain === "all" || domain === "telegram")
				setTelegramAdminSecretSession("");
		},
		[
			setClinicalAdminSecretSession,
			setSettingsAdminSecretSession,
			setScheduleAdminSecretSession,
			setTelegramAdminSecretSession,
		],
	);

	const currentAdminSecretUnlockDomain = useCallback(
		function currentAdminSecretUnlockDomain(): AdminSecretUnlockDomain {
			if (accessUnlockRequired || !dashboard) return "all";
			if (currentView === "schedule") return "schedule";
			if (currentView === "settings")
				return settingsTab === "telegram" ? "telegram" : "settings";
			if (onboardingStep === "telegram") return "telegram";
			return "clinical";
		},
		[accessUnlockRequired, dashboard, currentView, settingsTab, onboardingStep],
	);

	const resolvedAdminSecretUnlockDomain = useCallback(
		function resolvedAdminSecretUnlockDomain(
			domainOverride?: AdminSecretUnlockDomain,
		): AdminSecretUnlockDomain {
			return domainOverride ?? currentAdminSecretUnlockDomain();
		},
		[currentAdminSecretUnlockDomain],
	);

	const adminSecretDraftForDomain = useCallback(
		function adminSecretDraftForDomain(
			domain: AdminSecretUnlockDomain,
		): string {
			if (domain === "settings") return settingsAdminSecretDraft;
			if (domain === "schedule") return scheduleAdminSecretDraft;
			if (domain === "telegram") return telegramAdminSecretDraft;
			return clinicalAdminSecretDraft;
		},
		[
			settingsAdminSecretDraft,
			scheduleAdminSecretDraft,
			telegramAdminSecretDraft,
			clinicalAdminSecretDraft,
		],
	);

	const clearAdminSecretDraft = useCallback(
		function clearAdminSecretDraft(domain: AdminSecretUnlockDomain) {
			if (domain === "all" || domain === "clinical")
				setClinicalAdminSecretDraft("");
			if (domain === "all" || domain === "settings")
				setSettingsAdminSecretDraft("");
			if (domain === "all" || domain === "schedule")
				setScheduleAdminSecretDraft("");
			if (domain === "all" || domain === "telegram")
				setTelegramAdminSecretDraft("");
		},
		[
			setClinicalAdminSecretDraft,
			setSettingsAdminSecretDraft,
			setScheduleAdminSecretDraft,
			setTelegramAdminSecretDraft,
		],
	);

	const settingsAccessHeaders = useCallback(
		function settingsAccessHeaders(
			extra: Record<string, string> = {},
			adminSecretOverride?: string,
		): Record<string, string> {
			return denteAdminSecretRequestHeaders(
				extra,
				adminSecretOverride ?? settingsAdminSecretSession,
			);
		},
		[settingsAdminSecretSession],
	);

	const scheduleMutationHeaders = useCallback(
		function scheduleMutationHeaders(
			extra: Record<string, string> = {},
			adminSecretOverride?: string,
		): Record<string, string> {
			return denteAdminSecretRequestHeaders(
				extra,
				adminSecretOverride ?? scheduleAdminSecretSession,
			);
		},
		[scheduleAdminSecretSession],
	);

	const denteClinicalMutationHeaders = useCallback(
		function denteClinicalMutationHeaders(
			extra: Record<string, string> = {},
			adminSecretOverride?: string,
		): Record<string, string> {
			return denteAdminSecretRequestHeaders(
				extra,
				adminSecretOverride ?? clinicalAdminSecretSession,
			);
		},
		[clinicalAdminSecretSession],
	);

	const denteClinicalReadHeaders = useCallback(
		function denteClinicalReadHeaders(
			extra: Record<string, string> = {},
			adminSecretOverride?: string,
		): Record<string, string> {
			return denteAdminSecretRequestHeaders(
				extra,
				adminSecretOverride ?? clinicalAdminSecretSession,
			);
		},
		[clinicalAdminSecretSession],
	);

	const revokeObjectUrlIfNeeded = useCallback(function revokeObjectUrlIfNeeded(
		url: string,
	): void {
		if (url.startsWith("blob:")) URL.revokeObjectURL(url);
	}, []);

	const revokeObjectUrlMap = useCallback(
		function revokeObjectUrlMap(urls: Record<string, string>): void {
			Object.values(urls).forEach(revokeObjectUrlIfNeeded);
		},
		[revokeObjectUrlIfNeeded],
	);

	const unlockTelegramAdminSession = useCallback(
		(domainOverride?: AdminSecretUnlockDomain) => {
			const domain = resolvedAdminSecretUnlockDomain(domainOverride);
			const secret = adminSecretDraftForDomain(domain).trim();
			if (!secret) {
				setErrorRef.current(
					"Введите секрет администратора клиники, если он включен в серверных настройках клиники.",
				);
				return;
			}
			rememberAdminSecret(secret, domain);
			clearAdminSecretDraft(domain);
			setErrorRef.current(null);
			if (domain === "settings" || domain === "schedule") return;
			if (domain === "telegram") {
				void loadTelegramControlPlaneRef.current({ adminSecret: secret });
				return;
			}
			setAccessUnlockRequired(false);
			setAccessUnlockMessage("");
			void loadDashboardRef
				.current({ adminSecret: secret })
				.then(() => {
					if (domain === "all")
						void loadTelegramControlPlaneRef.current({
							adminSecret: secret,
							silent: true,
						});
				})
				.catch((loadError: unknown) => {
					showToast(
						actionFailureToast(
							"Операция завершилась ошибкой",
							(loadError as { status?: number })?.status ?? null,
						),
						"error",
					);
					forgetAdminSecret(domain);
					setErrorRef.current(
						operatorWorkflowFailureMessage(
							"Не удалось загрузить данные клиники",
							loadError,
						),
					);
				});
		},
		[
			resolvedAdminSecretUnlockDomain,
			adminSecretDraftForDomain,
			rememberAdminSecret,
			clearAdminSecretDraft,
			setAccessUnlockRequired,
			setAccessUnlockMessage,
			forgetAdminSecret,
		],
	);

	const lockTelegramAdminSession = useCallback(
		(domainOverride?: AdminSecretUnlockDomain) => {
			const domain = resolvedAdminSecretUnlockDomain(domainOverride);
			forgetAdminSecret(domain);
			clearAdminSecretDraft(domain);
			if (
				domain === "settings" ||
				domain === "schedule" ||
				domain === "telegram"
			)
				return;
			setDashboard(null);
			void loadDashboardRef.current().catch((loadError: unknown) => {
				showToast(
					actionFailureToast(
						"Операция завершилась ошибкой",
						(loadError as { status?: number })?.status ?? null,
					),
					"error",
				);
				setErrorRef.current(
					operatorWorkflowFailureMessage(
						"Не удалось загрузить данные клиники",
						loadError,
					),
				);
			});
		},
		[
			resolvedAdminSecretUnlockDomain,
			forgetAdminSecret,
			clearAdminSecretDraft,
			setDashboard,
		],
	);

	const activeWorkspaceProfile =
		dashboard?.clinicSettings?.workspaceProfiles?.find(
			(profile) => profile.mode === dashboard?.clinicSettings?.profile?.mode,
		) ?? dashboard?.clinicSettings?.workspaceProfiles?.[0];
	const settingsAdminSecretDomain: AdminSecretUnlockDomain =
		settingsTab === "telegram" ? "telegram" : "settings";

	return useMemo(
		() => ({
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
		}),
		[
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
		],
	);
}
