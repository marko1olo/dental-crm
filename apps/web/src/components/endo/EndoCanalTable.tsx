import React, { useState } from "react";
import {
	ChevronDown,
	SlidersHorizontal,
	Trash2,
	Zap,
	X,
	Check,
} from "lucide-react";
import type { EndoCanalData } from "@dental/shared";
import {
	CANAL_NAME_OPTIONS,
	REFERENCE_POINT_OPTIONS,
	MAF_ISO_OPTIONS,
	TAPER_OPTIONS,
	OBTURATION_TECHNIQUE_OPTIONS,
	ENDO_SEALER_OPTIONS,
	QUICK_LENGTH_PRESETS,
	type EndoStageStamp,
} from "./endoCanalConstants";

export interface EndoCanalTableProps {
	readonly canals: EndoCanalData[];
	readonly suggestedCanalNames: string[];
	readonly stageStamp: EndoStageStamp;
	readonly handleCanalChange: (id: string, field: keyof EndoCanalData, value: any) => void;
	readonly handleAdjustCanalLength: (id: string, delta: number) => void;
	readonly handleCanalLengthInputChange: (id: string, val: string) => void;
	readonly handleSetCanalLength: (id: string, val: number) => void;
	readonly handleRemoveCanal: (id: string) => void;
	readonly renderIsoColorBadge: (mafOption: string) => React.ReactNode;
	readonly handleToggleCanalObliteration?: (id: string) => void;
}

export const EndoCanalTable: React.FC<EndoCanalTableProps> = (props) => {
	const [activeCanalForSealer, setActiveCanalForSealer] = useState<EndoCanalData | null>(null);

	return (
		<details
			className="group border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900/40 shadow-xs overflow-hidden"
			open
			data-testid="endo-full-table-accordion"
		>
			<summary className="flex items-center justify-between p-3 cursor-pointer select-none bg-[var(--surface,#f8fafc)] dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors list-none">
				<div className="flex items-center gap-2">
					<SlidersHorizontal size={15} className="text-[var(--teal,#0d9488)]" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white">
						Детализация каналов (для эндодонтиста)
					</span>
					<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">
						({props.canals.length} {props.canals.map((c) => c.canalName).join(", ")})
					</span>
				</div>
				<ChevronDown size={15} className="text-[var(--muted,#64748b)] transition-transform duration-200 group-open:rotate-180" />
			</summary>

			<div className="p-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 space-y-3">
				<datalist id="endo-canal-names-list">
					{CANAL_NAME_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</datalist>

				{/* 1. Desktop Table (>= 768px) */}
				<div className="hidden md:block border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-[var(--paper,#ffffff)] dark:bg-slate-900/60">
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse text-xs">
							<thead className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 text-[var(--muted,#64748b)] text-[11px] font-bold border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<tr>
									<th className="py-2 px-3">Канал</th>
									<th className="py-2 px-3">Ориентир</th>
									<th className="py-2 px-3 min-w-[200px]">Рабочая длина (WL, мм)</th>
									<th className="py-2 px-3">Мастер-файл (MAF)</th>
									<th className="py-2 px-3">Конусность</th>
									<th className="py-2 px-3">Метод обтурации</th>
									<th className="py-2 px-3">Силер</th>
									<th className="py-2 px-2 text-center w-10" />
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800/60">
								{props.canals.map((c, index) => (
									<tr key={c.id || `canal-row-${c.canalName}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
										{/* Канал */}
										<td className="py-1.5 px-3">
											<div className="flex items-center gap-1.5">
												<span className="w-4 text-[10px] text-slate-400 font-mono">{index + 1}.</span>
												<input
													type="text"
													value={c.canalName}
													onChange={(e) => props.handleCanalChange(c.id, "canalName", e.target.value)}
													list="endo-canal-names-list"
													className="w-20 h-7 px-2 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs"
												/>
												<button
													type="button"
													onClick={() => props.handleToggleCanalObliteration?.(c.id)}
													className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
														c.isObliterated
															? "bg-[var(--amber-soft,rgba(245,158,11,0.15))] dark:bg-amber-950/80 border-amber-500 text-amber-800 dark:text-amber-300 font-bold"
															: "border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800"
													}`}
													title="Отметить облитерацию канала"
												>
													{c.isObliterated ? "Облитер." : "Облит."}
												</button>
											</div>
										</td>

										{/* Ориентир */}
										<td className="py-1.5 px-3">
											<select
												value={c.referencePoint || ""}
												onChange={(e) => props.handleCanalChange(c.id, "referencePoint", e.target.value)}
												className="w-36 h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs"
											>
												{REFERENCE_POINT_OPTIONS.map((opt) => (
													<option key={opt} value={opt}>{opt}</option>
												))}
											</select>
										</td>

										{/* Рабочая длина */}
										<td className="py-1.5 px-3 min-w-[200px]">
											{c.isObliterated ? (
												<div className="flex items-center gap-1.5 py-1">
													<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-500/40">
														Облитерирован (0 мм)
													</span>
													<button
														type="button"
														onClick={() => props.handleToggleCanalObliteration?.(c.id)}
														className="text-[10px] text-slate-500 underline"
													>
														Снять
													</button>
												</div>
											) : (
												<div className="space-y-1">
													<div className="flex items-center gap-1">
														<button
															type="button"
															onClick={() => props.handleAdjustCanalLength(c.id, -0.5)}
															className="h-7 w-7 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--line,#cbd5e1)] dark:border-slate-700"
															title="-0.5 мм"
														>
															-0.5
														</button>
														<div className="relative flex-1 flex items-center">
															<input
																type="number"
																step="0.5"
																min="0"
																max="40"
																inputMode="decimal"
																aria-label={`Рабочая длина в мм для канала ${c.canalName}`}
																value={c.workingLengthMm === 0 ? "" : c.workingLengthMm}
																placeholder="—"
																onChange={(e) => props.handleCanalLengthInputChange(c.id, e.target.value)}
																className="w-full h-7 pl-1.5 pr-6 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-mono font-bold text-xs text-center"
															/>
															<span className="absolute right-1.5 text-[10px] text-teal-600 dark:text-teal-400 font-bold pointer-events-none">
																мм
															</span>
														</div>
														<button
															type="button"
															onClick={() => props.handleAdjustCanalLength(c.id, 0.5)}
															className="h-7 w-7 rounded-lg bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--line,#cbd5e1)] dark:border-slate-700"
															title="+0.5 мм"
														>
															+0.5
														</button>
													</div>
													<div className="flex items-center gap-1 flex-wrap">
														{QUICK_LENGTH_PRESETS.map((presetLen) => (
															<button
																key={presetLen}
																type="button"
																onClick={() => props.handleSetCanalLength(c.id, presetLen)}
																className={`h-5 px-1.5 rounded text-[10px] font-mono font-bold transition-all ${
																	Number(c.workingLengthMm) === presetLen
																		? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
																		: "bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-[var(--line,#e2e8f0)] dark:border-slate-700"
																}`}
															>
																{presetLen}
															</button>
														))}
													</div>
												</div>
											)}
										</td>

										{/* MAF */}
										<td className="py-1.5 px-3">
											<select
												value={c.masterApicalFile}
												onChange={(e) => props.handleCanalChange(c.id, "masterApicalFile", e.target.value)}
												className="w-32 h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs"
											>
												{MAF_ISO_OPTIONS.map((opt) => (
													<option key={opt} value={opt}>{opt}</option>
												))}
											</select>
										</td>

										{/* Конусность */}
										<td className="py-1.5 px-3">
											<select
												value={c.taper}
												onChange={(e) => props.handleCanalChange(c.id, "taper", e.target.value)}
												className="w-24 h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs"
											>
												{TAPER_OPTIONS.map((opt) => (
													<option key={opt} value={opt}>{opt}</option>
												))}
											</select>
										</td>

										{/* Метод обтурации */}
										<td className="py-1.5 px-3">
											<select
												value={c.obturationTechnique}
												onChange={(e) => props.handleCanalChange(c.id, "obturationTechnique", e.target.value)}
												className="w-40 h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs truncate"
											>
												{OBTURATION_TECHNIQUE_OPTIONS.map((opt) => (
													<option key={opt} value={opt}>{opt}</option>
												))}
											</select>
										</td>

										{/* Силер */}
										<td className="py-1.5 px-3">
											<select
												value={c.sealer}
												onChange={(e) => props.handleCanalChange(c.id, "sealer", e.target.value)}
												className="w-28 h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs"
											>
												{ENDO_SEALER_OPTIONS.map((opt) => (
													<option key={opt} value={opt}>{opt}</option>
												))}
											</select>
										</td>

										{/* Удалить */}
										<td className="py-1.5 px-2 text-center">
											<button
												type="button"
												onClick={() => props.handleRemoveCanal(c.id)}
												className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
												title="Удалить канал"
											>
												<Trash2 size={13} />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* 2. Mobile Grouped List Cards (< 768px Apple HIG Touch Ergonomics) */}
				<div className="block md:hidden space-y-3">
					{props.canals.map((c, index) => (
						<div
							key={c.id || `canal-card-${c.canalName}-${index}`}
							className="p-3.5 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-xs space-y-3"
						>
							{/* Card Header: Canal name + obliteration + remove */}
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<span className="w-5 h-5 rounded-full bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] text-xs font-bold flex items-center justify-center">
										{index + 1}
									</span>
									<input
										type="text"
										value={c.canalName}
										onChange={(e) => props.handleCanalChange(c.id, "canalName", e.target.value)}
										list="endo-canal-names-list"
										className="w-24 min-h-[44px] h-11 px-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-bold text-sm"
									/>
									<button
										type="button"
										onClick={() => props.handleToggleCanalObliteration?.(c.id)}
										className={`min-h-[44px] px-2.5 py-1 rounded-xl border text-xs font-bold transition-colors ${
											c.isObliterated
												? "bg-[var(--amber-soft,rgba(245,158,11,0.15))] dark:bg-amber-950/80 border-amber-500 text-amber-800 dark:text-amber-300"
												: "border-slate-300 dark:border-slate-700 text-slate-500"
										}`}
									>
										{c.isObliterated ? "Облитерирован" : "Облитерация"}
									</button>
								</div>
								<button
									type="button"
									onClick={() => props.handleRemoveCanal(c.id)}
									className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
								>
									<Trash2 size={16} />
								</button>
							</div>

							{/* Apex Locator Badge */}
							<div className="flex items-center justify-between px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300/60 dark:border-teal-800 text-teal-900 dark:text-teal-200">
								<div className="flex items-center gap-1.5 text-xs font-bold">
									<Zap size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
									<span>Апекслокатор: 0.0 (Apex)</span>
								</div>
								<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
									{c.isObliterated ? "Облитерирован (0 мм)" : c.workingLengthMm ? `WL: ${c.workingLengthMm} мм` : "0.0 (Норма)"}
								</span>
							</div>

							{/* Mobile Working Length Controls */}
							{!c.isObliterated && (
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => props.handleAdjustCanalLength(c.id, -0.5)}
											className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold text-sm flex items-center justify-center"
										>
											-0.5
										</button>
										<div className="relative flex-1">
											<input
												type="number"
												step="0.5"
												min="0"
												max="40"
												inputMode="decimal"
												value={c.workingLengthMm === 0 ? "" : c.workingLengthMm}
												placeholder="—"
												onChange={(e) => props.handleCanalLengthInputChange(c.id, e.target.value)}
												className="w-full min-h-[44px] h-11 px-3 text-center rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white font-mono font-bold text-base"
											/>
											<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-teal-600 dark:text-teal-400 font-bold pointer-events-none">
												мм
											</span>
										</div>
										<button
											type="button"
											onClick={() => props.handleAdjustCanalLength(c.id, 0.5)}
											className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold text-sm flex items-center justify-center"
										>
											+0.5
										</button>
									</div>

									{/* Quick Length Chips for Mobile */}
									<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
										{QUICK_LENGTH_PRESETS.map((presetLen) => (
											<button
												key={presetLen}
												type="button"
												onClick={() => props.handleSetCanalLength(c.id, presetLen)}
												className={`min-h-[44px] px-3 rounded-xl text-xs font-mono font-bold transition-all shrink-0 ${
													Number(c.workingLengthMm) === presetLen
														? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
														: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-[var(--line,#cbd5e1)] dark:border-slate-700"
												}`}
											>
												{presetLen} мм
											</button>
										))}
									</div>
								</div>
							)}

							{/* Selects: Reference, MAF, Taper, Obturation, Sealer */}
							<div className="grid grid-cols-2 gap-2 text-xs">
								<div>
									<label className="block text-[11px] text-slate-500 font-medium mb-1">Ориентир</label>
									<select
										value={c.referencePoint || ""}
										onChange={(e) => props.handleCanalChange(c.id, "referencePoint", e.target.value)}
										className="w-full min-h-[44px] px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white"
									>
										{REFERENCE_POINT_OPTIONS.map((opt) => (
											<option key={opt} value={opt}>{opt}</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-[11px] text-slate-500 font-medium mb-1">Мастер-файл (MAF)</label>
									<select
										value={c.masterApicalFile}
										onChange={(e) => props.handleCanalChange(c.id, "masterApicalFile", e.target.value)}
										className="w-full min-h-[44px] px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white"
									>
										{MAF_ISO_OPTIONS.map((opt) => (
											<option key={opt} value={opt}>{opt}</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-[11px] text-slate-500 font-medium mb-1">Конусность</label>
									<select
										value={c.taper}
										onChange={(e) => props.handleCanalChange(c.id, "taper", e.target.value)}
										className="w-full min-h-[44px] px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white"
									>
										{TAPER_OPTIONS.map((opt) => (
											<option key={opt} value={opt}>{opt}</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-[11px] text-slate-500 font-medium mb-1">Силер</label>
									<button
										type="button"
										onClick={() => setActiveCanalForSealer(c)}
										className="w-full min-h-[44px] px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-left font-medium flex items-center justify-between"
									>
										<span className="truncate">{c.sealer || "Выбрать"}</span>
										<ChevronDown size={14} className="text-slate-400 shrink-0" />
									</button>
								</div>
							</div>
						</div>
					))}
				</div>

				{/* 3. Mobile Sealer Drawer (Bottom Sheet) */}
				{activeCanalForSealer && (
					<div
						className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/60 backdrop-blur-xs p-0"
						role="dialog"
						aria-modal="true"
					>
						<div className="w-full bg-[var(--paper,#ffffff)] dark:bg-slate-900 rounded-t-[24px] border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl space-y-3 max-h-[70vh] overflow-y-auto">
							<div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
							<div className="flex items-center justify-between">
								<span className="font-bold text-sm text-[var(--ink,#0f172a)] dark:text-white">
									Выбор силера: {activeCanalForSealer.canalName}
								</span>
								<button
									type="button"
									onClick={() => setActiveCanalForSealer(null)}
									className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700"
								>
									<X size={18} />
								</button>
							</div>
							<div className="grid grid-cols-1 gap-2">
								{ENDO_SEALER_OPTIONS.map((opt) => (
									<button
										key={opt}
										type="button"
										onClick={() => {
											props.handleCanalChange(activeCanalForSealer.id, "sealer", opt);
											setActiveCanalForSealer(null);
										}}
										className={`min-h-[48px] px-4 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-colors ${
											activeCanalForSealer.sealer === opt
												? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
												: "bg-[var(--surface,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-slate-800 dark:text-slate-200"
										}`}
									>
										<span>{opt}</span>
										{activeCanalForSealer.sealer === opt && <Check size={16} />}
									</button>
								))}
							</div>
						</div>
					</div>
				)}
			</div>
		</details>
	);
};

export default EndoCanalTable;
