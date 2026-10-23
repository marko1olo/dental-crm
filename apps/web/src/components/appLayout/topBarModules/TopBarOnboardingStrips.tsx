/**
 * TopBarOnboardingStrips — Компактная полоса онбординга (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { CalendarDays, ClipboardCheck, ShieldCheck, X } from "lucide-react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import { TopBarDraftStrips } from "./TopBarDraftStrips";
import type { Dispatch, SetStateAction } from "react";

export interface TopBarOnboardingStripsProps {
	onboardingDismissed: boolean;
	showFullOnboardingGuide: boolean;
	isLocalOnboardingDismissed: boolean;
	isStripDismissedLocally: boolean;
	setIsStripDismissedLocally: Dispatch<SetStateAction<boolean>>;
	currentView: string;
	currentOnboardingIndex: number;
	onboardingSteps: any[];
	legalReadinessPercent: number;
	continueOnboardingInDraftMode: (view?: string) => Promise<void> | void;
	openOnboardingGuide: () => void;
	dismissOnboarding: () => void;
	onboardingDraftMode: boolean;
	onboardingReadyToFinish: boolean;
	onboardingBlockingIssues: string[];
	onboardingDocumentsReady: boolean;
	onboardingDocumentReadinessIssues: string[];
	reopenOnboarding: () => void;
	setCurrentView: (view: string) => void;
	setSettingsTab: (tab: string) => void;
}

export function TopBarOnboardingStrips(props: TopBarOnboardingStripsProps) {
	const {
		onboardingDismissed,
		showFullOnboardingGuide,
		isLocalOnboardingDismissed,
		isStripDismissedLocally,
		setIsStripDismissedLocally,
		currentView,
		currentOnboardingIndex,
		onboardingSteps,
		legalReadinessPercent,
		continueOnboardingInDraftMode,
		openOnboardingGuide,
		dismissOnboarding,
	} = props;

	const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
	const isClinicalView = currentView === "visit" || currentView === "shift" || currentView === "schedule";
	const isStripVisible =
		!onboardingDismissed &&
		!showFullOnboardingGuide &&
		!isLocalOnboardingDismissed &&
		!isStripDismissedLocally &&
		!isDemoShowcaseMode() &&
		!isMobile &&
		!isClinicalView;

	return (
		<>
			{isStripVisible && (
				<section className="onboarding-compact-strip" aria-label="Первичная настройка клиники">
					<div>
						<strong>Можно начать прием без мастера</strong>
						<span>Реквизиты клиники можно заполнить позже.</span>
					</div>
					<span className="onboarding-compact-score">
						{Math.min(Math.max(1, currentOnboardingIndex + 1), onboardingSteps?.length || 5)}/
						{onboardingSteps?.length || 5} · готовность документов{" "}
						{Number.isFinite(legalReadinessPercent) ? Math.round(legalReadinessPercent) : 0}%
					</span>
					<button className="primary-button" type="button" onClick={() => void continueOnboardingInDraftMode("visit")}>
						<ClipboardCheck aria-hidden="true" /> Прием
					</button>
					<button className="secondary-button" type="button" onClick={() => void continueOnboardingInDraftMode("schedule")}>
						<CalendarDays aria-hidden="true" /> Расписание
					</button>
					<button className="secondary-button" type="button" onClick={() => openOnboardingGuide()}>
						<ShieldCheck aria-hidden="true" /> Настроить
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => {
							setIsStripDismissedLocally(true);
							safeLocalStorageSetItem("dente_onboarding_strip_dismissed", "true");
							dismissOnboarding();
						}}
						title="Скрыть подсказку"
						aria-label="Скрыть подсказку"
					>
						<X aria-hidden="true" /> Скрыть
					</button>
				</section>
			)}

			<TopBarDraftStrips {...props} />
		</>
	);
}
