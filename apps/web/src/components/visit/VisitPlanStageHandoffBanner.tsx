/**
 * apps/web/src/components/visit/VisitPlanStageHandoffBanner.tsx
 *
 * DENTE Dental CRM — Targeted Treatment Plan Stage Handoff Cockpit Strip.
 *
 * Allows clinicians to target and transfer procedures from a specific treatment
 * plan stage into the active visit bill and medical record diary (Mandates 8e, 8i, 8n).
 */

import React, { useMemo, useState, useEffect } from "react";
import {
	CheckCircle2,
	Clock,
	Layers,
	ShieldCheck,
	Tag,
} from "lucide-react";
import {
	extractAppointmentStageInfo,
	groupTreatmentPlanByStages,
	type PlanStageOption,
} from "./visitPlanStageHandoff";

export interface VisitPlanStageHandoffBannerProps {
	loadedTreatmentPlan: any;
	activeAppointment?: any | null | undefined;
	activePatient?: any | null | undefined;
	style?: React.CSSProperties;
	onTakeStage?: (stage: { title: string; stageNumber: number; items: any[] }, items: any[]) => void;
}

export function VisitPlanStageHandoffBanner({
	loadedTreatmentPlan,
	activeAppointment,
	activePatient,
	style,
	onTakeStage,
}: VisitPlanStageHandoffBannerProps) {
	// 1. Extract appointment stage targeting info
	const appointmentStageTarget = useMemo(() => {
		return extractAppointmentStageInfo(activeAppointment);
	}, [activeAppointment]);

	// 2. Group plan items by stages
	const { stages, allPlanItems, hasMultipleStages, totalPlanPriceRub } = useMemo(() => {
		return groupTreatmentPlanByStages(loadedTreatmentPlan, appointmentStageTarget);
	}, [loadedTreatmentPlan, appointmentStageTarget]);

	// 3. Selection state: which stage is currently active in the banner
	// Default to appointment's targeted stage number, or first available stage, or "all"
	const [selectedStageKey, setSelectedStageKey] = useState<number | "all">(() => {
		if (appointmentStageTarget.stageNumber && stages.some((s) => s.stageNumber === appointmentStageTarget.stageNumber)) {
			return appointmentStageTarget.stageNumber;
		}
		const firstStage = stages[0];
		if (firstStage) {
			return firstStage.stageNumber;
		}
		return "all";
	});

	// Sync when activeAppointment or stages change
	useEffect(() => {
		const firstStage = stages[0];
		if (appointmentStageTarget.stageNumber && stages.some((s) => s.stageNumber === appointmentStageTarget.stageNumber)) {
			setSelectedStageKey(appointmentStageTarget.stageNumber);
		} else if (firstStage && selectedStageKey !== "all" && !stages.some((s) => s.stageNumber === selectedStageKey)) {
			setSelectedStageKey(firstStage.stageNumber);
		}
	}, [appointmentStageTarget.stageNumber, stages, selectedStageKey]);

	// Resolve the active items and active stage title based on selection
	const activeStage = useMemo<PlanStageOption | null>(() => {
		if (selectedStageKey === "all") return null;
		return stages.find((s) => s.stageNumber === selectedStageKey) || null;
	}, [stages, selectedStageKey]);

	const selectedItems = useMemo<any[]>(() => {
		if (selectedStageKey === "all" || !activeStage) {
			return allPlanItems;
		}
		return activeStage.items;
	}, [selectedStageKey, activeStage, allPlanItems]);

	const selectedTotalRub = useMemo<number>(() => {
		if (selectedStageKey === "all" || !activeStage) {
			return totalPlanPriceRub;
		}
		return activeStage.totalPriceRub;
	}, [selectedStageKey, activeStage, totalPlanPriceRub]);

	const displayStageTitle = useMemo<string>(() => {
		if (selectedStageKey === "all") {
			return `Все этапы плана «${loadedTreatmentPlan?.name || "План лечения"}»`;
		}
		if (activeStage) {
			return `Этап ${activeStage.stageNumber}: ${activeStage.title}`;
		}
		return loadedTreatmentPlan?.name || "План лечения";
	}, [selectedStageKey, activeStage, loadedTreatmentPlan?.name]);

	const isTargetedFromAppointment = Boolean(
		appointmentStageTarget.stageNumber &&
		selectedStageKey === appointmentStageTarget.stageNumber,
	);

	if (!loadedTreatmentPlan || !Array.isArray(loadedTreatmentPlan.items) || loadedTreatmentPlan.items.length === 0) {
		return null;
	}

	const handleExecuteTakeStage = () => {
		const stagePayload = {
			title: displayStageTitle,
			stageNumber: typeof selectedStageKey === "number" ? selectedStageKey : 1,
			items: selectedItems,
		};

		if (typeof onTakeStage === "function") {
			onTakeStage(stagePayload, selectedItems);
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-take-stage-to-visit", {
					detail: {
						stage: stagePayload,
						items: selectedItems,
						patientId: activePatient?.id,
					},
				}),
			);
		}
	};

	return (
		<div
			data-testid="visit-treatment-plan-handoff-banner"
			className="my-2 p-3 rounded-xl border border-[var(--teal,#0d9488)]/40 bg-[var(--teal,#0d9488)]/5 flex flex-col gap-2.5 text-xs shadow-2xs"
			style={style}
		>
			{/* Top row: Status info + Primary action */}
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-start gap-2.5 min-w-0 flex-1">
					<div className="p-1.5 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal-dark,#0f766e)] dark:text-teal-300 shrink-0 mt-0.5">
						<ShieldCheck size={18} />
					</div>

					<div className="flex flex-col min-w-0 gap-0.5">
						<div className="flex items-center gap-2 flex-wrap">
							{isTargetedFromAppointment ? (
								<span
									data-testid="handoff-stage-targeted-title"
									className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center gap-1.5"
								>
									<span className="text-[var(--teal-dark,#0f766e)] dark:text-teal-300 font-semibold">
										Запись по этапу:
									</span>
									<span className="truncate">{displayStageTitle}</span>
								</span>
							) : (
								<span className="font-bold text-xs text-[var(--ink,#0f172a)] truncate">
									План лечения: {loadedTreatmentPlan.name}
								</span>
							)}

							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal,#0d9488)]/15 text-[var(--teal-dark,#0f766e)] dark:text-teal-300 border border-[var(--teal,#0d9488)]/30">
								{loadedTreatmentPlan.status === "Approved"
									? "Согласован"
									: loadedTreatmentPlan.status === "Active"
										? "В работе"
										: "Черновик"}
							</span>

							{appointmentStageTarget.durationMinutes && isTargetedFromAppointment && (
								<span
									data-testid="handoff-stage-duration-badge"
									className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--muted,#64748b)] border border-[var(--line,#e2e8f0)] flex items-center gap-1"
								>
									<Clock size={11} />
									<span>{appointmentStageTarget.durationMinutes} мин</span>
								</span>
							)}
						</div>

						<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)] flex-wrap">
							<span>
								{selectedItems.length} {selectedItems.length === 1 ? "услуга" : selectedItems.length < 5 ? "услуги" : "услуг"}
							</span>
							<span>•</span>
							<span className="font-semibold text-[var(--ink,#0f172a)]">
								{Number(selectedTotalRub || 0).toLocaleString("ru-RU")} ₽
							</span>
							{hasMultipleStages && selectedStageKey !== "all" && (
								<>
									<span className="text-[var(--muted,#94a3b8)]">/ из общего плана:</span>
									<span className="text-[var(--muted,#64748b)]">
										{Number(totalPlanPriceRub || 0).toLocaleString("ru-RU")} ₽
									</span>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Primary action CTA button */}
				<button
					type="button"
					data-testid="take-stage-to-visit-btn"
					onClick={handleExecuteTakeStage}
					className="h-9 min-h-[36px] md:min-h-[36px] min-w-[44px] px-4 rounded-lg text-xs font-bold text-white bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0"
					title="Перенести выбранный этап плана лечения в текущий визит и счет"
				>
					<CheckCircle2 size={15} />
					<span>
						{typeof selectedStageKey === "number"
							? `Взять Этап ${selectedStageKey} в работу визита`
							: "Взять этап в работу визита"}
					</span>
				</button>
			</div>

			{/* Stage Selector Chips (Apple HIG Segmented Bar pattern) */}
			{hasMultipleStages && (
				<div
					data-testid="handoff-stage-chips-selector"
					className="pt-1 border-t border-[var(--teal,#0d9488)]/20 flex items-center gap-1.5 flex-wrap"
				>
					<span className="text-[10px] font-semibold text-[var(--muted,#64748b)] mr-1 flex items-center gap-1">
						<Layers size={11} />
						<span>Этап визита:</span>
					</span>

					{stages.map((stg) => {
						const isSelected = selectedStageKey === stg.stageNumber;
						const isTarget = stg.isCurrentTarget;

						return (
							<button
								key={stg.stageNumber}
								type="button"
								data-testid={`handoff-stage-chip-${stg.stageNumber}`}
								onClick={() => setSelectedStageKey(stg.stageNumber)}
								className={`min-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border ${
									isSelected
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-2xs font-semibold"
										: "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)]/50"
								}`}
							>
								<span>Этап {stg.stageNumber}</span>
								{isTarget && (
									<span
										className={`text-[9px] px-1 py-0.2 rounded font-bold ${
											isSelected
												? "bg-white/20 text-white"
												: "bg-[var(--teal,#0d9488)]/15 text-[var(--teal-dark,#0f766e)] dark:text-teal-300"
										}`}
										title="Целевой этап из записи расписания"
									>
										Запись
									</span>
								)}
								<span className="opacity-75 text-[10px]">
									({stg.items.length})
								</span>
							</button>
						);
					})}

					<button
						type="button"
						data-testid="handoff-stage-chip-all"
						onClick={() => setSelectedStageKey("all")}
						className={`min-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border ${
							selectedStageKey === "all"
								? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-2xs font-semibold"
								: "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)]/50"
						}`}
					>
						<span>Все услуги</span>
						<span className="opacity-75 text-[10px]">
							({allPlanItems.length})
						</span>
					</button>
				</div>
			)}

			{/* Compact preview of procedures included in the active selection */}
			{selectedItems.length > 0 && (
				<div
					data-testid="handoff-stage-items-preview"
					className="text-[11px] text-[var(--muted,#64748b)] bg-[var(--paper,#ffffff)]/60 dark:bg-[var(--paper-soft,#1e293b)]/40 p-2 rounded-lg border border-[var(--teal,#0d9488)]/15 flex items-center gap-1.5 flex-wrap"
				>
					<span className="font-semibold text-[var(--ink,#0f172a)] shrink-0 flex items-center gap-1">
						<Tag size={11} className="text-[var(--teal,#0d9488)]" />
						<span>Включает:</span>
					</span>
					{selectedItems.slice(0, 4).map((it, idx) => {
						const tooth = it.toothNumber || it.toothCode ? ` (зуб ${it.toothNumber || it.toothCode})` : "";
						const title = it.name || it.title || it.medicalTitleRu || it.priceId || "Услуга";
						return (
							<span
								key={it.id || idx}
								className="px-1.5 py-0.5 rounded bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line-subtle,#e2e8f0)] text-[10px] text-[var(--ink,#0f172a)]"
							>
								{title}
								{tooth}
							</span>
						);
					})}
					{selectedItems.length > 4 && (
						<span className="text-[10px] text-[var(--muted,#94a3b8)]">
							+ ещё {selectedItems.length - 4}
						</span>
					)}
				</div>
			)}
		</div>
	);
}
