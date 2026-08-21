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
					<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-glow)] text-xs font-bold">
						<Clock className="w-3.5 h-3.5" />
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
						className="w-full h-2.5 bg-[var(--odontogram-border-subtle,#e2e8f0)] rounded-lg appearance-none cursor-pointer accent-[var(--teal)]"
						aria-label="Возраст ребенка для расчета смены прикуса"
					/>
					<div className="flex justify-between text-[11px] text-[var(--odontogram-ink-muted,#64748b)] font-mono font-semibold">
						<span>5.0 лет</span>
						<span>6.0 (1-е моляры)</span>
						<span>8.0 (Резцы)</span>
						<span>10.0 (Премоляры)</span>
						<span>12.0 (2-е моляры)</span>
						<span>13.5 лет</span>
					</div>
				</div>

				{/* Quick Presets */}
				<div className="flex flex-wrap items-center gap-2 pt-1">
					<span className="text-xs font-semibold text-[var(--odontogram-ink-muted,#64748b)] mr-1">
						Пресеты:
					</span>
					{PRESET_AGES.map((age) => (
						<button
							key={age}
							type="button"
							onClick={() => onAgeChange(age)}
							className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
								Math.abs(selectedAge - age) < 0.1
									? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] border-[var(--teal)] shadow-xs"
									: "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
							}`}
						>
							{age.toFixed(1)} лет
						</button>
					))}
				</div>

				<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)] italic">
					{timelineAnalysis.stageDescriptionRu}
				</p>
			</div>

			{/* Dental Arch Visual Preview */}
			<div className="p-5 rounded-2xl bg-[var(--odontogram-surface,#f8fafc)] border border-[var(--odontogram-border-subtle,#e2e8f0)] space-y-4">
				<div className="flex items-center justify-between">
					<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
						Ожидаемая зубная формула в {selectedAge.toFixed(1)} лет
					</h4>
				</div>

				{/* Upper Arch Pills */}
				<div className="space-y-2">
					<div className="text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
						Верхняя челюсть ({timelineAnalysis.expectedUpperArchTeeth.length} зубов):
					</div>
					<div className="flex flex-wrap gap-2">
						{timelineAnalysis.expectedUpperArchTeeth.map((num) => {
							const isPrim = isPrimaryTooth(num);
							const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
							return (
								<span
									key={num}
									className={`min-w-[44px] min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-mono font-black border flex items-center justify-center gap-1.5 shadow-xs ${
										isErupting
											? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse"
											: isPrim
												? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
												: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
									}`}
									title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
								>
									<span>{num}</span>
									<span className="text-[9px] opacity-75">{isPrim ? "Мол." : "Пост."}</span>
								</span>
							);
						})}
					</div>
				</div>

				{/* Lower Arch Pills */}
				<div className="space-y-2">
					<div className="text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)]">
						Нижняя челюсть ({timelineAnalysis.expectedLowerArchTeeth.length} зубов):
					</div>
					<div className="flex flex-wrap gap-2">
						{timelineAnalysis.expectedLowerArchTeeth.map((num) => {
							const isPrim = isPrimaryTooth(num);
							const isErupting = timelineAnalysis.activelyEruptingPermanentTeeth.includes(num);
							return (
								<span
									key={num}
									className={`min-w-[44px] min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-mono font-black border flex items-center justify-center gap-1.5 shadow-xs ${
										isErupting
											? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse"
											: isPrim
												? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
												: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
									}`}
									title={isPrim ? `Молочный зуб ${num}` : `Постоянный зуб ${num}`}
								>
									<span>{num}</span>
									<span className="text-[9px] opacity-75">{isPrim ? "Мол." : "Пост."}</span>
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
							className="w-full min-h-[48px] flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold shadow-lg shadow-teal-600/20 transition-all cursor-pointer active:scale-[0.98]"
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
					<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
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
									<div className="text-xs font-bold text-amber-900 dark:text-amber-200">
										{alert.titleRu}
									</div>
									<div className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
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
				<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
					Матрица смены зубов ({timelineAnalysis.toothStatuses.length} пар)
				</h4>
				<div className="overflow-x-auto rounded-2xl border border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface,#f8fafc)]">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-[var(--odontogram-border-subtle,#e2e8f0)] bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] font-bold">
								<th className="p-3">Молочный зуб</th>
								<th className="p-3">Постоянный наследник</th>
								<th className="p-3">Норма смены</th>
								<th className="p-3">Текущий статус</th>
								<th className="p-3">Резорбция корня</th>
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
										<td className="p-3 font-mono font-bold text-[var(--teal)]">
											Зуб {st.predecessorPrimaryFdi}
										</td>
										<td className="p-3 font-mono font-bold text-[var(--odontogram-ink,#0f172a)]">
											Зуб {st.successorPermanentFdi}
										</td>
										<td className="p-3 font-mono text-[var(--odontogram-ink-muted,#64748b)]">
											{st.normalEruptionAgeRangeYears[0].toFixed(1)}–{st.normalEruptionAgeRangeYears[1].toFixed(1)} лет
										</td>
										<td className="p-3">
											<span
												className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
													st.status === "future_permanent"
														? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
														: st.status === "exfoliating" || st.status === "erupting"
															? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
															: "bg-teal-500/15 text-teal-700 dark:text-teal-300"
												}`}
											>
												{st.labelRu}
											</span>
										</td>
										<td className="p-3">
											<span
												className="px-2 py-0.5 rounded-md font-bold text-[11px]"
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
