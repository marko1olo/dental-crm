/**
 * DENTE CRM — Treatment Plan Roadmap Stage Card Component
 * (Layer 4: Presentation Subcomponent — stage procedures with 804n codes, tooth formula, cost, status & 1-click booking)
 */

import React from "react";
import {
	AlertCircle,
	CalendarPlus,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	ShieldCheck,
} from "lucide-react";
import { formatFdiToothName } from "../../portal/patientPortalEngine.js";
import type { RoadmapStageData } from "./types.js";
import {
	CANONICAL_ROADMAP_META,
	formatKopecksToRubExact,
} from "./roadmapPriceHelpers.js";

export interface RoadmapStageCardProps {
	stage: RoadmapStageData;
	isExpanded: boolean;
	onToggle: () => void;
	planId?: string | undefined;
	effectivePlanNumber?: string | undefined;
	patientId?: string | undefined;
	effectivePatientName: string;
	todayRu?: string | undefined;
	onBookStage?: ((stage: RoadmapStageData) => void) | undefined;
	onSelectStage?: ((stage: RoadmapStageData) => void) | undefined;
	onBookStageSlot?: ((stageNumber: number, stage: RoadmapStageData) => void) | undefined;
}

export const RoadmapStageCard: React.FC<RoadmapStageCardProps> = ({
	stage,
	isExpanded,
	onToggle,
	planId,
	effectivePlanNumber,
	patientId,
	effectivePatientName,
	todayRu,
	onBookStage,
	onSelectStage,
	onBookStageSlot,
}) => {
	const meta = CANONICAL_ROADMAP_META[stage.stageKind];

	return (
		<div
			className={`roadmap-stage-card ${stage.status}`}
			data-testid={`roadmap-stage-${stage.stageNumber}`}
		>
			{/* Stage Header */}
			<div className="roadmap-stage-header">
				<div className="flex items-start gap-3 flex-1 min-w-0">
					<div className={`roadmap-stage-num-badge ${stage.status}`}>
						{stage.status === "completed" ? (
							<Check className="w-4 h-4" />
						) : (
							<span>{stage.stageNumber}</span>
						)}
					</div>

					<div className="roadmap-stage-title-wrap">
						<div className="flex items-center gap-2">
							<span className="roadmap-stage-name">{stage.titleRu}</span>
						</div>
						<div className="roadmap-stage-desc">{stage.subtitleRu}</div>
					</div>
				</div>

				{/* Status Badge */}
				<div className="flex items-center gap-2">
					<div className={`roadmap-stage-status-badge ${stage.status}`}>
						{stage.status === "completed" && (
							<>
								<CheckCircle2 className="w-3.5 h-3.5" />
								<span>✓ Этап выполнен</span>
							</>
						)}
						{stage.status === "in_progress" && (
							<>
								<Clock className="w-3.5 h-3.5" />
								<span>В процессе</span>
							</>
						)}
						{stage.status === "planned" && <span>Запланировано</span>}
					</div>

					{stage.status === "completed" && (
						<span
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0"
							data-testid={`stage-paid-badge-${stage.stageNumber}`}
						>
							<Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
							<span>✓ ОПЛАЧЕНО 100%</span>
						</span>
					)}

					<button
						type="button"
						onClick={onToggle}
						className="p-1.5 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 rounded-lg hover:bg-[var(--paper-soft,#1e293b)] text-[var(--muted,var(--ink-muted))] hover:text-[var(--ink)] cursor-pointer inline-flex items-center justify-center transition-colors"
						aria-label={isExpanded ? "Свернуть" : "Развернуть"}
						data-testid={`toggle-stage-btn-${stage.stageNumber}`}
					>
						{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
					</button>
				</div>
			</div>

			{/* Stage Procedures Progress Indicator */}
			{stage.procedures.length > 0 && (
				<div
					className="roadmap-stage-progress-indicator"
					data-testid={`stage-progress-${stage.stageNumber}`}
				>
					<div className="flex items-center justify-between text-xs mb-1">
						<span className="font-medium text-[var(--muted,var(--ink-muted))]">
							Прогресс процедур:
						</span>
						<span className="font-semibold text-[var(--ink)]">
							{`Выполнено ${stage.procedures.filter((p) => p.isCompleted).length} из ${stage.procedures.length} процедур (${Math.round(
								(stage.procedures.filter((p) => p.isCompleted).length /
									stage.procedures.length) *
									100,
							)}%)`}
						</span>
					</div>
					<div className="w-full h-1.5 rounded-full bg-[var(--paper-soft,#1e293b)] overflow-hidden border border-[var(--line-subtle,rgba(255,255,255,0.05))]">
						<div
							className="h-full rounded-full bg-emerald-500 transition-all duration-300"
							style={{
								width: `${Math.round(
									(stage.procedures.filter((p) => p.isCompleted).length /
										stage.procedures.length) *
										100,
								)}%`,
							}}
						/>
					</div>
				</div>
			)}

			{/* Stage Goal Explanation */}
			<div className="text-xs font-medium text-[var(--muted,var(--ink-muted))] bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] mb-3 leading-relaxed">
				<strong className="text-[var(--ink)] font-bold">Цель этапа: </strong>
				{stage.patientGoalRu}
			</div>

			{/* Stage Clinical Highlights: Timelines, Preparation & Warranty */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3 text-xs">
				{/* 1. Timelines */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase flex items-center gap-1.5 mb-1">
						<Clock size={13} />
						<span>Сроки и длительность</span>
					</div>
					<div className="text-xs font-medium text-[var(--ink)] leading-relaxed">
						{stage.timelineRu || meta.timelineRu}
					</div>
				</div>

				{/* 2. Preparation */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5 mb-1">
						<AlertCircle size={13} />
						<span>Подготовка пациента</span>
					</div>
					<div className="text-xs font-medium text-[var(--muted,var(--ink-muted))] leading-relaxed">
						{stage.preparationRu || meta.preparationRu}
					</div>
				</div>

				{/* 3. Warranty */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5 mb-1">
						<ShieldCheck size={13} />
						<span>Гарантия клиники</span>
					</div>
					<div className="text-xs font-medium text-[var(--muted,var(--ink-muted))] leading-relaxed">
						{stage.warrantyRu || meta.warrantyRu}
					</div>
				</div>
			</div>

			{/* Teeth Involved */}
			{stage.teethFdiList.length > 0 && (
				<div className="roadmap-teeth-row">
					<span className="text-xs font-medium text-[var(--muted,var(--ink-muted))] mr-1 self-center">
						Зубы:
					</span>
					{stage.teethFdiList.map((tooth) => (
						<span
							key={tooth}
							className="roadmap-tooth-tag"
							title={formatFdiToothName(tooth)}
						>
							{tooth}
						</span>
					))}
				</div>
			)}

			{/* Expanded Procedures Table */}
			{isExpanded && (
				<div className="roadmap-procedures-table">
					{stage.procedures.length > 0 ? (
						stage.procedures.map((proc) => (
							<div key={proc.id} className="roadmap-proc-row">
								<div className="flex-1 min-w-0">
									<div className="roadmap-proc-title flex items-center flex-wrap gap-1">
										{proc.code804n && (
											<span className="roadmap-proc-code-tag">{proc.code804n}</span>
										)}
										<span>{proc.patientFriendlyTitleRu}</span>
										{proc.toothNumber && (
											<span className="text-[var(--muted,var(--ink-muted))] text-xs ml-1.5">
												(зуб {proc.toothNumber})
											</span>
										)}
										{proc.isCompleted && (
											<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1.5">
												<Check className="w-3 h-3" /> Выполнено
											</span>
										)}
									</div>
									{proc.medicalTitleRu !== proc.patientFriendlyTitleRu && (
										<div className="text-xs text-[var(--muted,var(--ink-muted))] mt-0.5">
											Мед. номенклатура: {proc.medicalTitleRu}
										</div>
									)}
								</div>

								<div className="roadmap-proc-price">
									{formatKopecksToRubExact(proc.priceKopecks * proc.quantity)} ₽
								</div>
							</div>
						))
					) : (
						<div className="text-xs text-[var(--muted,var(--ink-muted))] py-2 text-center">
							Процедуры для данного этапа будут сформированы после завершения предыдущего шага
						</div>
					)}
				</div>
			)}

			{/* Stage Footer: Cost & 1-Click Action */}
			<div className="roadmap-stage-footer">
				<div>
					<div className="roadmap-stage-total-label">Стоимость этапа</div>
					<div className="roadmap-stage-total-sum">
						{formatKopecksToRubExact(stage.totalKopecks)} ₽
					</div>
					{stage.status === "completed" && (
						<div
							className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5"
							data-testid={`stage-remaining-cost-${stage.stageNumber}`}
						>
							Остаток к оплате: 0,00 ₽
						</div>
					)}
				</div>

				{stage.status === "completed" ? (
					<div
						className="roadmap-stage-completed-badge flex items-center gap-2"
						data-testid={`stage-completed-badge-${stage.stageNumber}`}
					>
						<span
							className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs"
							data-testid={`stage-paid-footer-badge-${stage.stageNumber}`}
						>
							✓ ОПЛАЧЕНО 100%
						</span>
						<span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
							{`✓ Пройден на приеме ${todayRu || new Date().toLocaleDateString("ru-RU")}`}
						</span>
					</div>
				) : (
					<button
						type="button"
						onClick={() => {
							onBookStage?.(stage);
							onSelectStage?.(stage);
							onBookStageSlot?.(stage.stageNumber, stage);
							if (typeof window !== "undefined") {
								const estimatedMins =
									stage.procedures && stage.procedures.length > 0
										? Math.min(120, Math.max(30, stage.procedures.length * 20))
										: 30;
								window.dispatchEvent(
									new CustomEvent("dente-book-stage-appointment", {
										detail: {
											treatmentPlanId: planId || (effectivePlanNumber ? `PLAN-${effectivePlanNumber}` : undefined),
											planId: planId || (effectivePlanNumber ? `PLAN-${effectivePlanNumber}` : undefined),
											patientId: patientId || undefined,
											patientName: effectivePatientName,
											patientFullName: effectivePatientName,
											stageId: stage.stageKind || String(stage.stageNumber),
											stageNumber: stage.stageNumber,
											stageTitle: stage.titleRu,
											timelineRu: stage.timelineRu,
											services: stage.procedures,
											items: stage.procedures,
											procedures: stage.procedures,
											estimatedDurationMinutes: estimatedMins,
											durationMinutes: estimatedMins,
										},
									}),
								);
								window.location.hash = "#schedule";
							}
						}}
						className="roadmap-book-stage-btn"
						data-testid={`book-stage-btn-${stage.stageNumber}`}
					>
						<CalendarPlus className="w-4 h-4" />
						Записаться на этот этап
					</button>
				)}
			</div>
		</div>
	);
};

export default RoadmapStageCard;
