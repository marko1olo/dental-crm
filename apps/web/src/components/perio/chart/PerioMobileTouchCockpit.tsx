/**
 * apps/web/src/components/perio/chart/PerioMobileTouchCockpit.tsx
 *
 * Сенсорная карта пародонта для смартфонов и планшетов (Apple HIG 390x844).
 * Эргономичный слой для врача у кресла (Мандаты 8e, 8n, 8am):
 * - Физиологическая норма в 1 тап: «Пародонт в норме» (глубина 1–2 мм, BOP 0%)
 * - 4 квадранта зубного ряда: [ Q1 Верх-Пр | Q2 Верх-Лев | Q3 Низ-Лев | Q4 Низ-Пр ]
 * - Быстрый выбор зуба и фиксация патологии только там, где реально есть карман ≥ 4 мм
 * - Ровно ОДНА Primary CTA кнопка: «Сохранить периодонтограмму»
 * - Мгновенный экспорт в дневник приёма («В дневник»)
 * - 0px паразитного горизонтального скролла (overflow-x: clip; max-width: 100vw)
 */

import {
	calculateClinicalAttachmentLevel,
	FURCATION_GRADES,
	isFurcationEligibleTooth,
	MOBILITY_GRADES,
	PERIO_SITE_KEYS,
	type PerioChartSummary,
	type PerioSiteKey,
	type PerioToothRecord,
	type PeriodontalDiagnosisDetail,
} from "@dental/shared";
import {
	AlertCircle,
	Check,
	Droplets,
	FileText,
	Save,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import React, { useState } from "react";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols";
import { UltrasonicScaler } from "../../icons/DentalIcons";
import { probingDepthClinicalClasses } from "../perioHeatmap";
import { PerioToothVisual } from "./PerioToothVisual";
import { SITE_SHORT_RU } from "./PerioToothCard";
import { MobilePerioKeypadDial, SITE_NAME_FULL_RU } from "./MobilePerioKeypadDial";
import type { PerioExpressPresetId } from "../perioMath";

export type PerioQuadrantKey = "Q1" | "Q2" | "Q3" | "Q4";

export interface PerioMobileTouchCockpitProps {
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly selectedToothNumber: number;
	readonly onSelectTooth: (toothNumber: number) => void;
	readonly focusedSite: {
		toothNumber: number;
		siteKey: PerioSiteKey;
	} | null;
	readonly onFocusSite: (toothNumber: number, siteKey: PerioSiteKey) => void;
	readonly readOnly?: boolean | undefined;
	readonly onKeypadDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration: () => void;
	readonly onPrevSite: () => void;
	readonly onNextSite: () => void;
	readonly onCycleMobility: (toothNumber: number) => void;
	readonly onCycleFurcation: (toothNumber: number) => void;
	readonly updateToothSite: (
		toothNumber: number,
		siteKey: PerioSiteKey,
		updater: (prev: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>,
	) => void;
	readonly updateToothProperties: (
		toothNumber: number,
		patch: Partial<
			Pick<PerioToothRecord, "isMissing" | "isImplant" | "mobility" | "furcation">
		>,
	) => void;
	readonly summary: PerioChartSummary;
	readonly aapDiagnosis: PeriodontalDiagnosisDetail;
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
	readonly onSetAllIntact: () => void;
	readonly onInsertToProtocol: () => void;
	readonly insertStatus: boolean;
	readonly onSaveDraft?: (() => void) | undefined;
	readonly syncStatus?: string | undefined;
}

const QUADRANT_TEETH: Record<PerioQuadrantKey, number[]> = {
	Q1: [18, 17, 16, 15, 14, 13, 12, 11],
	Q2: [21, 22, 23, 24, 25, 26, 27, 28],
	Q3: [31, 32, 33, 34, 35, 36, 37, 38],
	Q4: [48, 47, 46, 45, 44, 43, 42, 41],
};

const QUADRANT_NAMES: Record<PerioQuadrantKey, { label: string; sub: string; isUpper: boolean }> = {
	Q1: { label: "Q1 Верх-Пр", sub: "18–11", isUpper: true },
	Q2: { label: "Q2 Верх-Лев", sub: "21–28", isUpper: true },
	Q3: { label: "Q3 Низ-Лев", sub: "31–38", isUpper: false },
	Q4: { label: "Q4 Низ-Пр", sub: "48–41", isUpper: false },
};

function getQuadrantForTooth(toothNumber: number): PerioQuadrantKey {
	if (toothNumber >= 11 && toothNumber <= 18) return "Q1";
	if (toothNumber >= 21 && toothNumber <= 28) return "Q2";
	if (toothNumber >= 31 && toothNumber <= 38) return "Q3";
	return "Q4";
}

function getMaxDepthForTooth(tooth: PerioToothRecord | undefined): number {
	if (!tooth || tooth.isMissing) return 0;
	let max = 0;
	for (const key of PERIO_SITE_KEYS) {
		const pd = tooth[key]?.probingDepthMm ?? 0;
		if (pd > max) max = pd;
	}
	return max;
}

function hasBopOnTooth(tooth: PerioToothRecord | undefined): boolean {
	if (!tooth || tooth.isMissing) return false;
	for (const key of PERIO_SITE_KEYS) {
		if (tooth[key]?.bleedingOnProbing) return true;
	}
	return false;
}

export const PerioMobileTouchCockpit: React.FC<PerioMobileTouchCockpitProps> = React.memo(({
	toothMap,
	selectedToothNumber,
	onSelectTooth,
	focusedSite,
	onFocusSite,
	readOnly = false,
	onKeypadDepth,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
	onPrevSite,
	onNextSite,
	onCycleMobility,
	onCycleFurcation,
	updateToothSite,
	updateToothProperties,
	summary,
	aapDiagnosis,
	onApplyExpressPreset,
	onSetAllIntact,
	onInsertToProtocol,
	insertStatus,
	onSaveDraft,
	syncStatus = "idle",
}) => {
	const [activeQuadrant, setActiveQuadrant] = useState<PerioQuadrantKey>(() =>
		getQuadrantForTooth(selectedToothNumber),
	);

	const selectedTooth = toothMap.get(selectedToothNumber);
	const isUpper = selectedToothNumber >= 11 && selectedToothNumber <= 28;

	const handleSelectQuadrant = (qKey: PerioQuadrantKey) => {
		setActiveQuadrant(qKey);
		const teethInQ = QUADRANT_TEETH[qKey];
		if (!teethInQ.includes(selectedToothNumber)) {
			const defaultTooth = teethInQ.find((t) => t % 10 === 6) ?? teethInQ[0];
			if (defaultTooth) {
				onSelectTooth(defaultTooth);
				onFocusSite(defaultTooth, "midBuccal");
			}
		}
	};

	const teethInCurrentQuadrant = QUADRANT_TEETH[activeQuadrant];

	const isRightQuadrant =
		(selectedToothNumber >= 11 && selectedToothNumber <= 18) ||
		(selectedToothNumber >= 41 && selectedToothNumber <= 48);

	const buccalSites: PerioSiteKey[] = isRightQuadrant
		? ["distoBuccal", "midBuccal", "mesioBuccal"]
		: ["mesioBuccal", "midBuccal", "distoBuccal"];

	const lingualSites: PerioSiteKey[] = isRightQuadrant
		? ["distoLingual", "midLingual", "mesioLingual"]
		: ["mesioLingual", "midLingual", "distoLingual"];

	const currentFocusedSiteKey =
		focusedSite?.toothNumber === selectedToothNumber
			? focusedSite.siteKey
			: "midBuccal";

	const currentSiteData = selectedTooth?.[currentFocusedSiteKey];
	const currentPd = currentSiteData?.probingDepthMm ?? 2;
	const currentBop = currentSiteData?.bleedingOnProbing ?? false;
	const currentPlq = currentSiteData?.plaque ?? false;
	const currentPus = currentSiteData?.suppuration ?? false;

	return (
		<div
			className="perio-mobile-touch-cockpit flex flex-col gap-3 w-full max-w-full overflow-x-clip select-none"
			data-testid="perio-mobile-cockpit"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. ВЕРХНИЙ БЛОК: СТАТУС ДЕСНЫ И БЫСТРЫЕ ДЕЙСТВИЯ (Apple HIG)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="w-full flex flex-col gap-1.5">
				<div className="w-full flex items-center justify-between gap-2">
					<span
						className={`block flex-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border text-center truncate ${
							aapDiagnosis.severity === "intact"
								? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
								: aapDiagnosis.severity === "gingivitis"
									? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
									: aapDiagnosis.severity === "moderate"
										? "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30"
										: "bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40"
						}`}
						title={aapDiagnosis.diagnosisNameRu}
					>
						{aapDiagnosis.icd10Code} • {aapDiagnosis.diagnosisNameRu.split("(")[0]?.trim()}
					</span>
				</div>

				{/* 1-клик кнопки: «Норма» • «Гигиена» • «В дневник» */}
				<div className="grid grid-cols-3 gap-1.5 w-full">
					{/* Норма пародонта в 1 клик */}
					<button
						type="button"
						onClick={() => onApplyExpressPreset("perio_norm_express")}
						className="min-h-[48px] px-2 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 active:scale-95 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-center"
						title="Вся десна здорова (Норма) • Пародонт интактен (глубина 1–2 мм, BOP 0%)"
						data-testid="perio-toolbar-norm-1click-btn"
					>
						<ShieldCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
						<span className="whitespace-nowrap">Норма</span>
					</button>

					{/* Профгигиена */}
					<button
						type="button"
						onClick={() => onApplyExpressPreset("pro_hygiene_express")}
						className="min-h-[48px] px-2 py-2 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] active:scale-95 text-[var(--ink)] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-center"
						title="Профессиональная гигиена полости рта"
						data-testid="perio-toolbar-prophy-1click-btn"
					>
						<UltrasonicScaler size={16} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
						<span className="whitespace-nowrap">Гигиена</span>
					</button>

					{/* Внести в дневник визита */}
					<button
						type="button"
						onClick={onInsertToProtocol}
						className="min-h-[48px] px-2 py-2 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] active:scale-95 text-[var(--ink)] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-center"
						title="Внести клиническое резюме в дневник приёма"
						data-testid="perio-insert-protocol-btn"
					>
						{insertStatus ? <Check size={16} className="shrink-0 text-emerald-500" /> : <FileText size={16} className="shrink-0 text-teal-600 dark:text-teal-400" />}
						<span className="whitespace-nowrap">{insertStatus ? "Внесено!" : "В дневник"}</span>
					</button>
				</div>

				{/* Пресеты патологии в 1 клик */}
				<div className="grid grid-cols-4 gap-1.5 w-full">
					<button
						type="button"
						onClick={() => onApplyExpressPreset("gingivitis_express")}
						className="min-h-[44px] px-1 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-[11px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer text-center"
						data-testid="perio-mobile-preset-gingivitis-btn"
						title="Гингивит (K05.1): карманы < 3.5 мм, BOP+"
					>
						<span className="whitespace-nowrap">Гингивит</span>
						<span className="text-[10px] opacity-75 font-mono">K05.1</span>
					</button>

					<button
						type="button"
						onClick={() => onApplyExpressPreset("periodontitis_moderate_express")}
						className="min-h-[44px] px-1 py-1 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 active:scale-95 text-orange-900 dark:text-orange-200 border border-orange-500/30 text-[10px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer text-center"
						data-testid="perio-mobile-preset-moderate-btn"
						title="Пародонтит средний (K05.31): карманы 4-5 мм"
					>
						<span className="whitespace-nowrap tracking-tighter">Пародонтит</span>
						<span className="text-[10px] opacity-75 font-mono">K05.31</span>
					</button>

					<button
						type="button"
						onClick={() => onApplyExpressPreset("periodontitis_severe_express")}
						className="min-h-[44px] px-1 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-900 dark:text-rose-200 border border-rose-500/30 text-[11px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer text-center"
						data-testid="perio-mobile-preset-severe-btn"
						title="Пародонтит тяжелый (K05.32): карманы >= 6 мм"
					>
						<span className="whitespace-nowrap">Тяжелый</span>
						<span className="text-[10px] opacity-75 font-mono">K05.32</span>
					</button>

					<button
						type="button"
						onClick={() => onApplyExpressPreset("recession_express")}
						className="min-h-[44px] px-1 py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 active:scale-95 text-purple-900 dark:text-purple-200 border border-purple-500/30 text-[11px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer text-center"
						data-testid="perio-mobile-preset-recession-btn"
						title="Рецессия десны (K06.0): рецессия 1-3 мм"
					>
						<span className="whitespace-nowrap">Рецессия</span>
						<span className="text-[10px] opacity-75 font-mono">K06.0</span>
					</button>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. СВОДНЫЕ ПОКАЗАТЕЛИ ПАРОДОНТА
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="grid grid-cols-4 gap-1.5 w-full">
				<div className="p-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
					<span className="text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap">
						Кровь (BOP)
					</span>
					<span
						className={`text-sm font-black ${
							summary.fmbsPercent <= 10
								? "text-emerald-500"
								: summary.fmbsPercent <= 25
									? "text-amber-500"
									: "text-rose-500"
						}`}
					>
						{summary.fmbsPercent}%
					</span>
				</div>

				<div className="p-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
					<span className="text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap">
						Налёт (PLQ)
					</span>
					<span
						className={`text-sm font-black ${
							summary.fmpsPercent <= 15
								? "text-emerald-500"
								: summary.fmpsPercent <= 30
									? "text-amber-500"
									: "text-rose-500"
						}`}
					>
						{summary.fmpsPercent}%
					</span>
				</div>

				<div className="p-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
					<span className="text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap">
						Карманы ≥5
					</span>
					<span
						className={`text-sm font-black ${
							summary.deepPocketsCount === 0 ? "text-emerald-500" : "text-rose-500"
						}`}
					>
						{summary.deepPocketsCount}
					</span>
				</div>

				<div className="p-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
					<span className="text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap">
						Макс карман
					</span>
					<span className="text-sm font-black text-[var(--ink)]">
						{summary.maxPocketDepthMm} мм
					</span>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    3. ПЕРЕКЛЮЧАТЕЛЬ 4 КВАДРАНТОВ (Q1–Q4)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="w-full flex flex-col gap-1.5">
				<div className="w-full grid grid-cols-4 gap-1 p-1 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
					{(["Q1", "Q2", "Q3", "Q4"] as const).map((qKey) => {
						const isCurrent = activeQuadrant === qKey;
						const cfg = QUADRANT_NAMES[qKey];
						return (
							<button
								key={qKey}
								type="button"
								onClick={() => handleSelectQuadrant(qKey)}
								className={`min-h-[48px] py-1 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
									isCurrent
										? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-teal-500/50 font-bold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid={`perio-quadrant-tab-${qKey}`}
							>
								<span className="text-xs font-black tracking-tight">{cfg.label}</span>
								<span className="text-[10px] text-[var(--muted)]">{cfg.sub}</span>
							</button>
						);
					})}
				</div>

				{/* 8 зубов выбранного квадранта */}
				<div className="grid grid-cols-8 gap-1 w-full p-1.5 rounded-2xl bg-[var(--paper-soft)]/50 border border-[var(--line)]">
					{teethInCurrentQuadrant.map((tNum) => {
						const tRecord = toothMap.get(tNum);
						const isSelected = selectedToothNumber === tNum;
						const maxPd = getMaxDepthForTooth(tRecord);
						const hasBop = hasBopOnTooth(tRecord);
						const isMissing = tRecord?.isMissing ?? false;

						return (
							<button
								key={tNum}
								type="button"
								onClick={() => {
									onSelectTooth(tNum);
									onFocusSite(tNum, "midBuccal");
								}}
								className={`min-h-[48px] py-1 px-0.5 rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer border ${
									isMissing
										? "opacity-40 bg-[var(--paper-soft)] border-[var(--line)]"
										: isSelected
											? "bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500 ring-2 ring-teal-400/50 shadow-sm"
											: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)]"
								}`}
								data-testid={`perio-quadrant-tooth-${tNum}`}
								title={`Зуб #${tNum}: макс глубина ${maxPd} мм`}
							>
								<span className="text-xs font-black font-mono leading-none">{tNum}</span>

								{!isMissing && (
									<div className="flex items-center gap-0.5 mt-0.5">
										<span
											className={`text-[9px] font-mono font-bold px-1 rounded-sm leading-tight ${
												maxPd <= 3
													? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
													: maxPd <= 5
														? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
														: "bg-rose-500/25 text-rose-700 dark:text-rose-300 font-black"
											}`}
										>
											{maxPd}
										</span>
										{hasBop && (
											<span
												className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"
												title="Кровоточивость (BOP)"
											/>
										)}
									</div>
								)}
								{isMissing && <span className="text-[8px] text-[var(--muted)]">Отс</span>}
							</button>
						);
					})}
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    4. ФОКУСНЫЙ ЗУБ У КРЕСЛА: ВЫБОР ПАТОЛОГИИ
			    ═══════════════════════════════════════════════════════════════════ */}
			{selectedTooth && (
				<div className="p-3 rounded-2xl bg-[var(--paper)] border border-teal-500/30 shadow-sm flex flex-col gap-3 w-full">
					<div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--line)]">
						<div className="flex items-center gap-2 min-w-0">
							<span className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-300 font-black text-base flex items-center justify-center border border-teal-500/40 shrink-0">
								{selectedTooth.toothNumber}
							</span>
							<div className="min-w-0">
								<h4 className="text-xs font-bold text-[var(--ink)] truncate">
									{getToothFolkAndAnatomicalNameRu(selectedTooth.toothNumber)}
								</h4>
								<span className="text-[10px] text-[var(--muted)] block truncate">
									{selectedTooth.isMissing
										? "Зуб отсутствует"
										: selectedTooth.isImplant
											? "Имплантат"
											: "Естественный зуб"}
								</span>
							</div>
						</div>

						{/* Свойства зуба */}
						{!readOnly && (
							<div className="flex items-center gap-1.5 text-xs">
								<button
									type="button"
									onClick={() =>
										updateToothProperties(selectedTooth.toothNumber, {
											isMissing: !selectedTooth.isMissing,
										})
									}
									className={`min-h-[44px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
										selectedTooth.isMissing
											? "bg-[var(--line-strong)] text-[var(--ink)] border-[var(--line)]"
											: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
									}`}
								>
									{selectedTooth.isMissing ? "Отсутствует" : "Отс."}
								</button>

								<button
									type="button"
									onClick={() =>
										updateToothProperties(selectedTooth.toothNumber, {
											isImplant: !selectedTooth.isImplant,
										})
									}
									className={`min-h-[44px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
										selectedTooth.isImplant
											? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
											: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
									}`}
								>
									{selectedTooth.isImplant ? "Импл. +" : "Импл."}
								</button>

								<button
									type="button"
									onClick={() => onCycleMobility(selectedTooth.toothNumber)}
									className={`min-h-[44px] px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
										selectedTooth.mobility > 0
											? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
											: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
									}`}
									title="Степень подвижности зуба по Миллеру (0..III)"
								>
									Подвижн. {selectedTooth.mobility}
								</button>

								{isFurcationEligibleTooth(selectedTooth.toothNumber) && (
									<button
										type="button"
										onClick={() => onCycleFurcation(selectedTooth.toothNumber)}
										className={`min-h-[44px] px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
											selectedTooth.furcation > 0
												? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40"
												: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
										}`}
										title="Степень фуркации корней по Хампу (0..IV)"
									>
										Фуркац. {selectedTooth.furcation}
									</button>
								)}
							</div>
						)}
					</div>

					{/* Клинические поверхности зуба (Вестибулярно / Орально) */}
					{!selectedTooth.isMissing ? (
						<div className="flex flex-col gap-2 w-full">
							{/* Вестибулярная сторона */}
							<div className="flex flex-col gap-1 w-full">
								<span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
									Вестибулярно (щечная / губная сторона)
								</span>
								<div className="grid grid-cols-3 gap-1.5 w-full">
									{buccalSites.map((sKey) => {
										const site = selectedTooth[sKey] ?? {
											probingDepthMm: 2,
											gingivalMarginMm: 0,
											bleedingOnProbing: false,
											suppuration: false,
											plaque: false,
										};
										const isFocused =
											focusedSite?.toothNumber === selectedTooth.toothNumber &&
											focusedSite.siteKey === sKey;
										const pd = site.probingDepthMm ?? 0;
										const cal = calculateClinicalAttachmentLevel(
											pd,
											site.gingivalMarginMm ?? 0,
										);

										return (
											<button
												key={sKey}
												type="button"
												onClick={() => onFocusSite(selectedTooth.toothNumber, sKey)}
												className={`min-h-[56px] p-1.5 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
													isFocused
														? "ring-2 ring-teal-500 bg-teal-500/20 border-teal-500 shadow-md scale-[1.02]"
														: probingDepthClinicalClasses(pd)
												}`}
												data-testid={`perio-sensor-${sKey}`}
												title={SITE_NAME_FULL_RU[sKey]}
											>
												<div className="w-full flex items-center justify-between text-[10px] font-semibold text-[var(--muted)]">
													<span>{SITE_SHORT_RU[sKey]}</span>
													<span className="text-[9px]">CAL {cal}</span>
												</div>

												<span className="text-xl font-black font-mono leading-none my-0.5">
													{pd} <span className="text-xs font-normal">мм</span>
												</span>

												<div className="flex items-center gap-1">
													{site.bleedingOnProbing && (
														<span
															className="w-2 h-2 rounded-full bg-rose-500"
															title="Кровоточивость"
														/>
													)}
													{site.plaque && (
														<span
															className="w-2 h-2 rounded-full bg-amber-400"
															title="Налет"
														/>
													)}
													{site.suppuration && (
														<span
															className="w-2 h-2 rounded-full bg-indigo-500"
															title="Гной"
														/>
													)}
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Анатомическая схема зуба */}
							<div className="w-full py-1 flex items-center justify-center">
								<PerioToothVisual
									toothNumber={selectedTooth.toothNumber}
									isUpper={isUpper}
									isMissing={selectedTooth.isMissing}
									isImplant={selectedTooth.isImplant}
									buccalPd={selectedTooth.midBuccal?.probingDepthMm ?? 2}
									lingualPd={selectedTooth.midLingual?.probingDepthMm ?? 2}
								/>
							</div>

							{/* Оральная сторона */}
							<div className="flex flex-col gap-1 w-full">
								<span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
									Орально (язычная / нёбная сторона)
								</span>
								<div className="grid grid-cols-3 gap-1.5 w-full">
									{lingualSites.map((sKey) => {
										const site = selectedTooth[sKey] ?? {
											probingDepthMm: 2,
											gingivalMarginMm: 0,
											bleedingOnProbing: false,
											suppuration: false,
											plaque: false,
										};
										const isFocused =
											focusedSite?.toothNumber === selectedTooth.toothNumber &&
											focusedSite.siteKey === sKey;
										const pd = site.probingDepthMm ?? 0;
										const cal = calculateClinicalAttachmentLevel(
											pd,
											site.gingivalMarginMm ?? 0,
										);

										return (
											<button
												key={sKey}
												type="button"
												onClick={() => onFocusSite(selectedTooth.toothNumber, sKey)}
												className={`min-h-[56px] p-1.5 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
													isFocused
														? "ring-2 ring-teal-500 bg-teal-500/20 border-teal-500 shadow-md scale-[1.02]"
														: probingDepthClinicalClasses(pd)
												}`}
												data-testid={`perio-sensor-${sKey}`}
												title={SITE_NAME_FULL_RU[sKey]}
											>
												<div className="w-full flex items-center justify-between text-[10px] font-semibold text-[var(--muted)]">
													<span>{SITE_SHORT_RU[sKey]}</span>
													<span className="text-[9px]">CAL {cal}</span>
												</div>

												<span className="text-xl font-black font-mono leading-none my-0.5">
													{pd} <span className="text-xs font-normal">мм</span>
												</span>

												<div className="flex items-center gap-1">
													{site.bleedingOnProbing && (
														<span
															className="w-2 h-2 rounded-full bg-rose-500"
															title="Кровоточивость"
														/>
													)}
													{site.plaque && (
														<span
															className="w-2 h-2 rounded-full bg-amber-400"
															title="Налет"
														/>
													)}
													{site.suppuration && (
														<span
															className="w-2 h-2 rounded-full bg-indigo-500"
															title="Гной"
														/>
													)}
												</div>
											</button>
										);
									})}
								</div>
							</div>
						</div>
					) : (
						<div className="py-6 text-center text-xs text-[var(--muted)]">
							Зуб #{selectedTooth.toothNumber} отсутствует.
						</div>
					)}
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    5. СЕНСОРНЫЙ ПУЛЬТ ГЛУБИНЫ КАРМАНА В ЗОНЕ БОЛЬШОГО ПАЛЬЦА
			    ═══════════════════════════════════════════════════════════════════ */}
			<MobilePerioKeypadDial
				selectedToothNumber={selectedToothNumber}
				currentFocusedSiteKey={currentFocusedSiteKey}
				currentPd={currentPd}
				currentBop={currentBop}
				currentPlq={currentPlq}
				currentPus={currentPus}
				readOnly={readOnly}
				onKeypadDepth={onKeypadDepth}
				onToggleBop={onToggleBop}
				onTogglePlaque={onTogglePlaque}
				onToggleSuppuration={onToggleSuppuration}
				onPrevSite={onPrevSite}
				onNextSite={onNextSite}
				onSetToothNorm={() => {
					for (const key of PERIO_SITE_KEYS) {
						updateToothSite(selectedToothNumber, key, () => ({
							probingDepthMm: 2,
							gingivalMarginMm: 0,
							bleedingOnProbing: false,
							suppuration: false,
							plaque: false,
							calMm: 2,
						}));
					}
					updateToothProperties(selectedToothNumber, { mobility: 0, furcation: 0 });
				}}
				onSetToothPathology={(depth, hasBop) => {
					for (const key of PERIO_SITE_KEYS) {
						updateToothSite(selectedToothNumber, key, (prev) => ({
							probingDepthMm: depth,
							bleedingOnProbing: hasBop,
							calMm: calculateClinicalAttachmentLevel(depth, prev.gingivalMarginMm ?? 0),
						}));
					}
				}}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    6. ЕДИНАЯ PRIMARY CTA КНОПКА СОХРАНЕНИЯ ВНИЗУ ЭКРАНА (МАНДАТ 8am)
			    ═══════════════════════════════════════════════════════════════════ */}
			{onSaveDraft && (
				<div className="w-full pt-1 pb-2">
					<button
						type="button"
						onClick={onSaveDraft}
						disabled={syncStatus === "saving"}
						className="primary-button button-lg min-h-[48px] h-12 w-full font-bold shadow-md"
						data-testid="perio-mobile-save-primary-btn"
					>
						<Save size={18} className={syncStatus === "saving" ? "animate-spin text-white" : "text-white"} />
						<span>Сохранить периодонтограмму</span>
					</button>
				</div>
			)}
		</div>
	);
});

PerioMobileTouchCockpit.displayName = "PerioMobileTouchCockpit";
