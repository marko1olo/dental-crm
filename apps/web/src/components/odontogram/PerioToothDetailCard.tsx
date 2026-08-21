import React from "react";
import {
	calculateClinicalAttachmentLevel,
	type PerioToothRecord,
} from "@dental/shared";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Check,
	Droplet,
	Layers,
	ShieldAlert,
	Sparkles,
} from "lucide-react";
import {
	FURCATION_GRADES,
	getProbingDepthColor,
	isMultiRootedTooth,
	MOBILITY_GRADES,
	type PerioSiteKey,
} from "./perioTypes";

interface PerioToothDetailCardProps {
	tooth: PerioToothRecord;
	activeSiteKey: PerioSiteKey;
	onSiteSelect: (siteKey: PerioSiteKey) => void;
	onUpdateTooth: (updater: (t: PerioToothRecord) => PerioToothRecord) => void;
}

export const PerioToothDetailCard: React.FC<PerioToothDetailCardProps> = ({
	tooth,
	activeSiteKey,
	onSiteSelect,
	onUpdateTooth,
}) => {
	const isMultiRooted = isMultiRootedTooth(tooth.toothNumber);
	const isUpper = tooth.toothNumber < 30 || (tooth.toothNumber >= 51 && tooth.toothNumber <= 65);

	const renderSiteCard = (siteKey: PerioSiteKey, label: string, short: string) => {
		const site = tooth[siteKey];
		const isSelected = activeSiteKey === siteKey;
		const cal = calculateClinicalAttachmentLevel(site.probingDepthMm, site.gingivalMarginMm);
		const color = getProbingDepthColor(site.probingDepthMm);

		return (
			<button
				key={siteKey}
				type="button"
				onClick={() => onSiteSelect(siteKey)}
				className={`min-h-[58px] p-2.5 rounded-xl border text-left transition-all cursor-pointer relative select-none ${
					isSelected
						? "bg-teal-500/15 border-teal-500 ring-2 ring-teal-500/40 shadow-xs"
						: `${color.bgColor} ${color.borderColor} hover:border-slate-400 dark:hover:border-slate-600`
				}`}
				aria-label={`${label}, глубина ${site.probingDepthMm} мм, потеря CAL ${cal} мм`}
			>
				{/* Top Site Title & Badges */}
				<div className="flex items-center justify-between gap-1 mb-1">
					<span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
						{short} <span className="font-normal opacity-75 hidden sm:inline">({label})</span>
					</span>

					<div className="flex items-center gap-1">
						{site.bleedingOnProbing && (
							<span
								className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shadow-xs"
								title="Кровоточивость (BOP)"
							/>
						)}
						{site.suppuration && (
							<span
								className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"
								title="Гноетечение (SUP)"
							/>
						)}
						{site.plaque && (
							<span
								className="w-2 h-2 rounded-full bg-yellow-400"
								title="Зубной налёт (PLQ)"
							/>
						)}
						{site.calculus && (
							<span
								className="w-2 h-2 rounded-full bg-stone-500"
								title="Зубной камень (CALC)"
							/>
						)}
					</div>
				</div>

				{/* Values Row: PD, GM, CAL */}
				<div className="grid grid-cols-3 gap-1 text-center bg-white/70 dark:bg-slate-900/60 p-1 rounded-md border border-slate-200/60 dark:border-slate-800/60">
					<div>
						<span className="text-[9px] text-slate-500 dark:text-slate-400 block">PD</span>
						<span className={`text-xs font-black ${color.textColor}`}>
							{site.probingDepthMm}
						</span>
					</div>
					<div>
						<span className="text-[9px] text-slate-500 dark:text-slate-400 block">GM</span>
						<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
							{site.gingivalMarginMm > 0 ? `+${site.gingivalMarginMm}` : site.gingivalMarginMm}
						</span>
					</div>
					<div>
						<span className="text-[9px] text-slate-500 dark:text-slate-400 block">CAL</span>
						<span className="text-xs font-black text-teal-700 dark:text-teal-400">
							{cal}
						</span>
					</div>
				</div>
			</button>
		);
	};

	return (
		<div className="perio-tooth-detail-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
			{/* Header: Tooth Info & System States */}
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
				<div className="flex items-center gap-3">
					<div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300 font-mono font-black text-lg">
						{tooth.toothNumber}
					</div>
					<div>
						<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
							<span>Зуб #{tooth.toothNumber}</span>
							<span className="text-xs font-normal text-slate-500 dark:text-slate-400">
								{isUpper ? "Верхняя челюсть" : "Нижняя челюсть"}
							</span>
						</h4>
						<div className="flex items-center gap-3 mt-1 text-xs">
							<label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400">
								<input
									type="checkbox"
									checked={tooth.isMissing}
									onChange={(e) =>
										onUpdateTooth((t) => ({ ...t, isMissing: e.target.checked }))
									}
									className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
								/>
								Отсутствует
							</label>

							<label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400">
								<input
									type="checkbox"
									checked={tooth.isImplant}
									onChange={(e) =>
										onUpdateTooth((t) => ({ ...t, isImplant: e.target.checked }))
									}
									className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
								/>
								Имплантат
							</label>
						</div>
					</div>
				</div>

				{/* Furcation & Mobility Selectors (Tablet-Friendly >= 44px) */}
				<div className="flex flex-wrap items-center gap-3">
					{/* Tooth Mobility (Miller Grades 0..3) */}
					<div className="flex items-center gap-1.5">
						<span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
							<Activity className="w-3.5 h-3.5 text-indigo-500" />
							Подвижность:
						</span>
						<div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
							{([0, 1, 2, 3] as const).map((grade) => {
								const detail = MOBILITY_GRADES[grade];
								if (!detail) return null;
								const isSelected = (tooth.mobility || 0) === grade;
								return (
									<button
										key={grade}
										type="button"
										onClick={() => onUpdateTooth((t) => ({ ...t, mobility: grade }))}
										className={`min-h-[38px] min-w-[38px] rounded-md text-xs font-extrabold transition-all cursor-pointer ${
											isSelected
												? "bg-indigo-600 text-white shadow-xs"
												: "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
										}`}
										title={detail.descriptionRu}
									>
										{detail.codeRu}
									</button>
								);
							})}
						</div>
					</div>

					{/* Furcation Involvement (Grades 0..4) on Multi-Rooted Teeth */}
					{isMultiRooted && (
						<div className="flex items-center gap-1.5">
							<span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
								<Layers className="w-3.5 h-3.5 text-amber-500" />
								Фуркация:
							</span>
							<div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
								{([0, 1, 2, 3, 4] as const).map((grade) => {
									const detail = FURCATION_GRADES[grade];
									if (!detail) return null;
									const isSelected = (tooth.furcation || 0) === grade;
									return (
										<button
											key={grade}
											type="button"
											onClick={() => onUpdateTooth((t) => ({ ...t, furcation: grade }))}
											className={`min-h-[38px] min-w-[38px] rounded-md text-xs font-extrabold transition-all cursor-pointer ${
												isSelected
													? grade >= 3
														? "bg-rose-600 text-white shadow-xs"
														: grade >= 1
															? "bg-amber-500 text-white shadow-xs"
															: "bg-teal-600 text-white shadow-xs"
													: "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
											}`}
											title={detail.descriptionRu}
										>
											{detail.codeRu}
										</button>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* 6 Sites Probing Grid (Vestibular & Lingual) */}
			<div className="space-y-3">
				{/* 1. Buccal / Vestibular Aspect (DB, B, MB) */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300 border-b border-sky-100 dark:border-sky-950 pb-1">
						<span>Вестибулярно / щёчно (Buccal)</span>
						<span className="text-[10px] font-normal text-slate-400">
							Дистально → Центр → Медиально
						</span>
					</div>
					<div className="grid grid-cols-3 gap-2">
						{renderSiteCard("distoBuccal", "Дистально", "DB")}
						{renderSiteCard("midBuccal", "По центру", "B")}
						{renderSiteCard("mesioBuccal", "Медиально", "MB")}
					</div>
				</div>

				{/* 2. Lingual / Palatal Aspect (DL, L, ML) */}
				<div className="space-y-1.5 pt-1">
					<div className="flex items-center justify-between text-xs font-bold text-indigo-800 dark:text-indigo-300 border-b border-indigo-100 dark:border-indigo-950 pb-1">
						<span>Орально / язычно / нёбно (Lingual / Palatal)</span>
						<span className="text-[10px] font-normal text-slate-400">
							Дистально → Центр → Медиально
						</span>
					</div>
					<div className="grid grid-cols-3 gap-2">
						{renderSiteCard("distoLingual", "Дистально", "DL")}
						{renderSiteCard("midLingual", "По центру", "L")}
						{renderSiteCard("mesioLingual", "Медиально", "ML")}
					</div>
				</div>
			</div>
		</div>
	);
};
