import {
	calculateClinicalAttachmentLevel,
	FURCATION_GRADES,
	isFurcationEligibleTooth,
	MOBILITY_GRADES,
	PERIO_SITE_KEYS,
	PERIO_SITES_CONFIG,
	type PerioSiteKey,
	type PerioToothRecord,
} from "@dental/shared";
import { Check } from "lucide-react";
import React from "react";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols043";
import { probingDepthTone } from "../perioHeatmap";

export interface PerioToothInspectorProps {
	readonly selectedTooth: PerioToothRecord | null;
	readonly readOnly?: boolean | undefined;
	readonly onUpdateToothProperties: (
		toothNumber: number,
		patch: Partial<
			Pick<
				PerioToothRecord,
				"isMissing" | "isImplant" | "mobility" | "furcation"
			>
		>,
	) => void;
	readonly onUpdateToothSite: (
		toothNumber: number,
		siteKey: PerioSiteKey,
		updater: (
			prev: PerioToothRecord[PerioSiteKey],
		) => Partial<PerioToothRecord[PerioSiteKey]>,
	) => void;
}

export const PerioToothInspector: React.FC<PerioToothInspectorProps> = React.memo(({
	selectedTooth,
	readOnly = false,
	onUpdateToothProperties,
	onUpdateToothSite,
}) => {
	if (!selectedTooth) return null;

	return (
		<div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3 min-w-0">
			<div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 min-w-0">
					<span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 font-black text-sm flex items-center justify-center border border-teal-500/30 shrink-0">
						{selectedTooth.toothNumber}
					</span>
					<div className="min-w-0">
						<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
							{getToothFolkAndAnatomicalNameRu(selectedTooth.toothNumber)}
						</h4>
						<span className="text-[10px] text-[var(--muted)] truncate block">
							{selectedTooth.isMissing
								? "Зуб отсутствует (адентия/удален)"
								: selectedTooth.isImplant
									? "Дентальный имплантат"
									: "Естественный зуб"}
						</span>
					</div>
				</div>

				{/* Quick Toggles */}
				{!readOnly && (
					<div className="flex items-center gap-2 flex-wrap text-xs">
						<button
							type="button"
							onClick={() =>
								onUpdateToothProperties(selectedTooth.toothNumber, {
									isMissing: !selectedTooth.isMissing,
								})
							}
							className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all touch-manipulation flex items-center gap-1.5 ${
								selectedTooth.isMissing
									? "bg-[var(--line-strong)] text-[var(--ink)] border-[var(--line)]"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<span>
								{selectedTooth.isMissing
									? "Отсутствует"
									: "Отметить отсутствующим"}
							</span>
							{selectedTooth.isMissing && (
								<Check size={14} className="text-[var(--ink)]" />
							)}
						</button>

						<button
							type="button"
							onClick={() =>
								onUpdateToothProperties(selectedTooth.toothNumber, {
									isImplant: !selectedTooth.isImplant,
								})
							}
							className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all touch-manipulation flex items-center gap-1.5 ${
								selectedTooth.isImplant
									? "bg-amber-500/20 text-amber-300 border-amber-500/40"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<span>Имплантат</span>
							{selectedTooth.isImplant && (
								<Check size={14} className="text-amber-300" />
							)}
						</button>

						{/* Mobility Selector (Miller 0..III) */}
						<div className="flex items-center gap-1 bg-[var(--paper)] px-2 py-1 rounded-lg border border-[var(--line)]">
							<span
								className="text-[11px] text-[var(--muted)]"
								title="Классификация подвижности зубов по Miller (Миллеру): 0 (норма), I (до 1 мм), II (> 1 мм), III (выраженная + вертикальная подвижность)"
							>
								Подвижность (Miller):
							</span>
							{([0, 1, 2, 3] as const).map((grade) => (
								<button
									key={grade}
									type="button"
									onClick={() =>
										onUpdateToothProperties(selectedTooth.toothNumber, {
											mobility: grade,
										})
									}
									className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
										selectedTooth.mobility === grade
											? "bg-teal-500 text-slate-950 font-black"
											: "text-[var(--muted)] hover:text-[var(--ink)]"
									}`}
									title={`Подвижность по Miller (Миллеру): ${MOBILITY_GRADES[grade]?.nameRu ?? grade}`}
									data-testid={`inspector-mobility-${grade}`}
								>
									{grade === 0 ? "0" : MOBILITY_GRADES[grade]?.codeRu}
								</button>
							))}
						</div>

						{/* Furcation Selector (Hamp I..IV for multi-rooted) */}
						{isFurcationEligibleTooth(selectedTooth.toothNumber) && (
							<div className="flex items-center gap-1 bg-[var(--paper)] px-2 py-1 rounded-lg border border-[var(--line)]">
								<span
									className="text-[11px] text-[var(--muted)]"
									title="Классификация фуркационных дефектов по Hamp (Хэмпу): 0 (норма), I (до 3 мм), II (> 3 мм не насквозь), III (сквозной дефект), IV (сквозной с рецессией десны)"
								>
									Фуркация (Hamp):
								</span>
								{([0, 1, 2, 3, 4] as const).map((grade) => (
									<button
										key={grade}
										type="button"
										onClick={() =>
											onUpdateToothProperties(selectedTooth.toothNumber, {
												furcation: grade,
											})
										}
										className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
											selectedTooth.furcation === grade
												? "bg-rose-500 text-white font-black"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
										title={`Фуркационный дефект по Hamp (Хэмпу): ${FURCATION_GRADES[grade]?.nameRu ?? grade}`}
										data-testid={`inspector-furcation-${grade}`}
									>
										{grade === 0 ? "0" : FURCATION_GRADES[grade]?.codeRu}
									</button>
								))}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Express Pathology Focus for Selected Tooth (Mandates 8e, 8k: Fast Single-Tooth Focus) */}
			{!readOnly && !selectedTooth.isMissing && (
				<div className="flex items-center gap-1.5 flex-wrap pt-2 pb-1 border-t border-[var(--line)]">
					<span className="text-[11px] font-bold text-[var(--muted)] shrink-0">
						Фокус патологии зуба #{selectedTooth.toothNumber}:
					</span>

					{/* 1-Tap Reset Tooth to Norm */}
					<button
						type="button"
						onClick={() => {
							for (const key of PERIO_SITE_KEYS) {
								onUpdateToothSite(selectedTooth.toothNumber, key, () => ({
									probingDepthMm: 2,
									gingivalMarginMm: 0,
									bleedingOnProbing: false,
									suppuration: false,
									plaque: false,
									calculus: false,
									calMm: 2,
								}));
							}
							onUpdateToothProperties(selectedTooth.toothNumber, { mobility: 0, furcation: 0 });
						}}
						className="min-h-[36px] sm:min-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer transition-all flex items-center gap-1"
						title="Сбросить выбранный зуб в норму (глубина 2 мм, BOP 0, подвижность 0)"
						data-testid="inspector-reset-tooth-norm"
					>
						<Check size={12} />
						<span>Интактен (2 мм)</span>
					</button>

					{/* 1-Tap Pocket 4mm */}
					<button
						type="button"
						onClick={() => {
							for (const key of PERIO_SITE_KEYS) {
								onUpdateToothSite(selectedTooth.toothNumber, key, (prev) => ({
									probingDepthMm: 4,
									bleedingOnProbing: true,
									calMm: calculateClinicalAttachmentLevel(4, prev.gingivalMarginMm ?? 0),
								}));
							}
						}}
						className="min-h-[36px] sm:min-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 cursor-pointer transition-all"
						title="Установить карманы 4 мм + BOP на выбранном зубе"
						data-testid="inspector-focus-pocket-4mm"
					>
						Карман 4 мм (BOP+)
					</button>

					{/* 1-Tap Pocket 5mm */}
					<button
						type="button"
						onClick={() => {
							for (const key of PERIO_SITE_KEYS) {
								onUpdateToothSite(selectedTooth.toothNumber, key, (prev) => ({
									probingDepthMm: 5,
									bleedingOnProbing: true,
									calculus: true,
									calMm: calculateClinicalAttachmentLevel(5, prev.gingivalMarginMm ?? 0),
								}));
							}
						}}
						className="min-h-[36px] sm:min-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-500/15 hover:bg-orange-500/25 text-orange-800 dark:text-orange-300 border border-orange-500/30 cursor-pointer transition-all"
						title="Установить карманы 5 мм + зубной камень + BOP на выбранном зубе"
						data-testid="inspector-focus-pocket-5mm"
					>
						Карман 5 мм + BOP
					</button>

					{/* 1-Tap Pocket >= 6mm with Suppuration */}
					<button
						type="button"
						onClick={() => {
							for (const key of PERIO_SITE_KEYS) {
								onUpdateToothSite(selectedTooth.toothNumber, key, (prev) => ({
									probingDepthMm: 7,
									bleedingOnProbing: true,
									suppuration: true,
									calculus: true,
									calMm: calculateClinicalAttachmentLevel(7, prev.gingivalMarginMm ?? 0),
								}));
							}
							onUpdateToothProperties(selectedTooth.toothNumber, { mobility: 2 });
						}}
						className="min-h-[36px] sm:min-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-300 border border-rose-500/30 cursor-pointer transition-all"
						title="Установить глубокие карманы 7 мм + гноетечение + подвижность II ст."
						data-testid="inspector-focus-pocket-severe"
					>
						Карман &ge; 6 мм (Гной)
					</button>

					{/* 1-Tap Gingival Margin Recession +2mm */}
					<button
						type="button"
						onClick={() => {
							for (const key of ["distoBuccal", "midBuccal", "mesioBuccal"] as const) {
								onUpdateToothSite(selectedTooth.toothNumber, key, (prev) => {
									const pd = prev.probingDepthMm ?? 2;
									return {
										gingivalMarginMm: 2,
										calMm: calculateClinicalAttachmentLevel(pd, 2),
									};
								});
							}
						}}
						className="min-h-[36px] sm:min-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-800 dark:text-purple-300 border border-purple-500/30 cursor-pointer transition-all"
						title="Установить рецессию десны +2 мм по вестибулярной поверхности"
						data-testid="inspector-focus-recession-2mm"
					>
						Рецессия +2 мм (GM)
					</button>
				</div>
			)}

			{/* 6 Sites Granular Controls */}
			{!selectedTooth.isMissing && (
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
					{PERIO_SITES_CONFIG.map((siteCfg) => {
						const site = selectedTooth[siteCfg.key] ?? {
							probingDepthMm: 2,
							gingivalMarginMm: 0,
							bleedingOnProbing: false,
							suppuration: false,
							plaque: false,
							calculus: false,
						};
						const pd = site.probingDepthMm ?? 0;
						const gm = site.gingivalMarginMm ?? 0;
						const cal = calculateClinicalAttachmentLevel(pd, gm);

						return (
							<div
								key={siteCfg.key}
								className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1.5"
							>
								<div className="flex items-center justify-between text-[11px] font-bold text-teal-400">
									<span>{siteCfg.shortKey}</span>
									<span className="text-[10px] text-[var(--muted)] font-normal">
										CAL: {cal} мм
									</span>
								</div>

								{/* Probing Depth Stepper */}
								<div className="flex items-center justify-between text-xs">
									<span className="text-[10px] text-[var(--muted)]">
										PD (глубина):
									</span>
									<div className="flex items-center gap-1">
										{!readOnly && (
											<button
												type="button"
												onClick={() =>
													onUpdateToothSite(
														selectedTooth.toothNumber,
														siteCfg.key,
														(prev) => ({
															probingDepthMm: Math.max(
																0,
																(prev.probingDepthMm ?? 0) - 1,
															),
														}),
													)
												}
												className="w-5 h-5 rounded bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer"
											>
												-
											</button>
										)}
										<span
											className={`w-6 text-center font-mono font-bold ${
												probingDepthTone(pd) === "success"
													? "text-emerald-400"
													: probingDepthTone(pd) === "warning-low"
														? "text-amber-400"
														: probingDepthTone(pd) === "warning-high"
															? "text-orange-400"
															: "text-rose-400"
											}`}
										>
											{pd}
										</span>
										{!readOnly && (
											<button
												type="button"
												onClick={() =>
													onUpdateToothSite(
														selectedTooth.toothNumber,
														siteCfg.key,
														(prev) => ({
															probingDepthMm: Math.min(
																15,
																(prev.probingDepthMm ?? 0) + 1,
															),
														}),
													)
												}
												className="w-5 h-5 rounded bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer"
											>
												+
											</button>
										)}
									</div>
								</div>

								{/* Gingival Margin Stepper */}
								<div className="flex items-center justify-between text-xs">
									<span className="text-[10px] text-[var(--muted)]">
										GM (десна):
									</span>
									<div className="flex items-center gap-1">
										{!readOnly && (
											<button
												type="button"
												onClick={() =>
													onUpdateToothSite(
														selectedTooth.toothNumber,
														siteCfg.key,
														(prev) => ({
															gingivalMarginMm:
																(prev.gingivalMarginMm ?? 0) - 1,
														}),
													)
												}
												className="w-5 h-5 rounded bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer"
											>
												-
											</button>
										)}
										<span className="w-6 text-center font-mono text-[11px] text-[var(--ink)]">
											{gm > 0 ? `+${gm}` : gm}
										</span>
										{!readOnly && (
											<button
												type="button"
												onClick={() =>
													onUpdateToothSite(
														selectedTooth.toothNumber,
														siteCfg.key,
														(prev) => ({
															gingivalMarginMm:
																(prev.gingivalMarginMm ?? 0) + 1,
														}),
													)
												}
												className="w-5 h-5 rounded bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer"
											>
												+
											</button>
										)}
									</div>
								</div>

								{/* Toggles (BOP, Plaque, Suppuration) */}
								<div className="flex items-center justify-between pt-1 border-t border-[var(--line)] gap-1">
									<button
										type="button"
										disabled={readOnly}
										onClick={() =>
											onUpdateToothSite(
												selectedTooth.toothNumber,
												siteCfg.key,
												(prev) => ({
													bleedingOnProbing: !prev.bleedingOnProbing,
												}),
											)
										}
										className={`flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-all ${
											site.bleedingOnProbing
												? "bg-rose-500 text-white"
												: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
										}`}
										title="Кровоточивость при зондировании (BOP)"
									>
										BOP
									</button>

									<button
										type="button"
										disabled={readOnly}
										onClick={() =>
											onUpdateToothSite(
												selectedTooth.toothNumber,
												siteCfg.key,
												(prev) => ({
													plaque: !prev.plaque,
												}),
											)
										}
										className={`flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-all ${
											site.plaque
												? "bg-amber-500 text-slate-950 font-black"
												: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
										}`}
										title="Зубной налет (Plaque / Биопленка)"
									>
										PLQ
									</button>

									<button
										type="button"
										disabled={readOnly}
										onClick={() =>
											onUpdateToothSite(
												selectedTooth.toothNumber,
												siteCfg.key,
												(prev) => ({
													suppuration: !prev.suppuration,
												}),
											)
										}
										className={`flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-all ${
											site.suppuration
												? "bg-indigo-500 text-white"
												: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
										}`}
										title="Нагноение из кармана (Suppuration / PUS)"
									>
										PUS
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
});

PerioToothInspector.displayName = "PerioToothInspector";
