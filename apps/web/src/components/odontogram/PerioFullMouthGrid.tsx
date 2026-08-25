import React from "react";
import {
	calculateClinicalAttachmentLevel,
	type PerioToothRecord,
} from "@dental/shared";
import {
	Activity,
	Layers,
} from "lucide-react";
import {
	FURCATION_GRADES,
	getProbingDepthColor,
	isMultiRootedTooth,
	MOBILITY_GRADES,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_UPPER_ARCH_TEETH,
	type PerioSiteKey,
} from "./perioTypes";

interface PerioFullMouthGridProps {
	teeth: PerioToothRecord[];
	activeArch: "upper" | "lower";
	activeToothNumber: number;
	activeSiteKey: PerioSiteKey;
	onSelectToothAndSite: (toothNumber: number, siteKey: PerioSiteKey) => void;
}

export const PerioFullMouthGrid: React.FC<PerioFullMouthGridProps> = ({
	teeth,
	activeArch,
	activeToothNumber,
	activeSiteKey,
	onSelectToothAndSite,
}) => {
	const teethNumbers = activeArch === "upper" ? PERIO_UPPER_ARCH_TEETH : PERIO_LOWER_ARCH_TEETH;
	const teethMap = new Map<number, PerioToothRecord>();
	for (const t of teeth) {
		teethMap.set(t.toothNumber, t);
	}

	const renderProbingDepthCell = (
		toothNum: number,
		siteKey: PerioSiteKey,
		short: string,
	) => {
		const tooth = teethMap.get(toothNum);
		if (!tooth || tooth.isMissing) {
			return (
				<td
					key={`${toothNum}-${siteKey}`}
					className="p-1.5 text-center text-slate-400 dark:text-slate-600 bg-slate-100/50 dark:bg-slate-800/30 text-xs"
				>
					—
				</td>
			);
		}

		const site = tooth[siteKey];
		const isSelected = activeToothNumber === toothNum && activeSiteKey === siteKey;
		const color = getProbingDepthColor(site.probingDepthMm);
		const cal = calculateClinicalAttachmentLevel(site.probingDepthMm, site.gingivalMarginMm);

		return (
			<td
				key={`${toothNum}-${siteKey}`}
				onClick={() => onSelectToothAndSite(toothNum, siteKey)}
				className={`p-1.5 text-center font-mono cursor-pointer transition-all border-r border-slate-200 dark:border-slate-800 relative select-none ${
					isSelected
						? "bg-[var(--teal-soft,rgba(13,148,136,0.25))] ring-2 ring-[var(--teal)] font-black scale-105 z-10 text-[var(--teal)]"
						: `${color.bgColor} hover:bg-slate-200/80 dark:hover:bg-slate-700/80`
				}`}
				title={`Зуб ${toothNum} (${short}): PD=${site.probingDepthMm}мм, GM=${site.gingivalMarginMm}мм, CAL=${cal}мм`}
			>
				<div className="flex items-center justify-center gap-1">
					<span className={`text-xs font-black ${color.textColor}`}>
						{site.probingDepthMm}
					</span>
					{site.bleedingOnProbing && (
						<span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
					)}
					{site.suppuration && (
						<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
					)}
				</div>
			</td>
		);
	};

	return (
		<div className="perio-full-mouth-grid overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs scrollbar-thin">
			<table className="w-full text-left border-collapse min-w-[780px]">
				<thead>
					{/* Tooth Numbers Header Row */}
					<tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
						<th className="p-2.5 text-xs font-bold w-32 sticky left-0 bg-slate-100 dark:bg-slate-800/95 z-20">
							Параметр / Зуб
						</th>
						{teethNumbers.map((num) => {
							const isSelected = activeToothNumber === num;
							const tooth = teethMap.get(num);
							return (
								<th
									key={num}
									colSpan={3}
									onClick={() => onSelectToothAndSite(num, "midBuccal")}
									className={`min-h-[44px] p-2 text-center font-mono text-xs font-black cursor-pointer border-r border-slate-200 dark:border-slate-700 ${
										isSelected
											? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-xs"
											: tooth?.isMissing
												? "opacity-40"
												: "hover:bg-slate-200 dark:hover:bg-slate-700"
									}`}
								>
									#{num}
								</th>
							);
						})}
					</tr>
				</thead>

				<tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
					{/* Mobility Row */}
					<tr className="bg-slate-50/50 dark:bg-slate-800/30">
						<td className="p-2 font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 flex items-center gap-1.5 text-xs">
							<Activity className="w-4 h-4 text-indigo-500" />
							Подвижность
						</td>
						{teethNumbers.map((num) => {
							const t = teethMap.get(num);
							const mob = t?.mobility || 0;
							const detail = MOBILITY_GRADES[mob];
							return (
								<td
									key={num}
									colSpan={3}
									className="p-1.5 text-center border-r border-slate-200 dark:border-slate-800 text-xs font-black"
								>
									{mob > 0 && detail ? (
										<span
											className="px-2 py-0.5 rounded text-xs font-black"
											style={{ backgroundColor: detail.badgeBg, color: detail.badgeColor }}
										>
											{detail.codeRu}
										</span>
									) : (
										<span className="text-slate-400 dark:text-slate-600">—</span>
									)}
								</td>
							);
						})}
					</tr>

					{/* Furcation Row */}
					<tr className="bg-slate-50/50 dark:bg-slate-800/30">
						<td className="p-2 font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 flex items-center gap-1.5 text-xs">
							<Layers className="w-4 h-4 text-amber-500" />
							Фуркация
						</td>
						{teethNumbers.map((num) => {
							const t = teethMap.get(num);
							const furc = t?.furcation || 0;
							const isMulti = isMultiRootedTooth(num);
							const detail = FURCATION_GRADES[furc];
							return (
								<td
									key={num}
									colSpan={3}
									className="p-1.5 text-center border-r border-slate-200 dark:border-slate-800 text-xs font-black"
								>
									{isMulti ? (
										furc > 0 && detail ? (
											<span
												className="px-2 py-0.5 rounded text-xs font-black"
												style={{ backgroundColor: detail.badgeBg, color: detail.badgeColor }}
											>
												{detail.symbol} {detail.codeRu}
											</span>
										) : (
											<span className="text-slate-400 dark:text-slate-600">0</span>
										)
									) : (
										<span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
									)}
								</td>
							);
						})}
					</tr>

					{/* Buccal / Vestibular Subheading */}
					<tr className="bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 font-bold text-xs">
						<td colSpan={1 + teethNumbers.length * 3} className="px-3 py-1.5">
							ВЕСТИБУЛЯРНЫЙ АСПЕКТ (Щёчно / Buccal) — DB | B | MB
						</td>
					</tr>

					{/* Buccal Probing Depths (DB, B, MB) */}
					<tr>
						<td className="p-2 font-bold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-900 z-10 text-xs">
							Зондирование PD (мм)
						</td>
						{teethNumbers.map((num) => (
							<React.Fragment key={num}>
								{renderProbingDepthCell(num, "distoBuccal", "DB")}
								{renderProbingDepthCell(num, "midBuccal", "B")}
								{renderProbingDepthCell(num, "mesioBuccal", "MB")}
							</React.Fragment>
						))}
					</tr>

					{/* Buccal Gingival Margin (GM) */}
					<tr className="bg-slate-50/30 dark:bg-slate-800/20">
						<td className="p-2 font-semibold text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 text-xs">
							Рецессия GM (мм)
						</td>
						{teethNumbers.map((num) => {
							const t = teethMap.get(num);
							return (
								<React.Fragment key={num}>
									<td className="p-1.5 text-center font-mono text-xs text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 font-medium">
										{t && !t.isMissing ? t.distoBuccal.gingivalMarginMm : "—"}
									</td>
									<td className="p-1.5 text-center font-mono text-xs text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 font-medium">
										{t && !t.isMissing ? t.midBuccal.gingivalMarginMm : "—"}
									</td>
									<td className="p-1.5 text-center font-mono text-xs text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 font-medium">
										{t && !t.isMissing ? t.mesioBuccal.gingivalMarginMm : "—"}
									</td>
								</React.Fragment>
							);
						})}
					</tr>

					{/* Buccal Clinical Attachment Level (CAL) */}
					<tr className="bg-[var(--teal-soft,rgba(13,148,136,0.1))] font-bold">
						<td className="p-2 font-bold text-[var(--teal)] sticky left-0 bg-[var(--paper,#ffffff)] z-10 text-xs">
							Потеря CAL (мм)
						</td>
						{teethNumbers.map((num) => {
							const t = teethMap.get(num);
							return (
								<React.Fragment key={num}>
									<td className="p-1.5 text-center font-mono text-xs text-[var(--teal)] border-r border-slate-200 dark:border-slate-800 font-black">
										{t && !t.isMissing
											? calculateClinicalAttachmentLevel(
													t.distoBuccal.probingDepthMm,
													t.distoBuccal.gingivalMarginMm,
												)
											: "—"}
									</td>
									<td className="p-1.5 text-center font-mono text-xs text-[var(--teal)] border-r border-slate-200 dark:border-slate-800 font-black">
										{t && !t.isMissing
											? calculateClinicalAttachmentLevel(
													t.midBuccal.probingDepthMm,
													t.midBuccal.gingivalMarginMm,
												)
											: "—"}
									</td>
									<td className="p-1.5 text-center font-mono text-xs text-[var(--teal)] border-r border-slate-200 dark:border-slate-800 font-black">
										{t && !t.isMissing
											? calculateClinicalAttachmentLevel(
													t.mesioBuccal.probingDepthMm,
													t.mesioBuccal.gingivalMarginMm,
												)
											: "—"}
									</td>
								</React.Fragment>
							);
						})}
					</tr>

					{/* Lingual / Palatal Subheading */}
					<tr className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 font-bold text-xs">
						<td colSpan={1 + teethNumbers.length * 3} className="px-3 py-1.5">
							ОРАЛЬНЫЙ АСПЕКТ (Язычно / Нёбно / Lingual) — DL | L | ML
						</td>
					</tr>

					{/* Lingual Probing Depths (DL, L, ML) */}
					<tr>
						<td className="p-2 font-bold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-900 z-10 text-xs">
							Зондирование PD (мм)
						</td>
						{teethNumbers.map((num) => (
							<React.Fragment key={num}>
								{renderProbingDepthCell(num, "distoLingual", "DL")}
								{renderProbingDepthCell(num, "midLingual", "L")}
								{renderProbingDepthCell(num, "mesioLingual", "ML")}
							</React.Fragment>
						))}
					</tr>

					{/* Lingual Gingival Margin (GM) */}
					<tr className="bg-slate-50/30 dark:bg-slate-800/20">
						<td className="p-2 font-semibold text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 text-xs">
							Рецессия GM (мм)
						</td>
						{teethNumbers.map((num) => {
							const t = teethMap.get(num);
							return (
								<React.Fragment key={num}>
									<td className="p-1.5 text-center font-mono text-xs text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 font-medium">
										{t && !t.isMissing ? t.distoLingual.gingivalMarginMm : "—"}
									</td>
									<td className="p-1.5 text-center font-mono text-xs text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 font-medium">
										{t && !t.isMissing ? t.midLingual.gingivalMarginMm : "—"}
									</td>
									<td className="p-1.5 text-center font-mono text-xs text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 font-medium">
										{t && !t.isMissing ? t.mesioLingual.gingivalMarginMm : "—"}
									</td>
								</React.Fragment>
							);
						})}
					</tr>

					{/* Lingual Clinical Attachment Level (CAL) */}
					<tr className="bg-[var(--teal-soft,rgba(13,148,136,0.1))] font-bold">
						<td className="p-2 font-bold text-[var(--teal)] sticky left-0 bg-[var(--paper,#ffffff)] z-10 text-xs">
							Потеря CAL (мм)
						</td>
						{teethNumbers.map((num) => {
							const t = teethMap.get(num);
							return (
								<React.Fragment key={num}>
									<td className="p-1.5 text-center font-mono text-xs text-[var(--teal)] border-r border-slate-200 dark:border-slate-800 font-black">
										{t && !t.isMissing
											? calculateClinicalAttachmentLevel(
													t.distoLingual.probingDepthMm,
													t.distoLingual.gingivalMarginMm,
												)
											: "—"}
									</td>
									<td className="p-1.5 text-center font-mono text-xs text-[var(--teal)] border-r border-slate-200 dark:border-slate-800 font-black">
										{t && !t.isMissing
											? calculateClinicalAttachmentLevel(
													t.midLingual.probingDepthMm,
													t.midLingual.gingivalMarginMm,
												)
											: "—"}
									</td>
									<td className="p-1.5 text-center font-mono text-xs text-[var(--teal)] border-r border-slate-200 dark:border-slate-800 font-black">
										{t && !t.isMissing
											? calculateClinicalAttachmentLevel(
													t.mesioLingual.probingDepthMm,
													t.mesioLingual.gingivalMarginMm,
												)
											: "—"}
									</td>
								</React.Fragment>
							);
						})}
					</tr>
				</tbody>
			</table>
		</div>
	);
};
