/**
 * PeriodontalDetailedChart.tsx — Углубленная пародонтологическая карта по требованию
 * Разворачиваемая сетка зубов и 6 точек зондирования без процедурных симуляторов физики (Мандат 8e, 300–390 строк).
 */

import React, { useState, useMemo } from "react";
import { Check, ShieldAlert, Sparkles, ChevronRight, Activity } from "lucide-react";
import type { DetailedPerioTooth, PerioSiteDetail } from "./perioTypes";

export interface PeriodontalDetailedChartProps {
	readonly teeth: readonly DetailedPerioTooth[];
	readonly onUpdateTooth: (updated: DetailedPerioTooth) => void;
	readonly readOnly?: boolean | undefined;
	readonly defaultSelectedTooth?: number;
}

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

type SiteKey = "distoBuccal" | "midBuccal" | "mesioBuccal" | "distoLingual" | "midLingual" | "mesioLingual";

const SITES_META: { key: SiteKey; labelRu: string; shortRu: string }[] = [
	{ key: "distoBuccal", labelRu: "Дистально-вестибулярная", shortRu: "ДВ" },
	{ key: "midBuccal", labelRu: "Серединно-вестибулярная", shortRu: "СВ" },
	{ key: "mesioBuccal", labelRu: "Медиально-вестибулярная", shortRu: "МВ" },
	{ key: "distoLingual", labelRu: "Дистально-язычная / нёбная", shortRu: "ДЯ" },
	{ key: "midLingual", labelRu: "Серединно-язычная / нёбная", shortRu: "СЯ" },
	{ key: "mesioLingual", labelRu: "Медиально-язычная / нёбная", shortRu: "МЯ" },
];

export function createDefaultToothRecord(toothNumber: number): DetailedPerioTooth {
	const normalSite: PerioSiteDetail = {
		probingDepthMm: 2,
		gingivalMarginMm: 0,
		bleedingOnProbing: false,
		plaque: false,
		calculus: false,
		suppuration: false,
		calMm: 2,
	};
	return {
		toothNumber,
		isMissing: false,
		isImplant: false,
		mobility: 0,
		furcation: 0,
		distoBuccal: { ...normalSite },
		midBuccal: { ...normalSite },
		mesioBuccal: { ...normalSite },
		distoLingual: { ...normalSite },
		midLingual: { ...normalSite },
		mesioLingual: { ...normalSite },
	};
}

export const PeriodontalDetailedChart: React.FC<PeriodontalDetailedChartProps> = React.memo(({
	teeth,
	onUpdateTooth,
	readOnly = false,
	defaultSelectedTooth = 16,
}) => {
	const [selectedToothNum, setSelectedToothNum] = useState<number>(defaultSelectedTooth);

	const toothMap = useMemo(() => {
		const map = new Map<number, DetailedPerioTooth>();
		for (const t of teeth) {
			map.set(t.toothNumber, t);
		}
		return map;
	}, [teeth]);

	const selectedTooth = useMemo(() => {
		return toothMap.get(selectedToothNum) ?? createDefaultToothRecord(selectedToothNum);
	}, [toothMap, selectedToothNum]);

	const updateSelectedSite = (siteKey: SiteKey, updater: (prev: PerioSiteDetail) => Partial<PerioSiteDetail>) => {
		if (readOnly) return;
		const current = selectedTooth[siteKey];
		const patch = updater(current);
		const newDepth = patch.probingDepthMm !== undefined ? patch.probingDepthMm : current.probingDepthMm;
		const newGm = patch.gingivalMarginMm !== undefined ? patch.gingivalMarginMm : current.gingivalMarginMm;
		const updatedSite: PerioSiteDetail = {
			...current,
			...patch,
			calMm: Math.max(0, newDepth + newGm),
		};
		onUpdateTooth({
			...selectedTooth,
			[siteKey]: updatedSite,
		});
	};

	const setToothNorm = () => {
		if (readOnly) return;
		const normalSite: PerioSiteDetail = {
			probingDepthMm: 2,
			gingivalMarginMm: 0,
			bleedingOnProbing: false,
			plaque: false,
			calculus: false,
			suppuration: false,
			calMm: 2,
		};
		onUpdateTooth({
			...selectedTooth,
			mobility: 0,
			furcation: 0,
			distoBuccal: { ...normalSite },
			midBuccal: { ...normalSite },
			mesioBuccal: { ...normalSite },
			distoLingual: { ...normalSite },
			midLingual: { ...normalSite },
			mesioLingual: { ...normalSite },
		});
	};

	const setToothPathology = () => {
		if (readOnly) return;
		const pathSite: PerioSiteDetail = {
			probingDepthMm: 5,
			gingivalMarginMm: 1,
			bleedingOnProbing: true,
			plaque: true,
			calculus: true,
			suppuration: false,
			calMm: 6,
		};
		onUpdateTooth({
			...selectedTooth,
			mobility: 1,
			distoBuccal: { ...pathSite },
			midBuccal: { ...pathSite, probingDepthMm: 6, calMm: 7 },
			mesioBuccal: { ...pathSite },
			distoLingual: { ...pathSite },
			midLingual: { ...pathSite },
			mesioLingual: { ...pathSite },
		});
	};

	const renderToothButton = (num: number) => {
		const t = toothMap.get(num) ?? createDefaultToothRecord(num);
		const isSelected = selectedToothNum === num;

		let maxDepth = 0;
		let hasBop = false;
		for (const key of SITES_META) {
			const s = t[key.key];
			if (s.probingDepthMm > maxDepth) maxDepth = s.probingDepthMm;
			if (s.bleedingOnProbing) hasBop = true;
		}

		const isPathologic = maxDepth >= 4;
		const isSevere = maxDepth >= 6;

		return (
			<button
				key={num}
				type="button"
				onClick={() => setSelectedToothNum(num)}
				className={`w-9 sm:w-10 h-12 rounded-lg flex flex-col items-center justify-between p-1 transition-all cursor-pointer border text-center ${
					isSelected
						? "bg-teal-500/20 border-teal-500 font-bold ring-2 ring-teal-500/40 scale-105 z-10"
						: isSevere
							? "bg-rose-500/15 border-rose-500/40 text-[var(--ink)]"
							: isPathologic
								? "bg-amber-500/15 border-amber-500/40 text-[var(--ink)]"
								: t.isMissing
									? "bg-[var(--paper-soft)] border-dashed border-[var(--line)] text-[var(--muted)] opacity-50"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-teal-500/50"
				}`}
				data-testid={`perio-tooth-btn-${num}`}
			>
				<span className="text-[11px] font-mono leading-none">{num}</span>
				<span className="text-[10px] font-bold leading-none">
					{t.isMissing ? "—" : `${maxDepth}`}
				</span>
				<div className="flex items-center gap-0.5 h-1.5">
					{hasBop && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
					{t.mobility > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
				</div>
			</button>
		);
	};

	return (
		<div className="flex flex-col gap-4 p-3 sm:p-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs w-full">
			{/* Шапка углубленной карты */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2">
					<Activity className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
					<div>
						<h3 className="text-sm font-bold text-[var(--ink)] leading-tight">
							Детальная пародонтологическая сетка (6 точек зондирования)
						</h3>
						<p className="text-xs text-[var(--muted)]">
							Углубленный замер параметров для зубов с выявленной патологией
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={setToothNorm}
						disabled={readOnly}
						className="h-8 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1.5 border border-emerald-500/30 cursor-pointer"
						title="Сбросить выбранный зуб в норму (2 мм, без BOP)"
					>
						<Check className="w-3.5 h-3.5" />
						Зуб в норму
					</button>

					<button
						type="button"
						onClick={setToothPathology}
						disabled={readOnly}
						className="h-8 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5 border border-rose-500/30 cursor-pointer"
						title="Выставить карманы 5–6 мм с кровоточивостью"
					>
						<ShieldAlert className="w-3.5 h-3.5" />
						Карман 5 мм
					</button>
				</div>
			</div>

			{/* Сетка зубов (Верхняя и нижняя дуги) */}
			<div className="flex flex-col gap-2 overflow-x-auto pb-1">
				<div className="flex items-center justify-center gap-1 min-w-[620px]">
					{UPPER_TEETH.map(renderToothButton)}
				</div>
				<div className="h-px bg-[var(--line)] my-0.5" />
				<div className="flex items-center justify-center gap-1 min-w-[620px]">
					{LOWER_TEETH.map(renderToothButton)}
				</div>
			</div>

			{/* Инспектор выбранного зуба */}
			<div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<span className="font-mono font-black text-sm px-2.5 py-1 rounded bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]">
							Зуб {selectedTooth.toothNumber}
						</span>
						<label className="flex items-center gap-1.5 text-xs text-[var(--ink)] cursor-pointer select-none">
							<input
								type="checkbox"
								checked={selectedTooth.isMissing}
								disabled={readOnly}
								onChange={(e) => onUpdateTooth({ ...selectedTooth, isMissing: e.target.checked })}
								className="rounded border-[var(--line)]"
							/>
							Отсутствует
						</label>
						<label className="flex items-center gap-1.5 text-xs text-[var(--ink)] cursor-pointer select-none">
							<input
								type="checkbox"
								checked={selectedTooth.isImplant}
								disabled={readOnly}
								onChange={(e) => onUpdateTooth({ ...selectedTooth, isImplant: e.target.checked })}
								className="rounded border-[var(--line)]"
							/>
							Имплант
						</label>
					</div>

					<div className="flex items-center gap-3 text-xs text-[var(--muted)]">
						<div className="flex items-center gap-1">
							<span>Подвижность:</span>
							{([0, 1, 2, 3] as const).map((m) => (
								<button
									key={m}
									type="button"
									disabled={readOnly}
									onClick={() => onUpdateTooth({ ...selectedTooth, mobility: m })}
									className={`w-6 h-6 rounded text-xs font-bold transition-all ${
										selectedTooth.mobility === m
											? "bg-amber-500 text-white font-black"
											: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
									}`}
								>
									{m === 0 ? "0" : m === 1 ? "I" : m === 2 ? "II" : "III"}
								</button>
							))}
						</div>

						<div className="flex items-center gap-1">
							<span>Фуркация:</span>
							{([0, 1, 2, 3] as const).map((f) => (
								<button
									key={f}
									type="button"
									disabled={readOnly}
									onClick={() => onUpdateTooth({ ...selectedTooth, furcation: f })}
									className={`w-6 h-6 rounded text-xs font-bold transition-all ${
										selectedTooth.furcation === f
											? "bg-rose-500 text-white font-black"
											: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
									}`}
								>
									{f === 0 ? "0" : f === 1 ? "I" : f === 2 ? "II" : "III"}
								</button>
							))}
						</div>
					</div>
				</div>

				{/* 6 точек зондирования */}
				{!selectedTooth.isMissing ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
						{SITES_META.map(({ key, labelRu, shortRu }) => {
							const site = selectedTooth[key];
							const isDeep = site.probingDepthMm >= 4;
							const isSevere = site.probingDepthMm >= 6;

							return (
								<div
									key={key}
									className={`p-2.5 rounded-lg border flex flex-col gap-1.5 transition-all ${
										isSevere
											? "bg-rose-500/10 border-rose-500/40"
											: isDeep
												? "bg-amber-500/10 border-amber-500/40"
												: "bg-[var(--paper)] border-[var(--line)]"
									}`}
								>
									<div className="flex items-center justify-between">
										<span className="font-semibold text-xs text-[var(--ink)] truncate">
											<span className="font-mono text-teal-600 dark:text-teal-400 font-bold mr-1">
												{shortRu}
											</span>
											{labelRu}
										</span>
										<span className="font-mono text-[11px] text-[var(--muted)]">
											CAL: {site.calMm} мм
										</span>
									</div>

									<div className="flex items-center justify-between gap-2">
										<div className="flex items-center gap-1.5">
											<span className="text-xs text-[var(--muted)]">Глубина:</span>
											<input
												type="number"
												min={0}
												max={15}
												value={site.probingDepthMm}
												disabled={readOnly}
												onChange={(e) => updateSelectedSite(key, () => ({ probingDepthMm: Number(e.target.value) || 0 }))}
												className="w-14 h-7 text-center rounded bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-mono font-bold text-[var(--ink)] focus:outline-teal-500"
											/>
											<span className="text-[11px] text-[var(--muted)]">мм</span>
										</div>

										<div className="flex items-center gap-1">
											<button
												type="button"
												disabled={readOnly}
												onClick={() => updateSelectedSite(key, (s) => ({ bleedingOnProbing: !s.bleedingOnProbing }))}
												className={`h-7 px-2 rounded text-[11px] font-bold transition-all cursor-pointer border ${
													site.bleedingOnProbing
														? "bg-rose-500 text-white border-rose-600"
														: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
												}`}
												title="Кровоточивость при зондировании (BOP)"
											>
												BOP
											</button>

											<button
												type="button"
												disabled={readOnly}
												onClick={() => updateSelectedSite(key, (s) => ({ calculus: !s.calculus }))}
												className={`h-7 px-2 rounded text-[11px] font-bold transition-all cursor-pointer border ${
													site.calculus
														? "bg-sky-500 text-white border-sky-600"
														: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
												}`}
												title="Зубной камень"
											>
												Камень
											</button>

											<button
												type="button"
												disabled={readOnly}
												onClick={() => updateSelectedSite(key, (s) => ({ plaque: !s.plaque }))}
												className={`h-7 px-2 rounded text-[11px] font-bold transition-all cursor-pointer border ${
													site.plaque
														? "bg-amber-500 text-white border-amber-600"
														: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
												}`}
												title="Зубной налёт"
											>
												Налёт
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<p className="text-xs text-[var(--muted)] italic py-2">
						Зуб отмечен как отсутствующий (зондирование не проводится).
					</p>
				)}
			</div>
		</div>
	);
});

PeriodontalDetailedChart.displayName = "PeriodontalDetailedChart";
