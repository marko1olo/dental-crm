import React from "react";
import { AlertCircle, Clock, Sparkles } from "lucide-react";
import {
	type EruptionTimelineAnalysis,
	isPrimaryTooth,
	RESORPTION_STAGE_DEFINITIONS,
} from "./pediatricDentitionEngine";

export interface PediatricTimelineTabProps {
	selectedAge: number;
	onAgeChange: (age: number) => void;
	timelineAnalysis: EruptionTimelineAnalysis;
	onApplyAgeArch?: ((teethNumbers: number[]) => void) | undefined;
}

const PRESET_AGES = [5.5, 6.0, 7.0, 8.5, 10.5, 12.0] as const;

export const PediatricTimelineTab: React.FC<PediatricTimelineTabProps> = ({
	selectedAge,
	onAgeChange,
	timelineAnalysis,
	onApplyAgeArch,
}) => {
	const handleApply = () => {
		if (onApplyAgeArch) {
			onApplyAgeArch([
				...timelineAnalysis.expectedUpperArchTeeth,
				...timelineAnalysis.expectedLowerArchTeeth,
			]);
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-200">
			{/* Age Slider & Preset Bar */}
			<div className="p-5 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)]">
							Калькулятор смены зубов
						</span>
						<h3 className="text-base font-extrabold text-[var(--odontogram-ink,#0f172a)]">
							Возраст ребенка:{" "}
							<span className="text-[var(--teal)] font-mono">
								{selectedAge.toFixed(1)} лет ({Math.round(selectedAge * 12)} мес.)
							</span>
						</h3>
					</div>

					{/* Stage Badge */}
					<div className="inline-flex items-center gap-2 min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-glow)] text-[13px] font-bold">
						<Clock className="w-4 h-4" />
						<span>{timelineAnalysis.stageNameRu}</span>
					</div>
				</div>

				{/* Range Slider */}
				<div className="space-y-2">
					<input
						type="range"
						min="5.0"
						max="13.5"
						step="0.1"
						value={selectedAge}
						onChange={(e) => onAgeChange(Number.parseFloat(e.target.value))}
						className="w-full h-3 bg-[var(--odontogram-border-subtle,#e2e8f0)] rounded-lg appearance-none cursor-pointer accent-[var(--teal)]"
						aria-label="Возраст ребенка для расчета смены прикуса"
					/>
					<div className="flex justify-between text-[12px] sm:text-[13px] text-[var(--odontogram-ink-muted,#64748b)] font-mono font-semibold">
						<span>5.0<span className="hidden sm:inline"> лет</span></span>
						<span>6.0<span className="hidden sm:inline"> (1-е моляры)</span></span>
						<span>8.0<span className="hidden sm:inline"> (Резцы)</span></span>
						<span>10.0<span className="hidden sm:inline"> (Премоляры)</span></span>
						<span>12.0<span className="hidden sm:inline"> (2-е моляры)</span></span>
						<span>13.5<span className="hidden sm:inline"> лет</span></span>
					</div>
				</div>

				{/* Quick Presets */}
				<div className="flex flex-wrap items-center gap-2 pt-1">
					<span className="text-[13px] font-bold text-[var(--odontogram-ink-muted,#64748b)] mr-1">
						Пресеты:
					</span>
					{PRESET_AGES.map((age) => (
						<button
							key={age}
							type="button"
							onClick={() => onAgeChange(age)}
							className={`min-h-[44px] min-w-[64px] px-4 py-2.5 rounded-xl text-[13px] sm:text-sm font-bold border transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center ${
								Math.abs(selectedAge - age) < 0.1
									? "bg-teal-600 dark:bg-teal-500 text-white border-teal-600 dark:border-teal-500 shadow-sm"
									: "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)] dark:hover:bg-slate-800"
							}`}
						>
							{age.toFixed(1)} лет
						</button>
					))}
				</div>

				<p className="text-[13px] text-[var(--odontogram-ink-muted,#64748b)] italic">
					{timelineAnalysis.stageDescriptionRu}
				</p>
			</div>

			{/* Dental Arch Visual Preview */}
			<div className="p-5 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-4">
				<div className="flex items-center justify-between">
					<h4 className="text-[13px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
						Ожидаемая зубная формула в {selectedAge.toFixed(1)} лет
					</h4>
				</div>

				{/* Upper Arch Pills */}
				<div className="space-y-2">
					<div className="text-[13px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
						Верхняя челюсть ({timelineAnalysis.expectedUpperArchTeeth.length} зубов):
					</div>
					<div className="flex flex-wrap gap-2">
						{timelineAnalysis.expectedUpperArchTeeth.map((num) => {
							const isPrim = isPrimaryTooth(num);
							const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
							return (
								<span
									key={num}
									className={`min-w-[54px] min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-mono font-black border flex items-center justify-center gap-1.5 shadow-xs transition-all ${
										isErupting
											? "bg-amber-500/20 text-amber-900 dark:text-amber-100 border-amber-500/40 animate-pulse font-extrabold"
											: isPrim
												? "bg-teal-500/15 text-teal-900 dark:text-teal-100 border-teal-500/30"
												: "bg-blue-500/15 text-blue-900 dark:text-blue-100 border-blue-500/30"
									}`}
									title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
								>
									<span className="text-sm font-black">{num}</span>
									<span className="text-[12px] font-semibold opacity-90">{isPrim ? "Мол." : "Пост."}</span>
								</span>
							);
						})}
					</div>
				</div>

				{/* Lower Arch Pills */}
				<div className="space-y-2">
					<div className="text-[13px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
						Нижняя челюсть ({timelineAnalysis.expectedLowerArchTeeth.length} зубов):
					</div>
					<div className="flex flex-wrap gap-2">
						{timelineAnalysis.expectedLowerArchTeeth.map((num) => {
							const isPrim = isPrimaryTooth(num);
							const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
							return (
								<span
									key={num}
									className={`min-w-[54px] min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-mono font-black border flex items-center justify-center gap-1.5 shadow-xs transition-all ${
										isErupting
											? "bg-amber-500/20 text-amber-900 dark:text-amber-100 border-amber-500/40 animate-pulse font-extrabold"
											: isPrim
												? "bg-teal-500/15 text-teal-900 dark:text-teal-100 border-teal-500/30"
												: "bg-blue-500/15 text-blue-900 dark:text-blue-100 border-blue-500/30"
									}`}
									title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
								>
									<span className="text-sm font-black">{num}</span>
									<span className="text-[12px] font-semibold opacity-90">{isPrim ? "Мол." : "Пост."}</span>
								</span>
							);
						})}
					</div>
				</div>

				{/* Big Tactile Action Button */}
				{onApplyAgeArch && (
					<div className="pt-2">
						<button
							type="button"
							onClick={handleApply}
							className="w-full min-h-[48px] flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-sm sm:text-base font-bold shadow-lg shadow-teal-600/20 transition-all cursor-pointer active:scale-[0.98]"
						>
							<Sparkles className="w-5 h-5" />
							<span>Применить возрастную формулу ({selectedAge.toFixed(1)} лет) к одонтограмме</span>
						</button>
					</div>
				)}
			</div>

			{/* Clinical Alerts / Space Maintenance Cards */}
			{timelineAnalysis.clinicalAlerts.length > 0 && (
				<div className="space-y-3">
					<h4 className="text-[13px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
						Клинические рекомендации & Профилактика
					</h4>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{timelineAnalysis.clinicalAlerts.map((alert, idx) => (
							<div
								key={idx}
								className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex items-start gap-3"
							>
								<AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
								<div className="space-y-1">
									<div className="text-sm font-bold text-amber-950 dark:text-amber-100">
										{alert.titleRu}
									</div>
									<div className="text-[13px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
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
				<h4 className="text-[13px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
					Матрица смены зубов ({timelineAnalysis.toothStatuses.length} пар)
				</h4>
				<div className="overflow-x-auto rounded-2xl border border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)]">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] font-bold text-[13px]">
								<th className="p-3.5">Молочный зуб</th>
								<th className="p-3.5">Постоянный наследник</th>
								<th className="p-3.5">Норма смены</th>
								<th className="p-3.5">Текущий статус</th>
								<th className="p-3.5">Резорбция корня</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--odontogram-border-subtle,#e2e8f0)]">
							{timelineAnalysis.toothStatuses.map((st) => {
								const resDef = RESORPTION_STAGE_DEFINITIONS[st.expectedResorptionPercent];
								return (
									<tr
										key={st.fdiNumber}
										className="hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]/60 transition-colors"
									>
										<td className="p-3.5 font-mono font-bold text-[13px] text-[var(--teal)]">
											Зуб {st.predecessorPrimaryFdi}
										</td>
										<td className="p-3.5 font-mono font-bold text-[13px] text-[var(--odontogram-ink,#0f172a)]">
											Зуб {st.successorPermanentFdi}
										</td>
										<td className="p-3.5 font-mono text-[13px] text-[var(--odontogram-ink-muted,#64748b)]">
											{st.normalEruptionAgeRangeYears[0].toFixed(1)}–{st.normalEruptionAgeRangeYears[1].toFixed(1)} лет
										</td>
										<td className="p-3.5">
											<span
												className={`inline-flex items-center min-h-[32px] px-3 py-1.5 rounded-lg text-[13px] font-semibold ${
													st.status === "future_permanent"
														? "bg-blue-500/15 text-blue-900 dark:text-blue-200"
														: st.status === "exfoliating" || st.status === "erupting"
															? "bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold"
															: "bg-teal-500/15 text-teal-900 dark:text-teal-200"
												}`}
											>
												{st.labelRu}
											</span>
										</td>
										<td className="p-3.5">
											<span
												className="inline-flex items-center justify-center min-h-[32px] min-w-[52px] px-3 py-1.5 rounded-lg text-[13px] font-black"
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
			</div>
		</div>
	);
};
