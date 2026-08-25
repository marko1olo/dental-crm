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
				className={`min-h-[68px] p-2.5 rounded-xl border text-left transition-all cursor-pointer relative select-none ${
					isSelected
						? "bg-[var(--teal-soft,rgba(13,148,136,0.15))] border-[var(--teal)] ring-2 ring-[var(--teal)]/50 shadow-xs"
						: `${color.bgColor} ${color.borderColor} hover:border-slate-400 dark:hover:border-slate-600`
				}`}
				aria-label={`${label}, глубина ${site.probingDepthMm} мм, потеря CAL ${cal} мм`}
			>
				{/* Top Site Title & Badges */}
				<div className="flex items-center justify-between gap-1 mb-1.5">
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
						{short} <span className="font-medium opacity-80 hidden sm:inline">({label})</span>
					</span>

					<div className="flex items-center gap-1.5">
						{site.bleedingOnProbing && (
							<span
								className="w-3 h-3 rounded-full bg-rose-600 animate-pulse shadow-xs"
								title="Кровоточивость при зондировании (BOP)"
							/>
						)}
						{site.suppuration && (
							<span
								className="w-3 h-3 rounded-full bg-amber-500 shadow-xs"
								title="Гноетечение из кармана (SUP)"
							/>
						)}
						{site.plaque && (
							<span
								className="w-2.5 h-2.5 rounded-full bg-yellow-400"
								title="Зубной налёт / биопленка (PLQ)"
							/>
						)}
						{site.calculus && (
							<span
								className="w-2.5 h-2.5 rounded-full bg-stone-500"
								title="Зубной камень (CALC)"
							/>
						)}
					</div>
				</div>

				{/* Values Row: PD, GM, CAL (Flat single-level) */}
				<div className="grid grid-cols-3 gap-1 text-center pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
					<div>
						<span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">PD</span>
						<span className={`text-sm font-black ${color.textColor}`}>
							{site.probingDepthMm}
						</span>
					</div>
					<div>
						<span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">GM</span>
						<span className="text-sm font-bold text-slate-700 dark:text-slate-300">
							{site.gingivalMarginMm > 0 ? `+${site.gingivalMarginMm}` : site.gingivalMarginMm}
						</span>
					</div>
					<div>
						<span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">CAL</span>
						<span className="text-sm font-black text-[var(--teal)]">
							{cal}
						</span>
					</div>
				</div>
			</button>
		);
	};

	return (
		<div className="perio-tooth-detail-card space-y-4">
			{/* Header: Tooth Info & System States */}
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.1))] border border-[var(--teal)]/30 flex items-center justify-center text-[var(--teal)] font-mono font-black text-xl shadow-xs">
						#{tooth.toothNumber}
					</div>
					<div>
						<h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
							<span>Зуб #{tooth.toothNumber}</span>
							<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{isUpper ? "Верхняя челюсть" : "Нижняя челюсть"}
							</span>
						</h4>
						<div className="flex items-center gap-4 mt-1">
							<label className="min-h-[44px] inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
								<input
									type="checkbox"
									checked={tooth.isMissing}
									onChange={(e) =>
										onUpdateTooth((t) => ({ ...t, isMissing: e.target.checked }))
									}
									className="rounded border-slate-300 text-[var(--teal)] focus:ring-[var(--teal)] w-4 h-4 cursor-pointer"
								/>
								<span>Отсутствует</span>
							</label>

							<label className="min-h-[44px] inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
								<input
									type="checkbox"
									checked={tooth.isImplant}
									onChange={(e) =>
										onUpdateTooth((t) => ({ ...t, isImplant: e.target.checked }))
									}
									className="rounded border-slate-300 text-[var(--teal)] focus:ring-[var(--teal)] w-4 h-4 cursor-pointer"
								/>
								<span>Имплантат</span>
							</label>
						</div>
					</div>
				</div>

				{/* Furcation & Mobility Selectors (Tablet-Friendly >= 44x44px) */}
				<div className="flex flex-wrap items-center gap-4">
					{/* Tooth Mobility (Miller / Entin Grades 0..3) */}
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
							<Activity className="w-4 h-4 text-indigo-500" />
							<span>Подвижность:</span>
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
										className={`min-h-[44px] min-w-[44px] rounded-md text-sm font-black transition-all cursor-pointer ${
											isSelected
												? "bg-indigo-600 text-white shadow-xs"
												: "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
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
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
								<Layers className="w-4 h-4 text-amber-500" />
								<span>Фуркация:</span>
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
											className={`min-h-[44px] min-w-[44px] rounded-md text-sm font-black transition-all cursor-pointer ${
												isSelected
													? grade >= 3
														? "bg-rose-600 text-white shadow-xs"
														: grade >= 1
															? "bg-amber-500 text-white shadow-xs"
															: "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] shadow-xs"
													: "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
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
			<div className="space-y-4">
				{/* 1. Buccal / Vestibular Aspect (DB, B, MB) */}
				<div className="space-y-2">
					<div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300 border-b border-sky-100 dark:border-sky-950 pb-1">
						<span>ВЕСТИБУЛЯРНО / ЩЁЧНО (Buccal)</span>
						<span className="text-xs font-medium text-slate-500 dark:text-slate-400">
							Дистально (DB) → Центр (B) → Медиально (MB)
						</span>
					</div>
					<div className="grid grid-cols-3 gap-2.5">
						{renderSiteCard("distoBuccal", "Дистально", "DB")}
						{renderSiteCard("midBuccal", "По центру", "B")}
						{renderSiteCard("mesioBuccal", "Медиально", "MB")}
					</div>
				</div>

				{/* 2. Lingual / Palatal Aspect (DL, L, ML) */}
				<div className="space-y-2 pt-1">
					<div className="flex items-center justify-between text-xs font-bold text-indigo-800 dark:text-indigo-300 border-b border-indigo-100 dark:border-indigo-950 pb-1">
						<span>ОРАЛЬНО / ЯЗЫЧНО / НЁБНО (Lingual / Palatal)</span>
						<span className="text-xs font-medium text-slate-500 dark:text-slate-400">
							Дистально (DL) → Центр (L) → Медиально (ML)
						</span>
					</div>
					<div className="grid grid-cols-3 gap-2.5">
						{renderSiteCard("distoLingual", "Дистально", "DL")}
						{renderSiteCard("midLingual", "По центру", "L")}
						{renderSiteCard("mesioLingual", "Медиально", "ML")}
					</div>
				</div>
			</div>
		</div>
	);
};
