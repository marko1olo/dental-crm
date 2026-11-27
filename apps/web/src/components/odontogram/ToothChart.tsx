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
import { normalizeCanonicalSurfaces, type ToothSurfaceKey } from "@dental/shared";
import { showToast } from "../GlobalToast";
import {
	type ToothData,
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

export function executeWisdomMissingAction(params: {
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	dentitionMode?: ToothChartProps["dentitionMode"] | undefined;
	teethData: readonly ToothData[];
	onQuickStateChange?: ToothChartProps["onQuickStateChange"] | undefined;
	notify?: ((message: string, variant?: "info" | "success" | "warning" | "error") => void) | undefined;
}): boolean {
	const notify = params.notify ?? showToast;
	if (params.pediatricMode || params.dentitionMode === "pediatric") {
		notify("В молочном прикусе зубы мудрости отсутствуют", "info");
		return false;
	}
	if (params.mixedDentition || params.dentitionMode === "mixed") {
		const presentWisdom = [18, 28, 38, 48].filter((num) =>
			params.teethData.some((t) => t.toothNumber === num),
		);
		if (presentWisdom.length === 0) {
			notify("В сменном прикусе зубы мудрости ещё не прорезались", "info");
			return false;
		}
		params.onQuickStateChange?.(presentWisdom, "Missing", []);
		return true;
	}
	params.onQuickStateChange?.([18, 28, 38, 48], "Missing", []);
	return Boolean(params.onQuickStateChange);
}

export function executeProHygieneAction(params: {
	teethData: readonly ToothData[];
	onMarkProHygieneDone?: (() => void) | undefined;
	onQuickStateChange?: ToothChartProps["onQuickStateChange"] | undefined;
	notify?: ((message: string, variant?: "info" | "success" | "warning" | "error") => void) | undefined;
}): number[] {
	if (params.onMarkProHygieneDone) {
		params.onMarkProHygieneDone();
		return [];
	}
	const notify = params.notify ?? showToast;
	// Не затираем существующие пломбы, кариес, коронки и отсутствующие зубы — обновляем только интактные
	const intactTeeth = params.teethData
		.filter((t) => !t.state || t.state === "Healthy")
		.map((t) => t.toothNumber);
	if (params.onQuickStateChange) {
		if (intactTeeth.length > 0) {
			params.onQuickStateChange(intactTeeth, "Healthy", []);
		}
		notify("Профессиональная гигиена отмечена (существующие диагнозы и пломбы сохранены)", "success");
	}
	return intactTeeth;
}

export function executeFastCariesAction(params: {
	selectedTeeth: readonly number[];
	activeSurface?: string | undefined;
	onApplyFastCariesK021?: (() => void) | undefined;
	onQuickStateChange?: ToothChartProps["onQuickStateChange"] | undefined;
	notify?: ((message: string, variant?: "info" | "success" | "warning" | "error") => void) | undefined;
}): boolean {
	if (params.onApplyFastCariesK021) {
		params.onApplyFastCariesK021();
		return true;
	}
	if (params.onQuickStateChange && params.selectedTeeth.length > 0) {
		const targetSurface: ToothSurfaceKey =
			(params.activeSurface ? (normalizeCanonicalSurfaces(params.activeSurface)[0] as ToothSurfaceKey | undefined) : undefined) ?? "O";
		params.onQuickStateChange([...params.selectedTeeth], "Caries", [targetSurface]);
		return true;
	}
	const notify = params.notify ?? showToast;
	notify("Выберите зуб на схеме", "info");
	return false;
}

export const ToothChart: React.FC<ToothChartProps> = memo(({
	teethData = [],
	patientId,
	pediatricMode,
	mixedDentition,
	dentitionMode,
	selectedTeeth = [],
	activeStamp,
	activeSurface,
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
		executeWisdomMissingAction({ pediatricMode, mixedDentition, dentitionMode, teethData, onQuickStateChange });
	}, [onQuickStateChange, pediatricMode, mixedDentition, dentitionMode, teethData]);

	const handleProHygiene = useCallback(() => {
		executeProHygieneAction({ teethData, onMarkProHygieneDone, onQuickStateChange });
	}, [onMarkProHygieneDone, onQuickStateChange, teethData]);

	const handleFastCaries = useCallback(() => {
		executeFastCariesAction({ selectedTeeth, activeSurface, onApplyFastCariesK021, onQuickStateChange });
	}, [onApplyFastCariesK021, onQuickStateChange, selectedTeeth, activeSurface]);

	const handleToothClick = useCallback(
		(e: React.MouseEvent<HTMLElement> | number, num?: number) => {
			if (typeof onToothClick === "function") {
				const n = typeof e === "number" ? e : (num ?? 11);
				const clickCallback = onToothClick as (toothNumber: number) => void;
				clickCallback(n);
			}
		},
		[onToothClick],
	);

	return (
		<div className={`tooth-chart-container w-full flex flex-col items-center ${className}`.trim()} data-testid="tooth-chart-container">
			{!hideExpressActions && (
				<div
					data-testid="tooth-chart-express-actions"
					className="w-full flex items-center justify-between gap-1.5 px-3 py-1 mb-2 bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line)] rounded-xl flex-nowrap overflow-x-auto h-[36px] text-xs"
				>
					<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] shrink-0">
						<Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
						<span>Экспресс-действия:</span>
					</div>
					<div className="flex items-center gap-1.5 flex-nowrap shrink-0">
						<button
							type="button"
							data-testid="mark-intact-dentition-btn"
							onClick={handleMarkIntact}
							title="Отметить все зубы интактными (здоровыми)"
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium bg-[var(--paper)] dark:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors shrink-0"
						>
							<ShieldCheck className="w-3.5 h-3.5 text-current" />
							<span>Санирован / Интактный</span>
						</button>
						<button
							type="button"
							data-testid="mark-wisdom-missing-btn"
							onClick={handleMarkWisdomMissing}
							title="Отметить зубы мудрости (18, 28, 38, 48) как отсутствующие"
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium bg-[var(--paper)] dark:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors shrink-0"
						>
							<Sparkle className="w-3.5 h-3.5 text-current" />
							<span>Без 8-ок</span>
						</button>
						<button
							type="button"
							data-testid="mark-front-intact-btn"
							onClick={handleProHygiene}
							title="Провести комплексную профессиональную гигиену"
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium bg-[var(--paper)] dark:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors shrink-0"
						>
							<Sparkles className="w-3.5 h-3.5 text-current" />
							<span>Профгигиена</span>
						</button>
						<button
							type="button"
							data-testid="tooth-chart-apply-fast-caries-btn"
							onClick={handleFastCaries}
							title="Лечение кариеса"
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium bg-[var(--paper)] dark:bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors shrink-0"
						>
							<HeartPulse className="w-3.5 h-3.5 text-current" />
							<span>Лечение кариеса</span>
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
				onToothClick={onToothClick ? handleToothClick : undefined}
				onQuickStateChange={onQuickStateChange}
				className="w-full"
			/>
		</div>
	);
}, areToothChartPropsEqual);

ToothChart.displayName = "ToothChart";
export default ToothChart;
