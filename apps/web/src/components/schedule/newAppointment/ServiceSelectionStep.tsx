import { Check, Clock, Sparkles, Stethoscope, Zap } from "lucide-react";
import React from "react";
import { QUICK_APPOINTMENT_REASON_PRESETS } from "./constants";
import type { QuickAppointmentReasonPreset, TextFieldChangeEvent } from "./types";

export interface ServiceSelectionStepProps {
	// biome-ignore lint/suspicious/noExplicitAny: draft payload
	newAppointmentDraft: Record<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: draft updater
	updateNewAppointmentDraft: (key: any, value: any) => void;
	handleApplyReasonPreset: (preset: QuickAppointmentReasonPreset) => void;
}

export function ServiceSelectionStep(props: ServiceSelectionStepProps) {
	const {
		newAppointmentDraft,
		updateNewAppointmentDraft,
		handleApplyReasonPreset,
	} = props;

	return (
		<>
			{/* Экспресс-поводы визита (повод и длительность приёма) */}
			<div className="form-span-2 mb-3 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)]" data-testid="appointment-quick-reasons-panel">
				<div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
					<span className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5">
						<Stethoscope size={14} className="text-[var(--teal)] shrink-0" />
						<span>Экспресс-поводы визита (повод + длительность):</span>
					</span>
				</div>
				<div className="flex flex-wrap gap-1.5" data-testid="appointment-quick-reasons">
					{QUICK_APPOINTMENT_REASON_PRESETS.map((preset) => {
						const IconComponent =
							preset.iconName === "Stethoscope"
								? Stethoscope
								: preset.id === "emergency" || preset.iconName === "AlertTriangle"
								? Zap
								: preset.iconName === "Clock"
								? Clock
								: preset.iconName === "Check"
								? Check
								: Sparkles;
						const isSelected = newAppointmentDraft.reason === preset.reason;
						return (
							<button
								key={preset.id}
								type="button"
								data-testid={preset.testId}
								onClick={() => handleApplyReasonPreset(preset)}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
									isSelected
										? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
										: preset.tone === "emergency"
										? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-500/20"
										: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--paper)]"
								}`}
								title={`${preset.label} — установит причину «${preset.reason}» и длительность ${preset.durationMinutes} мин`}
							>
								<IconComponent size={13} className="shrink-0" />
								<span>{preset.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			<label className="form-span-2">
				Причина приема
				<input
					value={String(newAppointmentDraft.reason || "")}
					onChange={(event: TextFieldChangeEvent) =>
						updateNewAppointmentDraft("reason", event.target.value)
					}
				/>
				<div className="flex flex-wrap gap-1.5 mt-1.5">
					{[
						"Первичный",
						"Пульпит",
						"Кариес",
						"Осмотр",
						"Пломба",
						"Гигиена",
						"Коронка",
					].map((chip) => (
						<button
							key={chip}
							type="button"
							onClick={() => {
								const currentVal = String(
									newAppointmentDraft.reason || "",
								).trim();
								const newVal = currentVal
									? `${currentVal}, ${chip.toLowerCase()}`
									: chip;
								updateNewAppointmentDraft("reason", newVal);
							}}
							className="quick-chip quick-chip--sm"
						>
							+ {chip}
						</button>
					))}
				</div>
			</label>
		</>
	);
}
