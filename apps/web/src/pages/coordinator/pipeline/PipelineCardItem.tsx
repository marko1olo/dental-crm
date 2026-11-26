import {
	AlertTriangle,
	Calendar,
	CalendarPlus,
	CheckCircle2,
	Clock,
	ExternalLink,
	Eye,
	Link2,
	Phone,
	PhoneCall,
	Tablet,
} from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import type { PipelineCard, PipelineStage, PipelineViewMode } from "./types";
import { formatRub, STAGE_CONFIG } from "./types";

export interface PipelineCardItemProps {
	card: PipelineCard;
	stageKey: PipelineStage;
	viewMode?: PipelineViewMode;
	copiedToken: string | null;
	isGeneratingLink: string | null;
	onCopyOrGenerateLink: (card: PipelineCard) => void;
	onOpenPlan?: ((card: PipelineCard) => void) | undefined;
	onTransitionStage?: ((card: PipelineCard, targetStage: PipelineStage) => Promise<void>) | undefined;
	onCreateRecallTask?: ((card: PipelineCard) => Promise<void>) | undefined;
}

function getInitials(name: string | null | undefined): string {
	if (!name || typeof name !== "string") return "П";
	const parts = name.trim().split(/\s+/);
	const first = parts[0];
	const second = parts[1];
	if (first && second && first[0] && second[0]) {
		return (first[0] + second[0]).toUpperCase();
	}
	if (first) {
		return first.slice(0, 2).toUpperCase();
	}
	return "П";
}

export const PipelineCardItem: React.FC<PipelineCardItemProps> = ({
	card,
	stageKey,
	viewMode = "horizontal",
	copiedToken,
	isGeneratingLink,
	onCopyOrGenerateLink,
	onOpenPlan,
	onTransitionStage,
	onCreateRecallTask,
}) => {
	const [isMovingStage, setIsMovingStage] = useState(false);
	const [isCreatingRecall, setIsCreatingRecall] = useState(false);
	const [recallCreated, setRecallCreated] = useState(false);

	const isApproved =
		card.budgetStatus === "accepted" || card.status === "Approved";
	const isHorizontal = viewMode === "horizontal";
	const patientName = card.patientName || "Без имени";
	const doctorName = card.doctorName || "Врач не назначен";
	const planTitle = card.title || card.name || "План лечения";
	const daysInactive = Number.isFinite(card.daysSinceLastActivity)
		? Math.max(0, card.daysSinceLastActivity)
		: 0;

	const handleStageSelect = async (newStage: PipelineStage) => {
		if (newStage === stageKey || !onTransitionStage) return;
		try {
			setIsMovingStage(true);
			await onTransitionStage(card, newStage);
		} finally {
			setIsMovingStage(false);
		}
	};

	const handleRecallClick = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!onCreateRecallTask || isCreatingRecall || recallCreated) return;
		try {
			setIsCreatingRecall(true);
			await onCreateRecallTask(card);
			setRecallCreated(true);
		} finally {
			setIsCreatingRecall(false);
		}
	};

	return (
		<div
			role="button"
			tabIndex={0}
			draggable={true}
			onDragStart={(e) => {
				e.dataTransfer.setData(
					"text/plain",
					JSON.stringify({ planId: card.id, currentStage: stageKey }),
				);
			}}
			onClick={() => onOpenPlan?.(card)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onOpenPlan?.(card);
				}
			}}
			className={`p-3.5 sm:p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong)] hover:shadow-md transition space-y-3 text-xs w-full max-w-full overflow-hidden cursor-pointer ${
				isMovingStage ? "opacity-60 pointer-events-none" : ""
			}`}
		>
			{/* Top Row: Patient Info, Phone, and Total Amount */}
			<div className="flex items-start justify-between gap-2.5 sm:gap-3">
				<div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
					<div className="w-8 h-8 rounded-full bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold text-xs shrink-0 select-none mt-0.5 sm:mt-0">
						{getInitials(patientName)}
					</div>
					<div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-2.5 gap-y-0.5 min-w-0 flex-1">
						<span className="font-semibold text-sm sm:text-base text-[var(--text)] leading-snug break-words">
							{patientName}
						</span>
						{card.patientPhone && (
							<a
								href={`tel:${card.patientPhone}`}
								onClick={(e) => e.stopPropagation()}
								className="min-h-[32px] sm:min-h-0 py-1 sm:py-0 text-xs text-[var(--muted)] hover:text-[var(--teal,#0d9488)] transition inline-flex items-center gap-1 whitespace-nowrap shrink-0 touch-manipulation"
								title="Позвонить пациенту"
							>
								<Phone className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
								<span>{card.patientPhone}</span>
							</a>
						)}
					</div>
				</div>

				<div className="text-right shrink-0 pl-1">
					<span className="font-bold font-mono text-sm sm:text-base text-[var(--teal,#0d9488)] block whitespace-nowrap">
						{formatRub(card.netTotalRub || 0)}
					</span>
					{Boolean(card.discountRub) && (
						<span className="text-[11px] text-[var(--success-ink)] font-mono tabular-nums block whitespace-nowrap">
							-{formatRub(card.discountRub)}
						</span>
					)}
				</div>
			</div>

			{/* Middle Row: Plan title, Doctor, Visit badge, and Status Pills */}
			<div
				className={`flex gap-3 pt-2 border-t border-[var(--line-subtle)] ${
					isHorizontal
						? "flex-col lg:flex-row lg:items-center lg:justify-between"
						: "flex-col"
				}`}
			>
				{/* Metadata & Status Pills */}
				<div className="flex flex-wrap items-center gap-2 min-w-0 text-xs">
					<span className="font-medium text-[var(--text)]">
						{planTitle}
					</span>
					<span className="text-[var(--line-strong)]">•</span>
					<span className="text-[var(--muted)]">
						Врач:{" "}
						<strong className="font-medium text-[var(--text)]">
							{doctorName}
						</strong>
					</span>

					{/* Status & Visit Badges */}
					{card.hasFutureAppointment && card.nextAppointmentDate && (
						<span className="h-6 px-2 rounded-full bg-[var(--success-soft)] border border-[var(--success-line)] text-[var(--success-ink)] text-xs font-medium inline-flex items-center gap-1 shrink-0">
							<Calendar className="w-3.5 h-3.5 shrink-0" />
							<span>
								Запись:{" "}
								{new Date(card.nextAppointmentDate).toLocaleDateString("ru-RU")}
							</span>
						</span>
					)}

					{isApproved && (
						<span className="h-6 px-2 rounded-full bg-[var(--success-soft)] border border-[var(--success-line)] text-[var(--success-ink)] text-xs font-medium inline-flex items-center gap-1 shrink-0">
							<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
							<span>Одобрено пациентом</span>
						</span>
					)}

					{card.budgetStatus === "viewed" && !isApproved && (
						<span className="h-6 px-2 rounded-full bg-[var(--primary-soft)] border border-[var(--line)] text-[var(--primary)] text-xs font-medium inline-flex items-center gap-1 shrink-0">
							<Eye className="w-3.5 h-3.5 shrink-0" />
							<span>Открыта пациентом</span>
						</span>
					)}

					{stageKey === "no_appointment" && (
						<span className="h-6 px-2 rounded-full bg-[var(--primary-soft)] border border-[var(--line)] text-[var(--primary)] text-xs font-medium inline-flex items-center gap-1 shrink-0">
							<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
							<span>Без записи</span>
						</span>
					)}

					{stageKey === "in_progress_abandoned" && (
						<span className="h-6 px-2 rounded-full bg-[var(--danger-soft)] border border-[var(--danger-line)] text-[var(--danger-ink)] text-xs font-medium inline-flex items-center gap-1 shrink-0">
							<Clock className="w-3.5 h-3.5 shrink-0" />
							<span>Пауза {daysInactive} дн.</span>
						</span>
					)}

					{/* Анти-отвал: Предупреждение и кнопка реколла */}
					{card.isDropoutRisk && (
						<span className="h-6 px-2 rounded-full bg-[var(--warning-soft)] border border-[var(--warning-line)] text-[var(--warning-ink)] text-xs font-medium inline-flex items-center gap-1 shrink-0">
							<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
							<span>Риск отвала ({daysInactive} дн.)</span>
						</span>
					)}
				</div>

				{/* Action Buttons */}
				<div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2 shrink-0 pt-1 lg:pt-0 w-full sm:w-auto">
					{/* Drop-out recall task generator */}
					{card.isDropoutRisk && onCreateRecallTask && (
						<button
							type="button"
							onClick={handleRecallClick}
							className={`min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg border text-sm font-medium transition inline-flex items-center justify-center gap-1.5 touch-manipulation whitespace-nowrap cursor-pointer ${
								recallCreated
									? "bg-[var(--success-soft)] border-[var(--success-line)] text-[var(--success-ink)]"
									: "bg-[var(--warning-soft)] border-[var(--warning-line)] text-[var(--warning-ink)]"
							}`}
							title="Создать контрольный звонок куратора для предотвращения отвала"
						>
							<PhoneCall className="w-4 h-4 shrink-0" />
							<span>{recallCreated ? "Звонок назначен" : isCreatingRecall ? "Создание..." : "Звонок куратора"}</span>
						</button>
					)}

					{/* Stage Transition Dropdown */}
					{onTransitionStage && (
						<select
							value={stageKey}
							onClick={(e) => e.stopPropagation()}
							onChange={(e) => handleStageSelect(e.target.value as PipelineStage)}
							className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 text-sm rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium outline-none focus:border-[var(--primary)] transition cursor-pointer"
							title="Переместить план на другой этап"
						>
							<option value="requires_budget">1. Требуется смета</option>
							<option value="awaiting_decision">2. Ожидает решения</option>
							<option value="no_appointment">3. Без записи</option>
							<option value="in_progress_abandoned">4. Брошенные (&gt;30д)</option>
							<option value="completed">5. Завершенные</option>
						</select>
					)}

					<button
						type="button"
						data-testid="pipeline-card-open-plan-btn"
						onClick={(e) => {
							e.stopPropagation();
							if (typeof window !== "undefined") {
								window.dispatchEvent(
									new CustomEvent("dente-open-treatment-plan-presenter", {
										detail: {
											patientId: card.patientId,
											planId: card.id,
										},
									}),
								);
							}
							onOpenPlan?.(card);
						}}
						className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 rounded-xl sm:rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium transition inline-flex items-center justify-center gap-2 shadow-sm touch-manipulation whitespace-nowrap cursor-pointer"
						title="Открыть студию презентации плана лечения и сметы"
					>
						<Tablet className="w-4 h-4 shrink-0" />
						<span>Презентация</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							usePatientStore.getState().setSelectedPatientId(card.patientId);
							useAppStore.getState().setCurrentView("schedule");
						}}
						className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] text-sm font-medium text-[var(--ink)] transition inline-flex items-center justify-center gap-1.5 touch-manipulation whitespace-nowrap cursor-pointer"
					>
						<CalendarPlus className="w-4 h-4 shrink-0" />
						<span>Записать</span>
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (isGeneratingLink === card.id) return;
							onCopyOrGenerateLink(card);
						}}
						className={`min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg border text-sm font-medium transition inline-flex items-center justify-center gap-1.5 touch-manipulation whitespace-nowrap cursor-pointer ${
							copiedToken === card.id
								? "bg-[var(--success-soft)] border-[var(--success-line)] text-[var(--success-ink)]"
								: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)]"
						}`}
						title="Скопировать ссылку для согласования сметы"
					>
						{copiedToken === card.id ? (
							<>
								<CheckCircle2 className="w-4 h-4 shrink-0" />
								<span>Скопировано</span>
							</>
						) : isGeneratingLink === card.id ? (
							<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
						) : (
							<>
								<Link2 className="w-4 h-4 shrink-0" />
								<span>Ссылка</span>
							</>
						)}
					</button>

					{card.budgetToken && (
						<a
							href={`/public/budget/${card.budgetToken}`}
							onClick={(e) => e.stopPropagation()}
							target="_blank"
							rel="noopener noreferrer"
							className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition flex items-center justify-center shadow-sm touch-manipulation shrink-0"
							style={{ borderRadius: "10px" }}
							title="Открыть публичную смету в новой вкладке"
						>
							<ExternalLink className="w-3.5 h-3.5 shrink-0" />
						</a>
					)}
				</div>
			</div>
		</div>
	);
};
