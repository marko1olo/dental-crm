import React from "react";
import { Trash2 } from "lucide-react";
import type { EndoCanalData } from "@dental/shared";
import {
	CANAL_NAME_OPTIONS,
	REFERENCE_POINT_OPTIONS,
	EXTENDED_MAF_ISO_OPTIONS,
	TAPER_OPTIONS,
	OBTURATION_TECHNIQUE_OPTIONS,
	QUICK_LENGTH_PRESETS,
	CURATED_ISO_MAF_OPTIONS,
	type EndoStageStamp,
} from "./endoCanalConstants";

export interface EndoCanalTableProps {
	readonly canals: EndoCanalData[];
	readonly suggestedCanalNames: string[];
	readonly stageStamp: EndoStageStamp;
	readonly handleCanalChange: (
		id: string,
		field: keyof EndoCanalData,
		value: any,
	) => void;
	readonly handleAdjustCanalLength: (id: string, delta: number) => void;
	readonly handleCanalLengthInputChange: (id: string, val: string) => void;
	readonly handleSetCanalLength: (id: string, val: number) => void;
	readonly handleRemoveCanal: (id: string) => void;
	readonly renderIsoColorBadge: (mafOption: string) => React.ReactNode;
}

export const EndoCanalTable: React.FC<EndoCanalTableProps> = ({
	canals,
	suggestedCanalNames,
	stageStamp,
	handleCanalChange,
	handleAdjustCanalLength,
	handleCanalLengthInputChange,
	handleSetCanalLength,
	handleRemoveCanal,
	renderIsoColorBadge,
}) => {
	return (
		<>
			{/* Datalist for fast canal name autocomplete */}
			<datalist id="endo-canal-names-list">
				{CANAL_NAME_OPTIONS.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</datalist>

			{/* Multi-canal Table / Matrix (Dense desktop ergonomics h-8/h-9, Mandate 8c) */}
			<div className="border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-[var(--paper,#ffffff)] dark:bg-slate-900/60">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse text-xs">
						<thead className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 text-[var(--muted,#64748b)] text-[11px] font-bold border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<tr>
								<th className="py-2 px-3 truncate min-w-0">Канал</th>
								<th className="py-2 px-3 truncate min-w-0">Реперный ориентир</th>
								<th className="py-2 px-3 min-w-[200px] truncate">
									Длина (WL, 0.5 мм)
								</th>
								<th className="py-2 px-3 truncate min-w-0">MAF (ISO 3630-1)</th>
								<th className="py-2 px-3 truncate min-w-0">Конусность</th>
								<th className="py-2 px-3 truncate min-w-0">Метод обтурации</th>
								<th className="py-2 px-2 text-center w-10" />
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800/60">
							{canals.map((c, index) => (
								<tr
									key={c.id}
									className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
								>
									{/* Canal Name */}
									<td className="py-1.5 px-3">
										<input
											type="text"
											list="endo-canal-names-list"
											aria-label={`Название канала ${index + 1}`}
											value={c.canalName}
											onChange={(e) =>
												handleCanalChange(c.id, "canalName", e.target.value)
											}
											className="w-full h-8 sm:h-8.5 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
										/>
										{/* Suggested anatomical canal quick-pick chips */}
										{suggestedCanalNames.length > 0 && (
											<div className="flex items-center gap-1 mt-1 flex-wrap">
												{suggestedCanalNames.map((sName) => (
													<button
														key={sName}
														type="button"
														onClick={() =>
															handleCanalChange(c.id, "canalName", sName)
														}
														className={`h-4 px-1 rounded text-[9px] font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
															c.canalName === sName
																? "bg-rose-600 text-white shadow-xs"
																: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--muted,#64748b)] hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-700"
														}`}
														title={`Выбрать анатомический канал ${sName}`}
													>
														{sName}
													</button>
												))}
											</div>
										)}
									</td>

									{/* Reference Point */}
									<td className="py-1.5 px-3">
										<select
											aria-label={`Реперный ориентир канала ${c.canalName}`}
											value={c.referencePoint}
											onChange={(e) =>
												handleCanalChange(
													c.id,
													"referencePoint",
													e.target.value,
												)
											}
											className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
										>
											{REFERENCE_POINT_OPTIONS.map((opt) => (
												<option key={opt} value={opt}>
													{opt}
												</option>
											))}
										</select>
									</td>

									{/* Working Length in mm (степперы 0.5 мм и быстрые пресеты) */}
									<td className="py-1.5 px-3 min-w-[200px]">
										<div className="space-y-1">
											<div className="relative flex items-center gap-1">
												<button
													type="button"
													onClick={() =>
														handleAdjustCanalLength(c.id, -0.5)
													}
													className="h-7 w-7 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
													title="-0.5 мм"
												>
													-0.5
												</button>
												<div className="relative flex-1 flex items-center">
													<input
														type="number"
														step="0.5"
														min="10"
														max="35"
														aria-label={`Рабочая длина в мм для канала ${c.canalName}`}
														value={
															c.workingLengthMm === 0
																? ""
																: c.workingLengthMm
														}
														placeholder="—"
														onChange={(e) =>
															handleCanalLengthInputChange(
																c.id,
																e.target.value,
															)
														}
														className="w-full h-7 pl-1.5 pr-6 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-rose-500 outline-none text-center"
													/>
													<span className="absolute right-1.5 text-[10px] text-rose-700 dark:text-rose-300 font-bold pointer-events-none">
														мм
													</span>
												</div>
												<button
													type="button"
													onClick={() => handleAdjustCanalLength(c.id, 0.5)}
													className="h-7 w-7 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
													title="+0.5 мм"
												>
													+0.5
												</button>
											</div>
											{/* Quick Length Chips */}
											<div className="flex items-center gap-1 flex-wrap">
												{QUICK_LENGTH_PRESETS.map((presetLen) => (
													<button
														key={presetLen}
														type="button"
														onClick={() =>
															handleSetCanalLength(c.id, presetLen)
														}
														className={`h-5 px-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer inline-flex items-center justify-center ${
															Number(c.workingLengthMm) === presetLen
																? "bg-rose-600 text-white shadow-xs"
																: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 border border-[var(--line,#e2e8f0)] dark:border-slate-700"
														}`}
														title={`Установить длину ${presetLen} мм`}
													>
														{presetLen}
													</button>
												))}
											</div>
										</div>
									</td>

									{/* Master Apical File (MAF ISO 3630-1) */}
									<td className="py-1.5 px-3">
										<div className="flex items-center gap-1.5 min-w-0">
											{renderIsoColorBadge(c.masterApicalFile)}
											<select
												aria-label={`Мастер-апикальный файл MAF для канала ${c.canalName}`}
												value={c.masterApicalFile}
												onChange={(e) =>
													handleCanalChange(
														c.id,
														"masterApicalFile",
														e.target.value,
													)
												}
												className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
											>
												<optgroup label="Основные размеры MAF">
													{CURATED_ISO_MAF_OPTIONS.map((opt) => (
														<option key={opt} value={opt}>
															{opt}
														</option>
													))}
												</optgroup>
												<optgroup label="Все размеры ISO 3630-1">
													{EXTENDED_MAF_ISO_OPTIONS.map((opt) => (
														<option key={opt} value={opt}>
															{opt}
														</option>
													))}
												</optgroup>
											</select>
										</div>
									</td>

									{/* Taper (Конусность инструмента) */}
									<td className="py-1.5 px-3">
										<select
											aria-label={`Конусность канала ${c.canalName}`}
											value={c.taper}
											onChange={(e) =>
												handleCanalChange(c.id, "taper", e.target.value)
											}
											className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs font-mono focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
										>
											{TAPER_OPTIONS.map((opt) => (
												<option key={opt} value={opt}>
													{opt}
												</option>
											))}
										</select>
									</td>

									{/* Obturation Technique */}
									<td className="py-1.5 px-3">
										<select
											aria-label={`Метод обтурации канала ${c.canalName}`}
											value={c.obturationTechnique}
											onChange={(e) =>
												handleCanalChange(
													c.id,
													"obturationTechnique",
													e.target.value,
												)
											}
											className="w-full h-8 sm:h-8.5 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:ring-2 focus:ring-rose-500 outline-none truncate min-w-0"
										>
											{stageStamp === "TEMP_CAOH2" && (
												<option value="Временная обтурация Ca(OH)2 (Metapex / Calcept)">
													Временная обтурация Ca(OH)2 (Metapex / Calcept)
												</option>
											)}
											{OBTURATION_TECHNIQUE_OPTIONS.map((opt) => (
												<option key={opt} value={opt}>
													{opt}
												</option>
											))}
										</select>
									</td>

									{/* Remove Canal */}
									<td className="py-1.5 px-2 text-center">
										<button
											type="button"
											onClick={() => handleRemoveCanal(c.id)}
											className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors cursor-pointer"
											title={`Удалить канал ${c.canalName}`}
										>
											<Trash2 size={16} />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</>
	);
};
