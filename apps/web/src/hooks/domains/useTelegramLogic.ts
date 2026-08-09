import { useEffect, useMemo, useRef } from "react";
import { type DenteTelegramChatLinkPublic } from "@dental/shared";
import { useTelegramModule } from "./useTelegramModule";
import { isTelegramOutboxItemDueForUi } from "../../AppHelpers";

export interface TelegramLogicProps {
	settingsAdminSecretSession: any;
	loadDashboard: any;
	setError: any;
	dashboard: any;
	currentView: any;
	settingsTab: any;
	onboardingDismissed: any;
	onboardingStep: any;
	activePatient: any;
	activeDoctor: any;
	activeAppointment: any;
	uiPreferencesHydrated: any;
	setCurrentView: any;
	setSelectedDocumentKind: any;
	telegramOutbox: any;
	telegramOutboxStatusFilter: any;
	telegramOutboxTemplateFilter: any;
	telegramLinkStaffId: any;
	setTelegramLinkStaffId: any;
	telegramLinkSubjectType: any;
	telegramModeDraft: any;
	telegramBotConfigId: any;
	telegramLinkCode: any;
	telegramLinkActionState: any;
	setTelegramLinkCode: any;
	setTelegramLinkActionState: any;
}

export function useTelegramLogic(props: TelegramLogicProps) {
	const {
		settingsAdminSecretSession,
		loadDashboard,
		setError,
		dashboard,
		currentView,
		settingsTab,
		onboardingDismissed,
		onboardingStep,
		activePatient,
		activeDoctor,
		activeAppointment,
		uiPreferencesHydrated,
		setCurrentView,
		setSelectedDocumentKind,
		telegramOutbox,
		telegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
		telegramLinkStaffId,
		setTelegramLinkStaffId,
		telegramLinkSubjectType,
		telegramModeDraft,
		telegramBotConfigId,
		telegramLinkCode,
		telegramLinkActionState,
		setTelegramLinkCode,
		setTelegramLinkActionState,
	} = props;

	const telegram = useTelegramModule({
		settingsAdminSecretSession,
		loadDashboard,
		setError,
		dashboard,
		currentView,
		settingsTab,
		onboardingDismissed,
		onboardingStep,
		activePatient,
		activeDoctor,
		activeAppointment,
		uiPreferencesHydrated,
		setCurrentView,
		setSelectedDocumentKind,
	});
	const { telegramSettingsModule } = telegram;
	const { saveTelegramSettings } = telegramSettingsModule;

	const telegramLinkStaffOptions = useMemo(
		() =>
			(dashboard?.clinicSettings?.staff || []).filter(
				(member: any) => member.active,
			) ?? [],
		[dashboard],
	);

	const filteredTelegramOutboxItems = useMemo(() => {
		const items = telegramOutbox?.items ?? [];
		return items.filter((item: any) => {
			if (telegramOutboxStatusFilter === "due") {
				if (
					item.deliveryStatus !== "ready" ||
					!isTelegramOutboxItemDueForUi(item)
				)
					return false;
			} else if (
				telegramOutboxStatusFilter !== "all" &&
				item.deliveryStatus !== telegramOutboxStatusFilter
			) {
				return false;
			}
			if (
				telegramOutboxTemplateFilter !== "all" &&
				item.templateKind !== telegramOutboxTemplateFilter
			)
				return false;
			return true;
		});
	}, [
		telegramOutbox,
		telegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
	]);

	const visibleTelegramOutboxItems = filteredTelegramOutboxItems;
	const hiddenTelegramOutboxItemCount = Math.max(
		0,
		(telegramOutbox?.filteredCount ?? filteredTelegramOutboxItems.length) -
			visibleTelegramOutboxItems.length,
	);

	useEffect(() => {
		if (!dashboard) return;
		if (
			telegramLinkStaffId &&
			telegramLinkStaffOptions.some(
				(member: any) => member.id === telegramLinkStaffId,
			)
		)
			return;
		setTelegramLinkStaffId(telegramLinkStaffOptions[0]?.id ?? "");
	}, [
		dashboard,
		telegramLinkStaffId,
		telegramLinkStaffOptions,
		setTelegramLinkStaffId,
	]);

	const telegramLinkTargetKey = `${telegramLinkSubjectType}:${telegramLinkSubjectType === "patient" ? (activePatient?.id ?? "") : telegramLinkStaffId || ""}:${telegramModeDraft}:${telegramBotConfigId.trim()}`;
	const previousTelegramLinkTargetKeyRef = useRef(telegramLinkTargetKey);

	useEffect(() => {
		if (previousTelegramLinkTargetKeyRef.current === telegramLinkTargetKey)
			return;
		previousTelegramLinkTargetKeyRef.current = telegramLinkTargetKey;
		if (!telegramLinkCode && !telegramLinkActionState) return;
		setTelegramLinkCode(null);
		setTelegramLinkActionState(null);
	}, [
		telegramLinkActionState,
		telegramLinkCode,
		telegramLinkTargetKey,
		setTelegramLinkCode,
		setTelegramLinkActionState,
	]);

	function telegramSubjectName(
		subjectType: DenteTelegramChatLinkPublic["subjectType"],
		subjectId: string,
	): string {
		if (subjectType === "patient") {
			return (
				dashboard?.patients?.find((patient: any) => patient.id === subjectId)
					?.fullName ?? "Пациент"
			);
		}
		return (
			dashboard?.clinicSettings?.staff?.find(
				(member: any) => member.id === subjectId,
			)?.fullName ?? "Сотрудник"
		);
	}

	return {
		telegram,
		telegramSettingsModule,
		saveTelegramSettings,
		telegramLinkStaffOptions,
		filteredTelegramOutboxItems,
		visibleTelegramOutboxItems,
		hiddenTelegramOutboxItemCount,
		telegramSubjectName,
	};
}
