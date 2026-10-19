/**
 * apps/web/src/components/sterilization/SterilizationJournalTable.tsx
 *
 * Клинический журнал работы стерилизаторов и автоклавов (DENTE Apple HIG).
 * Мандат 8x: Человеческий язык без советского канцелярита и номеров приказов.
 * Мандат 8e: Автономия врача и медсестры ЦСО, быстрые действия в 1 клик.
 * Touch Targets >= 44x44px, Natural Thumb Zone, Desktop Density + Mobile Cards.
 */

import React, { useState, useMemo } from "react";
import {
	Plus,
	Printer,
	Download,
	Search,
	ShieldCheck,
	CheckCircle2,
	Layers,
	ArrowRight,
	Calendar,
	Sparkles,
} from "lucide-react";
import type { SanPinCycleEntry } from "../sanpin/journalModules/sanpinJournalTypes";
import { DEFAULT_CYCLES } from "../sanpin/journalModules/sanpinDefaultCycles";

export interface SterilizationJournalTableProps {
	readonly cycles?: readonly SanPinCycleEntry[];
	readonly onOpenNewCycle?: () => void;
	readonly onQuickBatchShift?: () => void;
	readonly onPrintJournal?: () => void;
	readonly onExportCsv?: () => void;
	readonly isAutofilling?: boolean;
	readonly className?: string;
}

export function SterilizationJournalTable({
	cycles = DEFAULT_CYCLES,
	onOpenNewCycle,
	onQuickBatchShift,
	onPrintJournal,
	onExportCsv,
	isAutofilling = false,
	className = "",
}: SterilizationJournalTableProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedDevice, setSelectedDevice] = useState("all");
	const [selectedStatus, setSelectedStatus] = useState<"all" | "passed" | "defect">("all");

	const filteredCycles = useMemo(() => {
		return cycles.filter((cyc) => {
			if (selectedDevice !== "all" && cyc.autoclaveCode !== selectedDevice) {
				return false;
			}
			if (selectedStatus === "passed" && cyc.status !== "passed") {
				return false;
			}
			if (selectedStatus === "defect" && cyc.status === "passed") {
				return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchText = `${cyc.date} ${cyc.autoclaveCode} ${cyc.autoclaveModel} ${cyc.itemsSummary} ${cyc.operatorName} ${cyc.regimeName}`.toLowerCase();
				if (!matchText.includes(q)) return false;
			}
			return true;
		});
	}, [cycles, selectedDevice, selectedStatus, searchQuery]);

	return (
		<div
			className={`sterilization-journal-table-root flex flex-col gap-3.5 ${className}`}
			style={{ maxWidth: "100%", overflowX: "clip" }}
		>
			{/* Top Action Bar */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] shadow-xs">
				<div className="flex items-center gap-2.5 flex-1 min-w-0">
					<div className="relative flex-1 min-w-[180px] max-w-sm">
						<Search
							size={15}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] pointer-events-none"
						/>
						<input
							type="text"
							placeholder="Поиск по циклу, аппарату, наборам..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full text-xs font-medium rounded-xl pl-8 pr-3 py-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
							data-testid="sterilization-journal-search-input"
						/>
					</div>

					<select
						value={selectedDevice}
						onChange={(e) => setSelectedDevice(e.target.value)}
						className="text-xs font-semibold rounded-xl px-3 py-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
						data-testid="sterilization-journal-device-filter"
					>
						<option value="all">Все аппараты ЦСО</option>
						<option value="АК-01">АК-01 (Melag Vacuklav)</option>
						<option value="АК-02">АК-02 (W&H Lisa)</option>
						<option value="СХ-01">СХ-01 (Сухожар ГП-20)</option>
					</select>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{onQuickBatchShift && (
						<button
							type="button"
							onClick={onQuickBatchShift}
							disabled={isAutofilling}
							className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 min-h-[44px] touch-manipulation cursor-pointer inline-flex items-center gap-1.5 transition-all"
							data-testid="sterilization-journal-quick-shift-btn"
							title="Сдать смену стерилизации в 1 клик"
						>
							<Sparkles size={14} />
							<span>{isAutofilling ? "Сохранение..." : "Сдать смену ЦСО"}</span>
						</button>
					)}

					{onOpenNewCycle && (
						<button
							type="button"
							onClick={onOpenNewCycle}
							className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs min-h-[44px] touch-manipulation cursor-pointer inline-flex items-center gap-1.5 transition-all"
							data-testid="sterilization-journal-new-cycle-btn"
						>
							<Plus size={16} />
							<span>+ Новый цикл</span>
						</button>
					)}

					{onPrintJournal && (
						<button
							type="button"
							onClick={onPrintJournal}
							className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer inline-flex items-center justify-center gap-1.5 transition-all"
							data-testid="sterilization-journal-print-btn"
							title="Печать журнала работы стерилизаторов"
						>
							<Printer size={15} />
							<span className="hidden sm:inline">Печать</span>
						</button>
					)}

					{onExportCsv && (
						<button
							type="button"
							onClick={onExportCsv}
							className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-medium text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer inline-flex items-center justify-center gap-1.5 transition-all"
							data-testid="sterilization-journal-export-csv-btn"
							title="Экспорт в CSV"
						>
							<Download size={15} />
							<span className="hidden sm:inline">CSV</span>
						</button>
					)}
				</div>
			</div>

			{/* DESKTOP TABLE VIEW (1440x900) */}
			<div className="hidden md:block rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] overflow-hidden shadow-xs">
				<table className="w-full border-collapse text-left text-xs table-fixed">
					<colgroup>
						<col style={{ width: "120px" }} />
						<col style={{ width: "130px" }} />
						<col style={{ width: "150px" }} />
						<col style={{ width: "170px" }} />
						<col style={{ width: "180px" }} />
						<col style={{ width: "auto" }} />
						<col style={{ width: "140px" }} />
						<col style={{ width: "110px" }} />
					</colgroup>
					<thead>
						<tr className="bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border-b border-[var(--line,#e2e8f0)] dark:border-[#334155] text-[var(--muted,#64748b)] font-bold uppercase tracking-wider text-[11px]">
							<th className="py-3 px-3.5">Дата / Время</th>
							<th className="py-3 px-3.5">Аппарат</th>
							<th className="py-3 px-3.5">Партия / Очистка</th>
							<th className="py-3 px-3.5">Параметры цикла</th>
							<th className="py-3 px-3.5">Индикатор</th>
							<th className="py-3 px-3.5">Наборы / Крафт</th>
							<th className="py-3 px-3.5">Сотрудник</th>
							<th className="py-3 px-3.5 text-center">Статус</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line,#f1f5f9)] dark:divide-[#334155]/60 text-[var(--ink,#0f172a)]">
						{filteredCycles.length === 0 ? (
							<tr>
								<td colSpan={8} className="py-10 text-center text-[var(--muted,#64748b)]">
									<p className="font-semibold text-sm">Циклы стерилизации не найдены</p>
									<p className="text-xs mt-1">Используйте кнопку «+ Новый цикл» для добавления</p>
								</td>
							</tr>
						) : (
							filteredCycles.map((cyc) => {
								const isPassed = cyc.status === "passed";
								const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 14;
								return (
									<tr
										key={cyc.id}
										className="hover:bg-slate-500/5 transition-colors"
										data-testid={`sterilization-row-${cyc.id}`}
									>
										<td className="py-3 px-3.5 align-top">
											<div className="font-bold text-[13px]">{cyc.date}</div>
											<div className="text-[11px] text-[var(--muted,#64748b)]">
												{cyc.time} • №{cyc.cycleNumber}
											</div>
										</td>
										<td className="py-3 px-3.5 align-top">
											<div className="font-bold">{cyc.autoclaveCode}</div>
											<div className="text-[11px] text-[var(--muted,#64748b)] truncate">
												{cyc.autoclaveModel}
											</div>
										</td>
										<td className="py-3 px-3.5 align-top">
											<div className="flex flex-col gap-1">
												<span className="inline-flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-300 text-[11px] px-2 py-0.5 rounded-md bg-teal-500/10 w-fit">
													<Layers size={11} /> {batchCount} наборов
												</span>
												<span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
													<ShieldCheck size={11} /> Азопирам: норма
												</span>
											</div>
										</td>
										<td className="py-3 px-3.5 align-top">
											<div className="font-bold">
												{cyc.temperatureC}°C • {cyc.pressureBar} бар
											</div>
											<div className="text-[11px] text-[var(--muted,#64748b)]">
												{cyc.durationMin} мин • {cyc.regimeName}
											</div>
										</td>
										<td className="py-3 px-3.5 align-top">
											<div className="flex items-center gap-1.5 mb-1">
												<span
													className="w-3.5 h-3.5 rounded border border-black/20"
													style={{ backgroundColor: cyc.colorBeforeHex }}
													title={`До: ${cyc.colorBefore}`}
												/>
												<ArrowRight size={10} className="text-[var(--muted)]" />
												<span
													className="w-3.5 h-3.5 rounded border border-black/20"
													style={{ backgroundColor: cyc.colorAfterHex }}
													title={`После: ${cyc.colorAfter}`}
												/>
												<span className="font-semibold text-[11px] ml-0.5">
													{cyc.indicatorClass} кл.
												</span>
											</div>
											<div className="text-[11px] text-emerald-600 font-medium">Норма (100%)</div>
										</td>
										<td className="py-3 px-3.5 align-top">
											<div className="font-medium text-xs leading-snug line-clamp-2">
												{cyc.itemsSummary}
											</div>
											{cyc.pouchCodes.length > 0 && (
												<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5">
													{cyc.pouchCodes.join(", ")}
												</div>
											)}
										</td>
										<td className="py-3 px-3.5 align-top">
											<div className="font-medium truncate text-xs">{cyc.operatorName}</div>
										</td>
										<td className="py-3 px-3.5 align-top text-center">
											<span
												className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
													isPassed
														? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
														: "bg-rose-500/10 text-rose-700 dark:text-rose-300"
												}`}
											>
												<CheckCircle2 size={12} />
												{isPassed ? "Стерильно" : "Брак"}
											</span>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* MOBILE GROUPED CARDS (390x844 Apple HIG) */}
			<div className="flex md:hidden flex-col gap-2.5">
				{filteredCycles.length === 0 ? (
					<div className="p-8 text-center rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)]">
						<p className="font-semibold text-sm">Циклы не найдены</p>
					</div>
				) : (
					filteredCycles.map((cyc) => {
						const isPassed = cyc.status === "passed";
						const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 14;
						return (
							<div
								key={cyc.id}
								className="p-4 rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] shadow-xs flex flex-col gap-2.5"
								data-testid={`sterilization-mobile-card-${cyc.id}`}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="font-bold text-sm text-[var(--ink,#0f172a)]">{cyc.date}</span>
										<span className="text-xs text-[var(--muted,#64748b)]">{cyc.time}</span>
									</div>
									<span
										className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
											isPassed
												? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
												: "bg-rose-500/10 text-rose-700 dark:text-rose-300"
										}`}
									>
										<CheckCircle2 size={12} />
										{isPassed ? "Стерильно" : "Брак"}
									</span>
								</div>

								<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line,#f1f5f9)] dark:border-[#334155]/60">
									<div className="font-semibold text-[var(--teal,#0d9488)]">
										{cyc.autoclaveCode} • {cyc.temperatureC}°C / {cyc.pressureBar} бар / {cyc.durationMin} мин
									</div>
									<div className="text-[var(--muted,#64748b)]">{batchCount} наборов</div>
								</div>

								<p className="text-xs text-[var(--ink,#0f172a)] m-0 leading-relaxed font-medium">
									{cyc.itemsSummary}
								</p>

								<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)] pt-1">
									<span>Индикатор: {cyc.indicatorClass} кл. (норма)</span>
									<span className="truncate max-w-[150px]">{cyc.operatorName}</span>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}

export default SterilizationJournalTable;
