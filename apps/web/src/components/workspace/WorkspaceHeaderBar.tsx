/**
 * WorkspaceHeaderBar.tsx
 *
 * DENTE CRM — Interactive Workspace Header Bar, Doctor First-Run Chip & Knowledge Navigation
 *
 * Authorities:
 * - Mandate 8d: 7 Deadly Sins of UI (1 single toolbar row 32-36px, zero clutter).
 * - Mandate 8e: Doctor Autonomy (1-click workflows, non-blocking guided quest).
 * - Mandate 8l: Guided Interactive Onboarding & Game Tour Inquisitor.
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (0-click defaults, Esc dismiss).
 */

import React, { useEffect, useState } from "react";
import {
	BookOpen,
	CheckCircle2,
	GraduationCap,
	Keyboard,
} from "lucide-react";
import {
	DENTE_TOUR_STORAGE_KEY,
	type QuestProgressState,
	type QuestTrackId,
	loadQuestProgress,
} from "./ClinicalQuestTourEngine";

export interface DoctorQuestHeaderChipProps {
	readonly className?: string;
	readonly defaultTrackId?: QuestTrackId;
	readonly onStartTour?: ((trackId: QuestTrackId) => void) | undefined;
}

/**
 * Checks if the current browser session is a doctor's first uncompleted visit.
 */
export function isDoctorFirstVisit(): boolean {
	if (typeof window === "undefined" || !window.localStorage) return false;
	const legacyDismissed = window.localStorage.getItem(DENTE_TOUR_STORAGE_KEY) === "true";
	if (legacyDismissed) return false;
	const progress = loadQuestProgress();
	return !progress.isDismissedPermanently && !progress.tracksProgress.solo_doctor.completed;
}

/**
 * Triggers doctor clinical tour launch via decoupled global event.
 */
export function launchDoctorQuest(trackId: QuestTrackId = "solo_doctor"): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent("dente:start-doctor-tour", {
			detail: { trackId },
		}),
	);
}

/**
 * Triggers knowledge hub modal open via decoupled global event.
 */
export function openKnowledgeHub(tab?: string): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent("dente:open-knowledge-hub", {
			detail: tab ? { tab } : undefined,
		}),
	);
}

/**
 * Elegant 1-click chip for starting / resuming the guided doctor quest.
 * Sits directly in the clinic topbar with zero blocking modal barriers.
 */
export const DoctorQuestHeaderChip: React.FC<DoctorQuestHeaderChipProps> = React.memo(({
	className = "",
	defaultTrackId = "solo_doctor",
	onStartTour,
}) => {
	const [progress, setProgress] = useState<QuestProgressState>(() => loadQuestProgress());

	useEffect(() => {
		const handleProgressSync = () => {
			setProgress(loadQuestProgress());
		};

		window.addEventListener("dente:quest-progress-updated", handleProgressSync);
		window.addEventListener("dente:start-doctor-tour", handleProgressSync);
		window.addEventListener("storage", handleProgressSync);

		return () => {
			window.removeEventListener("dente:quest-progress-updated", handleProgressSync);
			window.removeEventListener("dente:start-doctor-tour", handleProgressSync);
			window.removeEventListener("storage", handleProgressSync);
		};
	}, []);

	const isCompleted = progress.tracksProgress.solo_doctor?.completed;
	const currentStepNum = progress.currentStepIndex + 1;
	const totalSteps = 4; // Solo doctor track steps

	const handleClick = () => {
		if (onStartTour) {
			onStartTour(defaultTrackId);
		} else {
			launchDoctorQuest(defaultTrackId);
		}
	};

	return (
		<button
			id="topbar-doctor-quest-btn"
			data-testid="topbar-doctor-quest-chip"
			type="button"
			onClick={handleClick}
			className={`secondary-button topbar-quest-button inline-flex items-center gap-1.5 h-8 min-h-[32px] px-2.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${
				isCompleted
					? "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:border-teal-500/40"
					: "bg-[var(--teal-soft,rgba(13,148,136,0.14))] border-[var(--teal-surface,rgba(13,148,136,0.35))] text-[var(--teal,#0d9488)] hover:bg-[var(--teal-soft,rgba(13,148,136,0.22))] hover:border-[var(--teal,#0d9488)] font-semibold"
			} ${className}`}
			title={
				isCompleted
					? "Квест врача пройден (4/4). Кликните для повторного прохождения или смены трека"
					: `Интерактивный квест врача (3 мин) — шаг ${currentStepNum}/${totalSteps}. Нажмите для запуска (Esc — пауза)`
			}
			aria-label="Интерактивный квест врача (3 мин)"
		>
			{isCompleted ? (
				<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
			) : (
				<GraduationCap className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" aria-hidden="true" />
			)}

			<span className="hidden xl:inline text-xs font-semibold whitespace-nowrap">
				{isCompleted ? "Квест врача ✓" : "Квест врача (3 мин)"}
			</span>
			<span className="hidden md:inline xl:hidden text-xs font-semibold whitespace-nowrap">
				{isCompleted ? "Квест ✓" : "Квест (3 мин)"}
			</span>
			<span className="inline md:hidden text-xs font-semibold whitespace-nowrap">
				{isCompleted ? "Квест ✓" : "Квест"}
			</span>

			{!isCompleted && currentStepNum > 1 && (
				<span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[var(--teal,#0d9488)] text-white">
					{currentStepNum}/{totalSteps}
				</span>
			)}
		</button>
	);
});

DoctorQuestHeaderChip.displayName = "DoctorQuestHeaderChip";

export interface ClinicLearningTopButtonProps {
	readonly className?: string;
	readonly onOpen?: (() => void) | undefined;
}

/**
 * Topbar button for opening the Knowledge Base Hub modal.
 */
export const ClinicLearningTopButton: React.FC<ClinicLearningTopButtonProps> = React.memo(({
	className = "",
	onOpen,
}) => {
	const handleClick = () => {
		if (onOpen) {
			onOpen();
		} else {
			openKnowledgeHub();
		}
	};

	return (
		<button
			id="topbar-learning-hub-btn"
			data-testid="topbar-learning-hub-btn"
			type="button"
			onClick={handleClick}
			className={`secondary-button topbar-learning-button inline-flex items-center gap-1.5 h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--teal-surface,rgba(13,148,136,0.3))] bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))] font-semibold transition-all cursor-pointer shadow-2xs ${className}`}
			title="База знаний и иллюстрированные руководства DENTE (F1)"
			aria-label="База знаний и обучение (F1)"
		>
			<BookOpen className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" aria-hidden="true" />
			<span className="hidden xl:inline text-xs">Обучение</span>
			<kbd className="hidden 2xl:inline px-1 py-0.2 text-[9px] font-mono rounded bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
				F1
			</kbd>
		</button>
	);
});

ClinicLearningTopButton.displayName = "ClinicLearningTopButton";

export interface WorkspaceHeaderBarProps {
	readonly clinicName?: string;
	readonly onOpenKnowledgeHub?: () => void;
	readonly onStartTour?: (trackId: QuestTrackId) => void;
	readonly onOpenShortcuts?: () => void;
}

/**
 * Composite Workspace Header Bar providing first-run onboarding triggers and hotkey guidance.
 */
export const WorkspaceHeaderBar: React.FC<WorkspaceHeaderBarProps> = React.memo(({
	clinicName = "Клиника DENTE",
	onOpenKnowledgeHub,
	onStartTour,
	onOpenShortcuts,
}) => {
	return (
		<header
			className="workspace-header-bar flex items-center justify-between gap-3 px-3 h-11 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-sans"
			role="banner"
			data-testid="workspace-header-bar"
		>
			<div className="flex items-center gap-2 min-w-0">
				<h1 className="text-sm font-bold truncate leading-tight m-0 text-[var(--ink,#0f172a)]">
					{clinicName}
				</h1>
			</div>

			<div className="flex items-center gap-2">
				<DoctorQuestHeaderChip onStartTour={onStartTour} />
				<ClinicLearningTopButton onOpen={onOpenKnowledgeHub} />

				{onOpenShortcuts && (
					<button
						type="button"
						onClick={onOpenShortcuts}
						className="min-h-[32px] min-w-[32px] p-1.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer"
						title="Шпаргалка горячих клавиш (?)"
						aria-label="Шпаргалка горячих клавиш"
					>
						<Keyboard size={15} />
					</button>
				)}
			</div>
		</header>
	);
});

WorkspaceHeaderBar.displayName = "WorkspaceHeaderBar";
