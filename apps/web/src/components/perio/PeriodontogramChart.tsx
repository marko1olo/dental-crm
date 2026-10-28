/**
 * PeriodontogramChart.tsx — Канонический фасад пародонтограммы DENTE CRM
 * Объединяет экспресс-скрининг ВОЗ (PSR) и разворачиваемую по требованию углубленную карту (Мандат 8e, 8am, 220–280 строк).
 */

import React, { useId, useMemo, useState, useCallback } from "react";
import {
	Activity,
	Check,
	Clock,
	Layers,
	Save,
	X,
} from "lucide-react";
import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import { PerioPsrExpressScreening } from "./PerioPsrExpressScreening";
import { PeriodontalDetailedChart } from "./PeriodontalDetailedChart";
import { usePerioChartLogic } from "./chart/usePerioChartLogic";
import type {
	DetailedPerioTooth,
	PsrCode,
	PsrScreeningMap,
	PsrSextantId,
} from "./perioTypes";

export { PerioPsrExpressScreening } from "./PerioPsrExpressScreening";
export { PeriodontalDetailedChart } from "./PeriodontalDetailedChart";
export * from "./perioTypes";

export interface PeriodontogramChartProps {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onChange?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onSave?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
	readonly initialTier3Expanded?: boolean | undefined;
	readonly initialProbeKeyboardEnabled?: boolean | undefined;
	readonly initialSelectedTooth?: number | undefined;
	readonly isModal?: boolean | undefined;
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
}

export const PeriodontogramChart: React.FC<PeriodontogramChartProps> = React.memo(({
	patientId,
	patientName,
	doctorName,
	visitId,
	initialTeeth,
	onChange,
	onSave,
	onInsertToProtocol,
	readOnly = false,
	initialTier3Expanded = false,
	initialProbeKeyboardEnabled = false,
	initialSelectedTooth = 16,
	isModal = false,
	isOpen = true,
	onClose,
}) => {
	const chartContainerId = useId();
	const [isDetailedExpanded, setIsDetailedExpanded] = useState<boolean>(initialTier3Expanded);

	const logic = usePerioChartLogic({
		initialTeeth,
		patientId,
		visitId,
		initialSelectedTooth,
		onChange,
		onSave,
		onInsertToProtocol,
		readOnly,
		initialTier3Expanded,
		initialProbeKeyboardEnabled,
		doctorName,
	});

	const {
		teeth,
		setTeeth,
		summary,
		psrSextants,
		handleSetAllIntact,
		handleApplyExpressPreset,
		handleApplySextantCode,
		handleSaveDraft,
		syncStatus,
		lastSavedAt,
		handleInsertToProtocol,
	} = logic;

	// Преобразование psrSextants в PsrScreeningMap
	const screeningMap: PsrScreeningMap = useMemo(() => {
		const order: PsrSextantId[] = ["S1", "S2", "S3", "S4", "S5", "S6"];
		const result = {} as PsrScreeningMap;
		for (const id of order) {
			const res = psrSextants[id];
			result[id] = {
				code: (res?.code ?? 0) as PsrCode,
				asterisk: res?.asterisk ?? false,
			};
		}
		return result;
	}, [psrSextants]);

	// Обновление секстанта по клику в экспресс-скрининге
	const handleUpdateSextant = useCallback(
		(sextantId: PsrSextantId, code: PsrCode, asterisk?: boolean) => {
			handleApplySextantCode(sextantId, code, asterisk);
		},
		[handleApplySextantCode],
	);

	// Быстрый пресет гигиены (Код 1–2)
	const handleApplyHygienePreset = useCallback(() => {
		handleApplyExpressPreset("gingivitis_localized");
	}, [handleApplyExpressPreset]);

	// Быстрый пресет пародонтита (Код 3–4)
	const handleApplyPeriodontitisPreset = useCallback(() => {
		handleApplyExpressPreset("periodontitis_moderate");
		setIsDetailedExpanded(true);
	}, [handleApplyExpressPreset]);

	// Преобразование teeth в DetailedPerioTooth[] для детальной карты
	const detailedTeeth: DetailedPerioTooth[] = useMemo(() => {
		return teeth.map((t) => ({
			toothNumber: t.toothNumber,
			isMissing: Boolean(t.isMissing),
			isImplant: Boolean(t.isImplant),
			mobility: (t.mobility ?? 0) as 0 | 1 | 2 | 3,
			furcation: ((t.furcation ?? 0) > 3 ? 3 : (t.furcation ?? 0)) as 0 | 1 | 2 | 3,
			distoBuccal: t.distoBuccal,
			midBuccal: t.midBuccal,
			mesioBuccal: t.mesioBuccal,
			distoLingual: t.distoLingual,
			midLingual: t.midLingual,
			mesioLingual: t.mesioLingual,
		}));
	}, [teeth]);

	// Обновление зуба из детальной карты
	const handleUpdateDetailedTooth = useCallback(
		(updated: DetailedPerioTooth) => {
			setTeeth((prev) =>
				prev.map((t) => (t.toothNumber === updated.toothNumber ? { ...t, ...updated } : t)),
			);
		},
		[setTeeth],
	);

	if (!isOpen) return null;

	const content = (
		<div
			id={chartContainerId}
			data-testid="interactive-periodontogram"
			className="interactive-periodontogram flex flex-col gap-3.5 select-none relative rounded-2xl p-3 sm:p-5 bg-[var(--paper)] border border-[var(--line)] shadow-xs w-full max-w-full overflow-x-clip"
		>
			{/* Единая шапка пародонтограммы (Мандат 8am: 1 Primary CTA) */}
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
						<Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] leading-tight">
								Пародонтологическая карта
							</h2>
							{patientName && (
								<span className="text-xs px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
									{patientName}
								</span>
							)}
						</div>
						<p className="text-xs text-[var(--muted)] flex items-center gap-1.5 pt-0.5">
							{syncStatus === "saved" ? (
								<span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
									<Check className="w-3.5 h-3.5" /> Сохранено
								</span>
							) : syncStatus === "saving" ? (
								<span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium animate-pulse">
									<Clock className="w-3.5 h-3.5" /> Сохранение...
								</span>
							) : lastSavedAt ? (
								<span>Сохранено в {lastSavedAt}</span>
							) : (
								<span>Черновик</span>
							)}
							{summary.bopPercent > 0 && (
								<span className="text-rose-600 dark:text-rose-400 font-medium">
									• BOP: {summary.bopPercent}%
								</span>
							)}
						</p>
					</div>
				</div>

				{/* Действия в шапке: ровно 1 Primary CTA («Сохранить периодонтограмму») */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
					<button
						type="button"
						onClick={handleSetAllIntact}
						disabled={readOnly}
						className="min-h-[44px] h-10 px-3.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/30 cursor-pointer transition-all w-full sm:w-auto"
						title="Мгновенная физиологическая норма (Мандат 8e)"
						data-testid="perio-toolbar-norm-1click-btn"
					>
						<Check className="w-3.5 h-3.5" />
						Пародонт в норме (PSR 0)
					</button>

					<button
						type="button"
						onClick={() => void handleSaveDraft({ closeAfter: false })}
						disabled={readOnly}
						className="min-h-[44px] h-10 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all w-full sm:w-auto"
						data-testid="perio-save-draft-btn"
					>
						<Save className="w-3.5 h-3.5" />
						Сохранить периодонтограмму
					</button>

					{isModal && onClose && (
						<button
							type="button"
							onClick={onClose}
							className="h-9 w-9 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] flex items-center justify-center cursor-pointer transition-all"
							title="Закрыть"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>

			{/* Слой 1: Экспресс-скрининг ВОЗ (PSR) по 6 секстантам — Hot Path */}
			<PerioPsrExpressScreening
				screeningMap={screeningMap}
				onUpdateSextant={handleUpdateSextant}
				onSetAllIntact={handleSetAllIntact}
				onApplyHygienePreset={handleApplyHygienePreset}
				onApplyPeriodontitisPreset={handleApplyPeriodontitisPreset}
				isDetailedExpanded={isDetailedExpanded}
				onToggleDetailed={() => setIsDetailedExpanded((prev) => !prev)}
				onInsertToProtocol={onInsertToProtocol ? () => handleInsertToProtocol() : undefined}
				readOnly={readOnly}
			/>

			{/* Слой 2: Углубленная пародонтограмма (по требованию) */}
			{isDetailedExpanded && (
				<PeriodontalDetailedChart
					teeth={detailedTeeth}
					onUpdateTooth={handleUpdateDetailedTooth}
					readOnly={readOnly}
					defaultSelectedTooth={initialSelectedTooth}
				/>
			)}
		</div>
	);

	if (isModal) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto" data-testid="perio-chart-modal">
				<div className="w-full max-w-5xl my-auto max-h-[95vh] overflow-y-auto rounded-2xl">
					{content}
				</div>
			</div>
		);
	}

	return content;
});

PeriodontogramChart.displayName = "PeriodontogramChart";
export default PeriodontogramChart;
