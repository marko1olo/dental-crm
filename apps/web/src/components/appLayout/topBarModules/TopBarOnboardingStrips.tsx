/**
 * TopBarOnboardingStrips — Компактная полоса онбординга (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { CalendarDays, ClipboardCheck, ShieldCheck, X } from "lucide-react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import { TopBarDraftStrips } from "./TopBarDraftStrips";
import type { Dispatch, SetStateAction } from "react";
import type { OnboardingStepItem } from "../../onboarding/wizard/types";
import type { AppView } from "../../../utils/routeUtils";

export interface TopBarOnboardingStripsProps {
	onboardingDismissed: boolean;
	showFullOnboardingGuide: boolean;
	isLocalOnboardingDismissed: boolean;
	isStripDismissedLocally: boolean;
	setIsStripDismissedLocally: Dispatch<SetStateAction<boolean>>;
	currentView: AppView;
	currentOnboardingIndex: number;
	onboardingSteps: readonly OnboardingStepItem[];
	legalReadinessPercent: number;
	continueOnboardingInDraftMode: (view?: string) => Promise<void> | void;
	openOnboardingGuide: () => void;
	dismissOnboarding: () => void;
	onboardingDraftMode: boolean;
	onboardingReadyToFinish: boolean;
	onboardingBlockingIssues: readonly string[];
	onboardingDocumentsReady: boolean;
	onboardingDocumentReadinessIssues: readonly string[];
	reopenOnboarding: () => void;
	setCurrentView: (view: AppView) => void;
	setSettingsTab: (tab: string) => void;
}

export function TopBarOnboardingStrips(props: Partial<TopBarOnboardingStripsProps>) {
	const {
		onboardingDismissed = false,
		showFullOnboardingGuide = false,
		isLocalOnboardingDismissed = false,
		isStripDismissedLocally = false,
		setIsStripDismissedLocally = () => {},
		currentView,
		currentOnboardingIndex = 0,
		onboardingSteps = [],
		legalReadinessPercent = 0,
		continueOnboardingInDraftMode = () => {},
		openOnboardingGuide = () => {},
		dismissOnboarding = () => {},
	} = props;

	const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
	const isShiftHome = currentView === "shift";
	const isStripVisible =
		!onboardingDismissed &&
		!showFullOnboardingGuide &&
		!isLocalOnboardingDismissed &&
		!isStripDismissedLocally &&
		!isDemoShowcaseMode() &&
		!isMobile &&
		isShiftHome;

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
					<button className="secondary-button" type="button" onClick={() => void continueOnboardingInDraftMode("visit")}>
						<ClipboardCheck className="w-4 h-4 shrink-0" aria-hidden="true" /> Прием
					</button>
					<button className="secondary-button" type="button" onClick={() => void continueOnboardingInDraftMode("schedule")}>
						<CalendarDays className="w-4 h-4 shrink-0" aria-hidden="true" /> Расписание
					</button>
					<button className="secondary-button" type="button" onClick={() => openOnboardingGuide()}>
						<ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" /> Настроить
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
						<X className="w-4 h-4 shrink-0" aria-hidden="true" /> Скрыть
					</button>
				</section>
			)}

			<TopBarDraftStrips {...props} />
		</>
	);
}
