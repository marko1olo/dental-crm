/**
 * apps/web/src/components/odontogram/ToothChart.tsx
 *
 * DENTE Dental CRM — Canonical ToothChart Façade Adapter (Mandates 8ar, 8as, 8e, 8b).
 * Re-exports clinical types (ToothData, ToothState, TOOTH_STATE_LABELS, ToothChartProps),
 * bridges legacy chart callers to the canonical WheelerToothArch 2.5D anatomical arch,
 * and maintains 1-click chairside express buttons (intact, hygiene, fast caries, wisdom).
 */

import React, { useCallback, memo } from "react";
import { Sparkles, ShieldCheck, HeartPulse, Sparkle } from "lucide-react";
import {
	type ToothChartProps,
	areToothChartPropsEqual,
} from "./chart/toothChartTypes";
import { WheelerToothArch } from "./WheelerToothArch";

export * from "./chart/toothChartTypes";
export * from "./chart/ToothColors";
export * from "./MobileQuadrantTabs";
export * from "./WheelerToothArch";

/** Supported scale invariant for 320px/375px viewports (Mandate 8aw) */
export const MIN_ARCH_SCALE = 0.35;

export const ToothChart: React.FC<ToothChartProps> = memo(({
	teethData = [],
	patientId,
	pediatricMode,
	mixedDentition,
	dentitionMode,
	selectedTeeth = [],
	activeStamp,
	onToothClick,
	onQuickStateChange,
	onMarkIntactDentition,
	onMarkProHygieneDone,
	onApplyFastCariesK021,
	className = "",
	hideExpressActions = false,
}) => {
	const handleMarkIntact = useCallback(() => {
		if (onMarkIntactDentition) {
			onMarkIntactDentition();
		} else if (onQuickStateChange) {
			const all = teethData.map((t) => t.toothNumber);
			onQuickStateChange(all, "Healthy", []);
		}
	}, [onMarkIntactDentition, onQuickStateChange, teethData]);

	const handleMarkWisdomMissing = useCallback(() => {
		if (onQuickStateChange) {
			onQuickStateChange([18, 28, 38, 48], "Missing", []);
		}
	}, [onQuickStateChange]);

	const handleProHygiene = useCallback(() => {
		if (onMarkProHygieneDone) {
			onMarkProHygieneDone();
		} else if (onQuickStateChange) {
			const all = teethData.map((t) => t.toothNumber);
			onQuickStateChange(all, "Healthy", []);
		}
	}, [onMarkProHygieneDone, onQuickStateChange, teethData]);

	const handleFastCaries = useCallback(() => {
		if (onApplyFastCariesK021) {
			onApplyFastCariesK021();
		} else if (onQuickStateChange && selectedTeeth.length > 0) {
			onQuickStateChange(selectedTeeth, "Caries", ["Occ"]);
		}
	}, [onApplyFastCariesK021, onQuickStateChange, selectedTeeth]);

	return (
		<div className={`tooth-chart-container w-full flex flex-col items-center ${className}`.trim()} data-testid="tooth-chart-container">
			{!hideExpressActions && (
				<div
					data-testid="tooth-chart-express-actions"
					className="w-full flex items-center justify-between gap-1.5 px-3 py-1 mb-2 bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] rounded-xl flex-nowrap overflow-x-auto h-[36px] text-xs"
				>
					<div className="flex items-center gap-1.5 font-semibold text-[var(--ink,#0f172a)] dark:text-slate-200 shrink-0">
						<Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>Экспресс-действия:</span>
					</div>
					<div className="flex items-center gap-1.5 flex-nowrap shrink-0">
						<button
							type="button"
							data-testid="mark-intact-dentition-btn"
							onClick={handleMarkIntact}
							title="Отметить все зубы интактными (здоровыми)"
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
						>
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
							<span>Санирован / Интактный</span>
						</button>
						<button
							type="button"
							data-testid="mark-wisdom-missing-btn"
							onClick={handleMarkWisdomMissing}
							title="Отметить зубы мудрости (18, 28, 38, 48) как отсутствующие"
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
						>
							<Sparkle className="w-3.5 h-3.5 text-slate-500" />
							<span>Без 8-ок</span>
						</button>
						<button
							type="button"
							data-testid="mark-front-intact-btn"
							onClick={handleProHygiene}
							title="Провести комплексную профессиональную гигиену"
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
						>
							<Sparkles className="w-3.5 h-3.5 text-sky-600" />
							<span>Профгигиена</span>
						</button>
						<button
							type="button"
							data-testid="tooth-chart-apply-fast-caries-btn"
							onClick={handleFastCaries}
							title="Зафиксировать кариес дентина K02.1"
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
						>
							<HeartPulse className="w-3.5 h-3.5 text-amber-600" />
							<span>Быстрая пломба K02.1</span>
						</button>
					</div>
				</div>
			)}

			<WheelerToothArch
				patientId={patientId}
				teethData={teethData}
				selectedTeeth={selectedTeeth}
				activeStamp={activeStamp}
				pediatricMode={pediatricMode}
				mixedDentition={mixedDentition}
				dentitionMode={dentitionMode}
				mode="interactive"
				onToothClick={onToothClick ? ((e, num) => {
					if (typeof onToothClick === "function") {
						const n = typeof e === "number" ? e : num ?? 11;
						(onToothClick as any)(n);
					}
				}) : undefined}
				onQuickStateChange={onQuickStateChange}
				className="w-full"
			/>
		</div>
	);
}, areToothChartPropsEqual);

ToothChart.displayName = "ToothChart";
export default ToothChart;
