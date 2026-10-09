import React from "react";
import {
	AlertCircle,
	Clock,
	Sparkles,
} from "lucide-react";
import {
	RESORPTION_STAGE_DEFINITIONS,
	calculateEruptionTimelineByAge,
	type EruptionTimelineAnalysis,
} from "../pediatricDentitionEngine";
import { showToast } from "../GlobalToast";
import { PEDIATRIC_AGE_PRESETS } from "./types";
import { PediatricArchVisualizer } from "./PediatricArchVisualizer";
import { PediatricTimelineTab } from "../PediatricTimelineTab";

export interface PediatricResorptionTimelineProps {
	selectedAge: number;
	onSelectAge: (age: number) => void;
	timelineAnalysis: EruptionTimelineAnalysis;
	hasFirstPermanentMolars: boolean;
	upperRow: number[];
	lowerRow: number[];
	onApplyAgeArch?: (teethNumbers: number[]) => void;
}

export const PediatricResorptionTimeline: React.FC<PediatricResorptionTimelineProps> = ({
	selectedAge,
	onSelectAge,
	timelineAnalysis,
	hasFirstPermanentMolars,
	upperRow,
	lowerRow,
	onApplyAgeArch,
}) => {
	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			{/* Age Slider & Preset Bar */}
			<div className="p-4 sm:p-6 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--teal,#0d9488)]">
							Калькулятор смены зубов
						</span>
						<h3 className="text-base sm:text-lg font-black text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100">
							Возраст ребенка:{" "}
							<span className="text-[var(--teal,#0d9488)] font-bold">
								{selectedAge.toFixed(1)} лет ({Math.round(selectedAge * 12)} мес.)
							</span>
						</h3>
					</div>

					{/* Stage Badge */}
					<div className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl bg-[var(--teal-surface,rgba(20,184,166,0.12))] text-[var(--teal,#0d9488)] border border-[var(--teal-glow,rgba(20,184,166,0.25))] text-xs sm:text-sm font-bold">
						<Clock className="w-4 h-4 shrink-0" />
						<span>{timelineAnalysis.stageNameRu}</span>
					</div>
				</div>

				{/* Clinical Age Presets Bar (3-5 years, 6-7 years, 8-10 years, 11-13 years) */}
				<div className="space-y-2">
					<div className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
						Клинические возрастные пресеты (норма в 1 клик):
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						{PEDIATRIC_AGE_PRESETS.map((preset) => {
							const isSelected =
								(preset.id === "primary" && selectedAge < 5.5) ||
								(preset.id === "early_mixed" && selectedAge >= 5.5 && selectedAge < 7.5) ||
								(preset.id === "late_mixed" && selectedAge >= 7.5 && selectedAge < 11.0) ||
								(preset.id === "permanent_12y" && selectedAge >= 11.0);
							return (
								<div
									key={preset.id}
									onClick={() => onSelectAge(preset.targetAge)}
									className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
										isSelected
											? "border-teal-600 bg-teal-500/15 dark:bg-teal-950/30 shadow-sm ring-2 ring-teal-500/20"
											: "border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-paper,var(--paper,#ffffff))] dark:bg-slate-900 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-800"
									}`}
									data-testid={`pediatric-timeline-card-${preset.id}`}
								>
									<div>
										<div className="flex items-center justify-between gap-1 mb-1">
											<span className="text-xs sm:text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100">
												{preset.labelRu}
											</span>
											<span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300">
												{preset.ageRangeRu}
											</span>
										</div>
										<p className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 line-clamp-2 font-medium">
											{preset.descriptionRu}
										</p>
									</div>

									<div className="mt-2.5 pt-2 border-t border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))]/60 dark:border-slate-800 flex items-center justify-between gap-2">
										<span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">
											{preset.targetAge.toFixed(1)} лет
										</span>
										{onApplyAgeArch && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													onSelectAge(preset.targetAge);
													if (preset.teethNumbers) {
														onApplyAgeArch([...preset.teethNumbers]);
													} else {
														const analysis = calculateEruptionTimelineByAge(preset.targetAge);
														onApplyAgeArch([
															...analysis.expectedUpperArchTeeth,
															...analysis.expectedLowerArchTeeth,
														]);
													}
													showToast(
														`Пресет «${preset.labelRu}» (${preset.ageRangeRu}) успешно применен к одонтограмме!`,
														"success",
														3000,
													);
												}}
												className="min-h-[44px] sm:min-h-[32px] px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-xs select-none touch-manipulation"
												title={`Применить формулу «${preset.labelRu}» в 1 клик`}
												data-testid={`pediatric-timeline-apply-${preset.id}`}
											>
												<Sparkles className="w-4 h-4 shrink-0" />
												<span>Применить</span>
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Range Slider (Expanded from 3.0 to 13.5 years) */}
				<div className="space-y-2 pt-2">
					<input
						type="range"
						min="3.0"
						max="13.5"
						step="0.1"
						value={selectedAge}
						onChange={(e) => onSelectAge(Number.parseFloat(e.target.value))}
						className="pediatric-age-slider w-full h-3 bg-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] rounded-lg appearance-none cursor-pointer accent-[var(--teal,#0d9488)] touch-none select-none"
						aria-label="Возраст ребенка для расчета смены прикуса"
					/>
					<div className="flex justify-between text-[11px] sm:text-xs md:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-mono font-bold select-none">
						<span>3.0<span className="hidden sm:inline font-normal"> (Временный)</span></span>
						<span>6.0<span className="hidden sm:inline font-normal"> (1-е мол.)</span></span>
						<span>7.5<span className="hidden sm:inline font-normal"> (Резцы)</span></span>
						<span>9.5<span className="hidden sm:inline font-normal"> (Премол.)</span></span>
						<span>12.0<span className="hidden sm:inline font-normal"> (2-е мол.)</span></span>
						<span>13.5<span className="hidden sm:inline font-normal"> лет</span></span>
					</div>
				</div>

				<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] italic leading-relaxed">
					{timelineAnalysis.stageDescriptionRu}
				</p>
			</div>

			{/* Dental Arch Visual Preview */}
			<PediatricArchVisualizer
				selectedAge={selectedAge}
				hasFirstPermanentMolars={hasFirstPermanentMolars}
				upperRow={upperRow}
				lowerRow={lowerRow}
				timelineAnalysis={timelineAnalysis}
				onApplyAgeArch={onApplyAgeArch}
			/>

			{/* Clinical Alerts / Space Maintenance Cards */}
			{timelineAnalysis.clinicalAlerts.length > 0 && (
				<div className="space-y-3">
					<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
						Клинические рекомендации &amp; Профилактика
					</h4>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{timelineAnalysis.clinicalAlerts.map((alert, idx) => (
							<div
								key={idx}
								className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex items-start gap-3"
							>
								<AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
								<div className="space-y-1">
									<div className="text-sm font-bold text-amber-900 dark:text-amber-200">
										{alert.titleRu}
									</div>
									<div className="text-xs sm:text-sm text-amber-800/85 dark:text-amber-300/85 leading-relaxed font-medium">
										{alert.textRu}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Detailed Tooth Exchange Matrix */}
			<div className="space-y-3">
				<h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
					Матрица смены зубов ({timelineAnalysis.toothStatuses.length} пар)
				</h4>
				<div className="overflow-x-auto rounded-2xl border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))]">
					<table className="w-full text-left text-sm border-collapse">
						<thead>
							<tr className="border-b border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-bold text-xs sm:text-sm">
								<th className="p-3.5">Молочный зуб</th>
								<th className="p-3.5">Постоянный наследник</th>
								<th className="p-3.5">Норма смены</th>
								<th className="p-3.5">Текущий статус</th>
								<th className="p-3.5">Резорбция корня</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--odontogram-border-subtle,var(--line,#e2e8f0))]">
							{timelineAnalysis.toothStatuses.map((st) => {
								const resDef = RESORPTION_STAGE_DEFINITIONS[st.expectedResorptionPercent];
								return (
									<tr
										key={st.fdiNumber}
										className="hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))]/60 transition-colors"
									>
										<td className="p-3.5 font-mono font-bold text-[var(--teal,#0d9488)] text-sm sm:text-base">
											Зуб {st.predecessorPrimaryFdi}
										</td>
										<td className="p-3.5 font-mono font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))] text-sm sm:text-base">
											Зуб {st.successorPermanentFdi}
										</td>
										<td className="p-3.5 font-mono font-semibold text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
											{st.normalEruptionAgeRangeYears[0].toFixed(1)}–{st.normalEruptionAgeRangeYears[1].toFixed(1)} лет
										</td>
										<td className="p-3.5">
											<span
												className={`px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm ${
													st.status === "future_permanent"
														? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
														: st.status === "exfoliating" || st.status === "erupting"
															? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
															: "bg-teal-500/15 text-teal-700 dark:text-teal-300"
												}`}
											>
												{st.labelRu}
											</span>
										</td>
										<td className="p-3.5">
											<span
												className="px-3 py-1.5 rounded-lg font-bold text-xs sm:text-sm"
												style={{
													backgroundColor: resDef.badgeBg,
													color: resDef.badgeColor,
												}}
											>
												{st.expectedResorptionPercent}%
											</span>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<details className="mt-4 p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
					<summary className="text-xs font-bold text-[var(--muted)] cursor-pointer">
						Компактный таймлайн смены зубов (экспресс-виджет)
					</summary>
					<div className="pt-2">
						<PediatricTimelineTab
							selectedAge={selectedAge}
							onAgeChange={onSelectAge}
							timelineAnalysis={timelineAnalysis}
							onApplyAgeArch={onApplyAgeArch}
						/>
					</div>
				</details>
			</div>
		</div>
	);
};
