import React from "react";
import { Calendar, Check, Sparkles } from "lucide-react";
import {
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	LAB_ORDER_STAGES,
	calculateWorkingDaysRemaining,
	mapTo5StageLabStatus,
	type LabOrderStageKey,
} from "./labMath";

export interface DentalLabStagesTabProps {
	dueDate: string;
	setDueDate: (date: string) => void;
	frameworkTrialDate: string;
	setFrameworkTrialDate: (date: string) => void;
	ceramicTrialDate: string;
	setCeramicTrialDate: (date: string) => void;
	currentStage: LabOrderStageKey;
	setCurrentStage: (stage: LabOrderStageKey) => void;
}

export function DentalLabStagesTab({
	dueDate,
	setDueDate,
	frameworkTrialDate,
	setFrameworkTrialDate,
	ceramicTrialDate,
	setCeramicTrialDate,
	currentStage,
	setCurrentStage,
}: DentalLabStagesTabProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
					Жизненный цикл, трекинг ЗТЛ и даты примерок
				</h3>
				<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
					Пошаговый трекер технологических этапов от передачи оттисков до фиксации в полости рта.
				</p>
			</div>

			{/* Fitting Trial Dates Box (Eliminate <= 11px micro-fonts) */}
			<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<Calendar className="w-4 h-4 text-[var(--teal)]" />
						<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
							Даты клинических примерок и дедлайн сдачи работы
						</span>
					</div>
					{(() => {
						const rem = calculateWorkingDaysRemaining(dueDate);
						if (!rem) return null;
						return (
							<span
								className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${rem.badgeClass}`}
								data-testid="lab-order-due-deadline-badge"
							>
								{rem.labelRu}
							</span>
						);
					})()}
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div className="space-y-1.5">
						<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
							1. Примерка каркаса (Framework)
						</label>
						<input
							type="date"
							value={frameworkTrialDate}
							onChange={(e) => setFrameworkTrialDate(e.target.value)}
							className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--teal)]"
						/>
					</div>
					<div className="space-y-1.5">
						<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
							2. Примерка керамики / Бисквит
						</label>
						<input
							type="date"
							value={ceramicTrialDate}
							onChange={(e) => setCeramicTrialDate(e.target.value)}
							className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--teal)]"
						/>
					</div>
					<div className="space-y-1.5">
						<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
							3. Срок сдачи (Дедлайн ЗТЛ)
						</label>
						<input
							type="date"
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
							className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[var(--teal)]"
						/>
					</div>
				</div>
			</div>

			{/* Canonical 5-Stage Clinical Pipeline Tracker (Mandates 8e, 8s, 8k / ГОСТ Р 51087-97) */}
			<div
				className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3"
				data-testid="lab-order-5stage-pipeline-tracker"
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Sparkles className="w-4 h-4 text-[var(--teal)]" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
							Канонический 5-этапный клинический трекер (ГОСТ Р 51087-97)
						</span>
					</div>
					<span className="text-xs text-slate-500 font-medium">1 клик для переключения</span>
				</div>

				<div className="grid grid-cols-5 gap-2">
					{CANONICAL_5_CLINICAL_LAB_STATUSES.map((item) => {
						const mappedCurrent = mapTo5StageLabStatus(currentStage);
						const isCurrent = mappedCurrent === item.id;
						const currentStep = CANONICAL_5_CLINICAL_LAB_STATUSES.find((s) => s.id === mappedCurrent)?.step ?? 1;
						const isPassed = currentStep >= item.step;

						return (
							<button
								key={item.id}
								type="button"
								onClick={() => {
									if (item.id === "sent") setCurrentStage("sent_to_lab");
									else if (item.id === "in_progress") setCurrentStage("in_progress");
									else if (item.id === "fitting") setCurrentStage("fitting_scheduled");
									else if (item.id === "ready") setCurrentStage("delivered_to_clinic");
									else if (item.id === "completed") setCurrentStage("completed");
								}}
								className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer min-h-[44px] ${
									isCurrent
										? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-md ring-2 ring-[var(--teal)]/40"
										: isPassed
										? "bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 font-semibold"
										: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400"
								}`}
								data-testid={`lab-order-5stage-btn-${item.id}`}
								title={item.descRu}
							>
								<div className="text-[10px] uppercase font-bold tracking-wider opacity-85">
									Этап {item.step}
								</div>
								<div className="text-xs font-bold truncate mt-0.5">{item.shortLabelRu}</div>
								<div className="text-[10px] mt-0.5 opacity-80">
									{isCurrent ? "Текущий" : isPassed ? "Пройден" : "Ожидание"}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			<div className="space-y-3">
				{LAB_ORDER_STAGES.map((stage, idx) => {
					const isCurrent = currentStage === stage.id;
					const isPassed = LAB_ORDER_STAGES.findIndex((s) => s.id === currentStage) > idx;

					return (
						<div
							key={stage.id}
							onClick={() => setCurrentStage(stage.id)}
							className={`min-h-[52px] p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
								isCurrent
									? `${stage.color} ring-2 ring-[var(--teal-soft)] shadow-md font-bold`
									: isPassed
									? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-85"
									: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-50 hover:opacity-100"
							}`}
						>
							<div className="flex items-center gap-3">
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
										isPassed || isCurrent
											? "bg-[var(--teal)] text-white"
											: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
									}`}
								>
									{isPassed ? <Check className="w-4 h-4" /> : stage.step}
								</div>
								<div>
									<div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
										{stage.name}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400">
										{stage.desc}
									</div>
								</div>
							</div>

							{isCurrent && (
								<span className="px-3 py-1 text-xs font-bold rounded-lg bg-[var(--teal)] text-white shadow-sm flex-shrink-0">
									Текущий этап
								</span>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
