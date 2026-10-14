import React from "react";
import {
	AlertTriangle,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Layers,
	PackageCheck,
	ShieldCheck,
	Sparkles,
	Truck,
	UserCheck,
} from "lucide-react";
import type { DentalLabOrderData } from "../lab/DentalLabOrderModal";
import {
	CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES,
	mapTo6StageOrthopedicLifecycle,
	type Orthopedic6StageKey,
	checkFittingAppointmentCollision,
} from "../lab/dentalLabOrderEngine";

export interface DentalLabStageTrackingTimelineProps {
	readonly order: DentalLabOrderData;
	readonly onAdvanceStage?: (orderId: string, newStage: Orthopedic6StageKey, notes?: string) => Promise<void> | void;
	readonly onUpdateTrialDates?: (orderId: string, dates: { frameworkTrialDate?: string; ceramicTrialDate?: string; dueDate?: string }) => Promise<void> | void;
	readonly compact?: boolean;
}

export function getStagePartyRu(stageId: string): string {
	switch (stageId) {
		case "impression_taken":
			return "Врач-ортопед";
		case "courier_sent":
			return "Курьер ЗТЛ";
		case "framework_fitting":
			return "Примерка";
		case "ceramic_layering":
			return "Зубной техник";
		case "ready_in_clinic":
			return "В клинике";
		case "patient_fixation":
			return "Фиксация";
		default:
			return "ЗТЛ";
	}
}

export function DentalLabStageTrackingTimeline({
	order,
	onAdvanceStage,
	onUpdateTrialDates,
	compact = false,
}: DentalLabStageTrackingTimelineProps) {
	const current6Stage = mapTo6StageOrthopedicLifecycle(order.currentStage || order.status || "draft");
	const currentStepIndex = CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.findIndex((s) => s.id === current6Stage);

	const collision = checkFittingAppointmentCollision(order.dueDate ?? undefined, order.scheduledVisitDate ?? undefined);

	const handleStepClick = async (targetStage: Orthopedic6StageKey) => {
		if (!order.id || !onAdvanceStage) return;
		await onAdvanceStage(order.id, targetStage);
	};

	return (
		<div
			className="w-full bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3.5 shadow-2xs text-xs space-y-3"
			data-testid="dental-lab-stage-tracking-timeline"
		>
			{/* Верхний заголовок и дедлайн */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
						<Layers className="w-4 h-4" />
					</div>
					<div>
						<h4 className="font-bold text-xs text-[var(--ink)] m-0 leading-tight">
							Клинико-лабораторный маршрут ЗТЛ (6 этапов)
						</h4>
						<p className="text-[11px] text-[var(--muted)] m-0">
							Наряд: <strong className="font-mono text-teal-600 dark:text-teal-400">{(order as unknown as { orderNumber?: string }).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "ЗТЛ")}</strong> · Пациент: {order.patientName || "Пациент"}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{order.dueDate && (
						<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] font-mono">
							<Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
							<span>Срок сдачи: <strong>{new Date(order.dueDate).toLocaleDateString("ru-RU")}</strong></span>
						</div>
					)}
				</div>
			</div>

			{/* Баннер коллизии примерки (если дата визита раньше готовности ЗТЛ) */}
			{collision.hasCollision && (
				<div
					className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-start gap-2 text-xs text-amber-950 dark:text-amber-100"
					data-testid="timeline-fitting-collision-alert"
				>
					<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					<div className="min-w-0">
						<div className="font-bold text-xs">Коллизия в расписании визитов</div>
						<div className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
							{collision.warningRu || "Визит на примерку назначен раньше расчетной готовности работы в лаборатории."}
						</div>
					</div>
				</div>
			)}

			{/* Горизонтальный степпер 6 этапов */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
				{CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.map((step, idx) => {
					const isPassed = currentStepIndex >= idx;
					const isCurrent = currentStepIndex === idx;
					const isFuture = currentStepIndex < idx;

					return (
						<button
							key={step.id}
							type="button"
							onClick={() => handleStepClick(step.id as Orthopedic6StageKey)}
							className={`min-h-[44px] sm:min-h-[48px] p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative touch-manipulation select-none ${
								isCurrent
									? "bg-teal-500/15 border-teal-600 ring-2 ring-teal-500/30 text-teal-900 dark:text-teal-100 shadow-2xs font-bold"
									: isPassed
									? "bg-[var(--paper-soft)] border-teal-500/30 text-[var(--ink)] hover:bg-[var(--line)]"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:border-slate-400 opacity-75"
							}`}
							data-testid={`timeline-step-${step.id}`}
							data-active={isCurrent ? "true" : "false"}
						>
							<div className="flex items-center justify-between gap-1 w-full mb-1">
								<span className="text-[10px] font-mono font-bold text-[var(--muted)]">
									Этап {idx + 1}
								</span>
								{isCurrent ? (
									<span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
								) : isPassed ? (
									<Check className="w-3 h-3 text-teal-600 dark:text-teal-400" />
								) : null}
							</div>

							<div className="text-[11px] font-bold leading-snug line-clamp-2">
								{step.shortLabelRu}
							</div>

							<div className="text-[9.5px] text-[var(--muted)] mt-1 truncate">
								{getStagePartyRu(step.id)}
							</div>
						</button>
					);
				})}
			</div>

			{/* Детали текущего этапа и даты примерок (если не compact) */}
			{!compact && (
				<div className="pt-2 border-t border-[var(--line)] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
							1. Примерка каркаса
						</span>
						<div className="font-bold font-mono text-[var(--ink)]">
							{order.frameworkTrialDate
								? new Date(order.frameworkTrialDate).toLocaleDateString("ru-RU")
								: "Не назначена"}
						</div>
					</div>

					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
							2. Примерка керамики / Бисквит
						</span>
						<div className="font-bold font-mono text-[var(--ink)]">
							{order.ceramicTrialDate
								? new Date(order.ceramicTrialDate).toLocaleDateString("ru-RU")
								: "Не назначена"}
						</div>
					</div>

					<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
							3. Готовность / Фиксация
						</span>
						<div className="font-bold font-mono text-teal-600 dark:text-teal-400">
							{order.dueDate
								? new Date(order.dueDate).toLocaleDateString("ru-RU")
								: "Не установлен"}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
