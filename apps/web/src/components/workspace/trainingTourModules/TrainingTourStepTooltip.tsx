/**
 * TrainingTourStepTooltip.tsx
 *
 * Interactive Coach Mark Card / Aside with Clinical Tips and Action Controls.
 * Mandates 8d (Zero emojis, Lucide icons), 8e (Doctor Autonomy), 8p (Non-blocking).
 */

import React from "react";
import {
	Award,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Crosshair,
	X,
	Zap,
} from "lucide-react";
import type {
	QuestProgressState,
	QuestStep,
	QuestTrack,
	QuestTrackId,
} from "./trainingTourTypes";
import { CLINICAL_QUEST_TRACKS } from "./questCatalogTracks";

export interface TrainingTourStepTooltipProps {
	readonly cardRef: React.RefObject<HTMLDivElement | null>;
	readonly cardPositionStyle: React.CSSProperties;
	readonly activeTrack: QuestTrack;
	readonly currentStep: QuestStep;
	readonly currentStepIndex: number;
	readonly progress: QuestProgressState;
	readonly progressPercentage: number;
	readonly isTrackCompleted: boolean;
	readonly nextTrack: QuestTrack | null;
	readonly onClose: () => void;
	readonly onTrackChange: (id: QuestTrackId) => void;
	readonly onResetTrack: (id: QuestTrackId) => void;
	readonly onFocusTarget: () => void;
	readonly onNeverShowAgain: () => void;
	readonly onPrev: () => void;
	readonly onSkip: () => void;
	readonly onStepAccomplished: () => void;
}

export const TrainingTourStepTooltip: React.FC<TrainingTourStepTooltipProps> = React.memo(({
	cardRef,
	cardPositionStyle,
	activeTrack,
	currentStep,
	currentStepIndex,
	progress,
	progressPercentage,
	isTrackCompleted,
	nextTrack,
	onClose,
	onTrackChange,
	onResetTrack,
	onFocusTarget,
	onNeverShowAgain,
	onPrev,
	onSkip,
	onStepAccomplished,
}) => {
	return (
		<aside
			ref={cardRef}
			style={cardPositionStyle}
			className="w-full max-w-[390px] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] shadow-2xl overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
			role="region"
			aria-label="Интерактивное обучение врача и квесты клиники"
			data-testid="doctor-training-coach-mark-card"
		>
			{/* Top Track Selector Header */}
			<div className="px-3 py-2 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-1.5">
				<div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
					{CLINICAL_QUEST_TRACKS.map((t) => {
						const isActive = t.id === progress.activeTrackId;
						const isDone = progress.tracksProgress[t.id]?.completed;
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => onTrackChange(t.id)}
								className={`px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
									isActive
										? "bg-[var(--teal,#0d9488)] text-white shadow-2xs"
										: "bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)]"
								}`}
							>
								{isDone && <CheckCircle2 size={10} className="text-emerald-400" />}
								<span>{t.shortTitle}</span>
							</button>
						);
					})}
				</div>

				<button
					type="button"
					onClick={onClose}
					className="min-h-[26px] min-w-[26px] flex items-center justify-center rounded-md text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer shrink-0"
					aria-label="Закрыть обучение"
					title="Закрыть (Esc)"
				>
					<X size={14} aria-hidden="true" />
				</button>
			</div>

			{/* Step Progress Bar */}
			<div className="w-full bg-[var(--line,#e2e8f0)] h-1">
				<div
					className="bg-[var(--teal,#0d9488)] h-1 transition-all duration-300"
					style={{ width: `${progressPercentage}%` }}
				/>
			</div>

			{isTrackCompleted ? (
				<div className="px-3.5 py-3 space-y-2.5 text-xs">
					<div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
						<CheckCircle2 size={18} className="shrink-0" />
						<h3 className="text-sm font-bold m-0 text-[var(--ink,#0f172a)]">
							Квест «{activeTrack.shortTitle}» пройден!
						</h3>
					</div>
					<p className="text-[11px] text-[var(--muted,#64748b)] m-0 leading-relaxed">
						Все {activeTrack.steps.length} ключевых шага направления успешно выполнены.
					</p>
					<div className="p-2 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex items-center gap-1.5 flex-wrap">
						{CLINICAL_QUEST_TRACKS.map((t) => (
							<span
								key={t.id}
								className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 ${
									progress.tracksProgress[t.id]?.completed
										? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
										: "bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"
								}`}
							>
								{progress.tracksProgress[t.id]?.completed && <CheckCircle2 size={9} />}
								<span>{t.shortTitle}</span>
							</span>
						))}
					</div>
					<div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={() => onResetTrack(activeTrack.id)}
							className="h-7 px-2 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-medium cursor-pointer shadow-2xs"
						>
							Пройти заново
						</button>
						{nextTrack ? (
							<button
								type="button"
								onClick={() => onTrackChange(nextTrack.id)}
								className="h-7 px-2.5 rounded-md bg-[var(--teal,#0d9488)] text-white text-xs font-semibold inline-flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs"
								data-testid="coach-mark-next-track-btn"
							>
								<span>К треку: {nextTrack.shortTitle}</span>
								<ChevronRight size={13} aria-hidden="true" />
							</button>
						) : (
							<button
								type="button"
								onClick={onClose}
								className="h-7 px-2.5 rounded-md bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shadow-2xs"
								data-testid="coach-mark-complete-all-btn"
							>
								<span>Завершить обучение</span>
							</button>
						)}
					</div>
				</div>
			) : (
				<>
					{/* Step Header */}
					<div className="px-3.5 pt-3 pb-1 flex items-center justify-between gap-2">
						<div className="flex items-center gap-1.5">
							<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">
								Шаг {currentStep.stepNumber} из {activeTrack.steps.length}
							</span>
							<span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--paper-subtle,#e2e8f0)] text-[var(--muted,#64748b)]">
								{currentStep.badge}
							</span>
						</div>

						{currentStep.rewardBadge && (
							<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
								<Award size={10} />
								<span>{currentStep.rewardBadge}</span>
							</span>
						)}
					</div>

					{/* Step Body */}
					<div className="px-3.5 py-2 space-y-2.5 text-xs">
						<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
							{currentStep.title}
						</h3>

						<p className="text-[11px] text-[var(--ink-2,var(--ink,#0f172a))] leading-relaxed m-0">
							{currentStep.description}
						</p>

						{/* Clinical Tip Box */}
						<div className="p-2 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.06))] border border-[var(--teal-surface,rgba(13,148,136,0.2))] flex items-start gap-2">
							<Zap size={13} className="text-[var(--teal,#0d9488)] shrink-0 mt-0.5" aria-hidden="true" />
							<p className="text-[10px] text-[var(--muted,#64748b)] leading-normal m-0">
								{currentStep.clinicalTip}
							</p>
						</div>

						{/* Action Guidance & Target Pointer */}
						<div className="flex items-center justify-between gap-2 text-[10px] text-[var(--muted,#64748b)] pt-0.5">
							<span className="font-medium truncate">{currentStep.shortcutBadge}</span>
							<button
								type="button"
								onClick={onFocusTarget}
								className="text-[var(--teal,#0d9488)] hover:underline font-semibold shrink-0 cursor-pointer inline-flex items-center gap-1"
								title="Показать элемент на экране"
							>
								<Crosshair size={11} />
								<span>{currentStep.actionLabel}</span>
							</button>
						</div>
					</div>

					{/* Step Navigation & Action Footer */}
					<div className="px-3.5 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2">
						<button
							type="button"
							onClick={onNeverShowAgain}
							className="text-[10px] text-[var(--muted,#64748b)] hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
							title="Запомнить выбор навсегда и больше не показывать обучение"
							data-testid="coach-mark-never-show-btn"
						>
							Больше не показывать
						</button>

						<div className="flex items-center gap-1.5 flex-shrink-0">
							{currentStepIndex > 0 && (
								<button
									type="button"
									onClick={onPrev}
									className="h-7 px-2 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-semibold inline-flex items-center gap-0.5 hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
									aria-label="Предыдущий шаг"
								>
									<ChevronLeft size={13} aria-hidden="true" />
									<span>Назад</span>
								</button>
							)}

							<button
								type="button"
								onClick={onSkip}
								className="h-7 px-2 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-medium inline-flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
								title="Пропустить текущий шаг без выполнения действия"
							>
								<span>Пропустить</span>
							</button>

							{currentStepIndex < activeTrack.steps.length - 1 ? (
								<button
									type="button"
									onClick={onStepAccomplished}
									className="h-7 px-2.5 rounded-md bg-[var(--teal,#0d9488)] text-white text-xs font-semibold inline-flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
									aria-label="Следующий шаг"
									data-testid="coach-mark-next-btn"
								>
									<span>Далее</span>
									<ChevronRight size={13} aria-hidden="true" />
								</button>
							) : (
								<button
									type="button"
									onClick={onStepAccomplished}
									className="h-7 px-2.5 rounded-md bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shadow-2xs"
									aria-label="Завершить квест"
									data-testid="coach-mark-finish-btn"
								>
									<CheckCircle2 size={13} aria-hidden="true" />
									<span>Квест завершён!</span>
								</button>
							)}
						</div>
					</div>
				</>
			)}
		</aside>
	);
});

TrainingTourStepTooltip.displayName = "TrainingTourStepTooltip";
