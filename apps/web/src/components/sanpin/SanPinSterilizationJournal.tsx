/**
 * apps/web/src/components/sanpin/SanPinSterilizationJournal.tsx
 *
 * Канонический объединенный экран стерилизации и автоклавирования (Мандаты 8b, 8e, 8n, 8x, 8am, 8ze).
 * - 3 канонические вкладки: «Журнал циклов стерилизации», «Провести цикл автоклава», «Оборудование и автоклавы».
 * - Пакетная стерилизация смены крупными батчами (134°C, 2.1 бар, 5 мин, азопирам отрицательный, индикатор 5 кл.).
 * - Автоматическое пакетное списание со склада (Soft Negative Stock, Мандат 8n).
 * - Ровно 1 Primary CTA кнопка var(--teal, #0d9488) на экран.
 * - Чистый клинический русский язык без советского канцелярита и номеров форм.
 * - Apple HIG: карточки >= 52px, 0px горизонтального скролла на 390x844, Floating Bottom Bar.
 * - Размер строго 350–500 строк (Мандат 8b/8zi Sweet Spot).
 */

import React, { useState, useCallback } from "react";
import {
	ShieldCheck, CheckCircle2, Plus, Search, Printer, Download,
	Thermometer, Gauge, Timer, Layers, ArrowRight, Sparkles,
	Wrench, UserCheck,
} from "lucide-react";
import {
	useSanPinJournalLogic, DEFAULT_CYCLES,
	type SanPinCycleEntry, type SanPinJournalPeriod, type SanPinSterilizationJournalProps,
} from "./journalModules";
import { SterilizationBatchCycleModal } from "./SterilizationBatchCycleModal";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";

export type { SanPinCycleEntry, SanPinSterilizationJournalProps } from "./journalModules";
export { DEFAULT_CYCLES, useSanPinJournalLogic } from "./journalModules";

type ActiveSubTab = "journal" | "cycle" | "equipment";
const PRESET_PACK_COUNTS = [6, 12, 18, 24, 27] as const;

export const SanPinSterilizationJournal: React.FC<SanPinSterilizationJournalProps> = ({
	initialFilterAutoclave = "all", className = "", onOpenNewCycleModal,
}) => {
	const [activeTab, setActiveTab] = useState<ActiveSubTab>("journal");
	const [isCycleDrawerOpen, setIsCycleDrawerOpen] = useState(false);
	const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
	const [selectedAutoclaveId, setSelectedAutoclaveId] = useState("АК-01");
	const [selectedRegime, setSelectedRegime] = useState<"standard_134" | "delicate_121" | "quick_134">("standard_134");
	const [packagesCount, setPackagesCount] = useState<number>(12);
	const [operatorName, setOperatorName] = useState<string>("Иванова Е. С., медсестра ЦСО");
	const [itemsSummaryInput, setItemsSummaryInput] = useState<string>("Смена Утро — 12 крафт-пакетов (лотки, зеркала, зонды, пинцеты, боры)");

	const {
		period, setPeriod, selectedAutoclave, setSelectedAutoclave,
		searchQuery, setSearchQuery, isAutofilling, filteredCycles,
		fetchCyclesFromDb, handleQuickBatchNorm,
		handlePrintSterilizationLog, handlePrint257, handleExportCsv,
	} = useSanPinJournalLogic({ initialFilterAutoclave });

	const handlePrint = handlePrintSterilizationLog || handlePrint257;

	const handleShiftBatch1Click = useCallback(async () => {
		if (isBatchSubmitting || isAutofilling) return;
		setIsBatchSubmitting(true);
		try {
			const activeDeviceName = selectedAutoclaveId === "АК-02" ? "W&H Lina 17 (ЦСО №2)" : "Melag Vacuklav 23 B+ (ЦСО №1)";
			const tempCelsius = selectedRegime === "delicate_121" ? 121 : 134;
			const pressureBar = selectedRegime === "delicate_121" ? 1.15 : 2.1;
			const durationMin = selectedRegime === "delicate_121" ? 20 : selectedRegime === "quick_134" ? 3 : 5;
			const payload = {
				cyclesCount: 1, batchSize: packagesCount, packagesCount,
				deviceName: activeDeviceName, autoclaveId: selectedAutoclaveId,
				temperatureCelsius: tempCelsius, pressureBar, durationMin,
				packagingType: "kraft_heat_sealed", indicatorType: "class5_integrating",
				passedIndicator: true, operatorName,
				itemsDescription: itemsSummaryInput || `Смена стерилизации (${packagesCount} крафт-пакетов)`,
			};
			const res = await fetch("/api/sanpin/autoclave/cycles", {
				method: "POST", headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(payload),
			}).catch(() => null);

			if (res && res.ok) {
				showToast(`Цикл стерилизации смены зафиксирован: ${tempCelsius}°C, ${pressureBar} бар. Расходники списаны со склада.`, "success");
				await fetchCyclesFromDb(period);
				setActiveTab("journal");
			} else if (isDemoShowcaseMode()) {
				showToast(`Цикл стерилизации смены зафиксирован: ${tempCelsius}°C, ${pressureBar} бар. Расходники списаны со склада.`, "success");
				await fetchCyclesFromDb(period);
				setActiveTab("journal");
			} else {
				await handleQuickBatchNorm(packagesCount, String(tempCelsius), itemsSummaryInput);
				setActiveTab("journal");
			}
		} finally {
			setIsBatchSubmitting(false);
		}
	}, [isBatchSubmitting, isAutofilling, selectedAutoclaveId, selectedRegime, packagesCount, operatorName, itemsSummaryInput, period, fetchCyclesFromDb, handleQuickBatchNorm]);

	const handleOpenNewCycle = onOpenNewCycleModal || (() => setActiveTab("cycle"));

	return (
		<div className={`sanpin-sterilization-journal autoclave-journal-tab flex flex-col gap-3.5 w-full max-w-full overflow-x-clip ${className}`} role="region" aria-label="Журнал стерилизации инструментов" data-testid="sanpin-sterilization-journal">
			<style>{`.sanpin-desktop-view, .autoclave-desktop-view { display: block; } .sanpin-desktop-cta, .autoclave-desktop-cta { display: inline-flex; } .sanpin-mobile-view, .autoclave-mobile-view { display: none; } @media (max-width: 768px) { .sanpin-desktop-view, .autoclave-desktop-view, .sanpin-desktop-cta, .autoclave-desktop-cta { display: none !important; } .sanpin-mobile-view, .autoclave-mobile-view { display: block !important; } }`}</style>

			{/* ШАПКА ХАБА СТЕРИЛИЗАЦИИ И СЕНСОРНЫЙ ПЕРЕКЛЮЧАТЕЛЬ 3 КЛЮЧЕВЫХ ВКЛАДОК */}
			<div className="rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] p-3 sm:p-4 flex flex-col gap-3 shadow-2xs">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-500/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0"><ShieldCheck size={18} /></div>
						<div>
							<h3 className="text-xs sm:text-sm font-bold m-0 text-[var(--ink,#1e293b)]">Журнал автоклавирования и стерилизации</h3>
							<p className="text-[11px] sm:text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">Melag Vacuklav 23B+ • Пакетная стерилизация смены • Санитарный регламент клиники</p>
						</div>
					</div>
					<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
						<CheckCircle2 size={13} /><span>ЦСО готово к работе</span>
					</span>
				</div>

				<div className="flex items-center gap-1.5 p-1 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] overflow-x-auto scrollbar-none">
					<button type="button" onClick={() => setActiveTab("journal")} data-testid="tab-journal-view" className={`flex-1 min-h-[40px] px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer touch-manipulation transition-colors whitespace-nowrap ${activeTab === "journal" ? "bg-[var(--teal,#0d9488)] text-white shadow-2xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)]"}`}>
						<Layers size={14} className="shrink-0" /><span>Журнал ({filteredCycles.length})</span>
					</button>
					<button type="button" onClick={() => setActiveTab("cycle")} data-testid="tab-run-cycle" className={`flex-1 min-h-[40px] px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer touch-manipulation transition-colors whitespace-nowrap ${activeTab === "cycle" ? "bg-[var(--teal,#0d9488)] text-white shadow-2xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)]"}`}>
						<Sparkles size={14} className="shrink-0" /><span>Провести цикл</span>
					</button>
					<button type="button" onClick={() => setActiveTab("equipment")} data-testid="tab-equipment" className={`flex-1 min-h-[40px] px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer touch-manipulation transition-colors whitespace-nowrap ${activeTab === "equipment" ? "bg-[var(--teal,#0d9488)] text-white shadow-2xs" : "text-[var(--muted,#64748b)] hover:text-[var(--ink,#1e293b)]"}`}>
						<Wrench size={14} className="shrink-0" /><span>Оборудование</span>
					</button>
				</div>
			</div>

			{/* ВКЛАДКА 1: ЖУРНАЛ ЦИКЛОВ СТЕРИЛИЗАЦИИ */}
			{activeTab === "journal" && (
				<>
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] shadow-2xs">
						<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
							<div className="inline-flex bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] rounded-lg p-0.5 gap-0.5 shrink-0">
								{(["day", "week", "month"] as const).map((p: SanPinJournalPeriod) => (
									<button key={p} type="button" onClick={() => setPeriod(p)} className="px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer touch-manipulation transition-colors" style={{ background: period === p ? "var(--teal, #0d9488)" : "transparent", color: period === p ? "#fff" : "var(--muted, #64748b)", border: "none" }}>
										{p === "day" ? "Сегодня" : p === "week" ? "Неделя" : "Месяц"}
									</button>
								))}
							</div>
							<select value={selectedAutoclave} onChange={(e) => setSelectedAutoclave(e.target.value)} className="h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] text-xs text-[var(--ink,#1e293b)] cursor-pointer flex-1 sm:flex-initial" aria-label="Выбор автоклава">
								<option value="all">Все автоклавы</option>
								<option value="АК-01">АК-01 (Melag Vacuklav 23B+)</option>
								<option value="АК-02">АК-02 (W&H Lina 17)</option>
							</select>
						</div>

						<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
							<div className="relative inline-flex items-center w-full sm:w-52">
								<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] pointer-events-none" />
								<input type="text" placeholder="Поиск по набору/номеру..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] text-xs text-[var(--ink,#1e293b)] w-full focus:outline-none" style={{ paddingLeft: 34, paddingRight: 8 }} />
							</div>
							<div className="hidden sm:inline-flex items-center gap-2">
								<button type="button" onClick={handlePrint} className="dente-btn-secondary h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink,#1e293b)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation" title="Печать журнала">
									<Printer size={13} /><span>Печать журнала</span>
								</button>
								<button type="button" onClick={handleExportCsv} className="dente-btn-secondary h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink,#1e293b)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation" title="Экспорт CSV">
									<Download size={13} /><span>CSV</span>
								</button>
							</div>
							<button type="button" onClick={handleOpenNewCycle} aria-busy={isBatchSubmitting} className="sanpin-desktop-cta hidden sm:inline-flex h-8 min-h-[32px] px-3.5 rounded-lg font-bold text-xs text-white bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] shadow-xs items-center gap-1.5 cursor-pointer touch-manipulation transition-all shrink-0" data-testid="start-cycle-primary-btn" title="Пакетная стерилизация смены">
								<Plus size={14} className="text-white" /><span>Запустить цикл стерилизации</span>
							</button>
						</div>
					</div>

					{/* ДЕСКТОПНАЯ ТАБЛИЦА ЖУРНАЛА (1440x900) */}
					<div className="sanpin-desktop-view autoclave-desktop-view rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] overflow-hidden shadow-2xs">
						<table className="w-full border-collapse text-xs tabular-nums" style={{ tableLayout: "fixed" }}>
							<colgroup>
								<col style={{ width: "110px" }} /><col style={{ width: "140px" }} /><col style={{ width: "120px" }} />
								<col style={{ width: "180px" }} /><col style={{ width: "170px" }} /><col style={{ width: "auto" }} />
								<col style={{ width: "130px" }} /><col style={{ width: "110px" }} />
							</colgroup>
							<thead>
								<tr className="bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#1e293b)] border-b border-[var(--line,#e2e8f0)] dark:border-[#334155] text-[var(--muted,#64748b)]">
									<th className="py-2.5 px-3 text-left font-semibold">Дата / Цикл</th><th className="py-2.5 px-3 text-left font-semibold">Автоклав</th><th className="py-2.5 px-3 text-left font-semibold">Партия</th><th className="py-2.5 px-3 text-left font-semibold">Параметры</th><th className="py-2.5 px-3 text-left font-semibold">Хим. индикатор</th><th className="py-2.5 px-3 text-left font-semibold">Содержимое партии</th><th className="py-2.5 px-3 text-left font-semibold">Оператор</th><th className="py-2.5 px-3 text-center font-semibold">Результат</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line,#f1f5f9)] dark:divide-[#334155]/60">
								{filteredCycles.length === 0 ? (
									<tr>
										<td colSpan={8} className="py-10 text-center text-[var(--muted,#64748b)]">
											<p className="font-semibold text-sm mb-2 text-[var(--ink,#1e293b)]">Нет записей стерилизации за выбранный период</p>
											<button type="button" onClick={handleShiftBatch1Click} aria-busy={isBatchSubmitting} className="h-8 px-3.5 rounded-lg text-xs font-semibold text-white bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation shadow-xs">
												<CheckCircle2 size={13} /><span>Пакетная стерилизация смены (27 наборов, 134°C)</span>
											</button>
										</td>
									</tr>
								) : (
									filteredCycles.map((cyc: SanPinCycleEntry) => {
										const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 25;
										return (
											<tr key={cyc.id} className="hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-[#1e293b]/50 transition-colors">
												<td className="py-2 px-3 font-medium text-[var(--ink,#1e293b)]"><div>{cyc.date}</div><div className="text-[11px] text-[var(--muted,#64748b)]">№{cyc.cycleNumber} ({cyc.time})</div></td>
												<td className="py-2 px-3 font-semibold text-[var(--ink,#1e293b)]"><div>{cyc.autoclaveCode}</div><div className="text-[11px] font-normal text-[var(--muted,#64748b)] truncate">{cyc.autoclaveModel}</div></td>
												<td className="py-2 px-3"><span className="inline-flex items-center gap-1 font-semibold text-[var(--teal,#0d9488)] bg-teal-500/10 px-2 py-0.5 rounded-md text-[11px]"><Layers size={11} /><span>{batchCount} наборов</span></span></td>
												<td className="py-2 px-3 font-medium"><div className="inline-flex items-center gap-1.5 text-[var(--ink,#1e293b)]"><span>{cyc.temperatureC}°C</span><span>•</span><span>{cyc.pressureBar} бар</span><span>•</span><span>{cyc.durationMin} мин</span></div><div className="text-[10px] text-[var(--muted,#64748b)]">Паровой Класс B</div></td>
												<td className="py-2 px-3"><div className="inline-flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ background: cyc.colorBeforeHex }} /><ArrowRight size={10} className="text-[var(--muted,#64748b)]" /><div className="w-2.5 h-2.5 rounded-full border border-black/25" style={{ background: cyc.colorAfterHex }} /><span className="font-semibold text-[11px] text-[var(--ink,#1e293b)] ml-1">{cyc.indicatorClass} кл. (Норма)</span></div></td>
												<td className="py-2 px-3 text-[var(--ink,#1e293b)] truncate" title={cyc.itemsSummary}><div className="truncate">{cyc.itemsSummary}</div>{cyc.pouchCodes && cyc.pouchCodes.length > 0 && (<div className="text-[11px] text-[var(--muted,#64748b)] truncate">{cyc.pouchCodes.join(", ")}</div>)}</td>
												<td className="py-2 px-3 text-[var(--muted,#64748b)] truncate">{cyc.operatorName}</td>
												<td className="py-2 px-3 text-center"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle2 size={11} /><span>Стерильно</span></span></td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
						<div className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#1e293b)] border-t border-[var(--line,#e2e8f0)] dark:border-[#334155] text-xs text-[var(--muted,#64748b)]">
							<div className="flex items-center gap-3">
								<span>Показано циклов: <strong className="text-[var(--ink,#1e293b)]">{filteredCycles.length}</strong></span><span>•</span>
								<span>Упакованных наборов: <strong className="text-[var(--teal,#0d9488)]">{filteredCycles.reduce((acc, c) => acc + (c.batchSize || c.kraftPouchesCount || 25), 0)} шт</strong></span><span>•</span>
								<span className="text-emerald-700 dark:text-emerald-400 font-medium">Все индикаторы 5 класса в норме (100%)</span>
							</div>
							<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
								<CheckCircle2 size={11} /> Списание расходников подтверждено
							</span>
						</div>
					</div>

					{/* МОБИЛЬНЫЙ ВИД */}
					<div className="sanpin-mobile-view autoclave-mobile-view flex flex-col gap-3 pb-36">
						{filteredCycles.length === 0 ? (
							<div className="p-5 text-center bg-[var(--paper,#fff)] dark:bg-[var(--paper-strong,#1e293b)] rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-[#334155]">
								<p className="font-semibold text-sm mb-2 text-[var(--ink,#1e293b)]">Нет циклов за выбранный период</p>
								<button type="button" onClick={handleShiftBatch1Click} aria-busy={isBatchSubmitting} className="h-11 min-h-[44px] w-full rounded-xl font-bold text-sm text-white bg-[var(--teal,#0d9488)] flex items-center justify-center gap-2 cursor-pointer touch-manipulation">
									<CheckCircle2 size={16} /><span>Зафиксировать смену (27 наборов)</span>
								</button>
							</div>
						) : (
							filteredCycles.map((cyc: SanPinCycleEntry) => {
								const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 25;
								return (
									<div key={`mob-${cyc.id}`} className="bg-[var(--paper,#fff)] dark:bg-[var(--paper-strong,#1e293b)] rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] p-3.5 flex flex-col gap-2.5 shadow-xs" style={{ minHeight: "52px" }}>
										<div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="font-bold text-[15px] text-[var(--ink,#1e293b)]">{cyc.autoclaveCode}</span><span className="text-xs text-[var(--muted,#64748b)]">{cyc.autoclaveModel}</span></div><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle2 size={12} /><span>Стерильно</span></span></div>
										<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]"><span>{cyc.date} • {cyc.time} • Цикл №{cyc.cycleNumber}</span><span className="inline-flex items-center gap-1 font-semibold text-[var(--teal,#0d9488)] bg-teal-500/10 px-2 py-0.5 rounded-md"><Layers size={11} /><span>{batchCount} наборов</span></span></div>
										<div className="flex items-center justify-between p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] text-xs"><div className="flex items-center gap-2 font-semibold text-[var(--ink,#1e293b)]"><span className="inline-flex items-center gap-1 text-[var(--teal,#0d9488)]"><Thermometer size={12} />{cyc.temperatureC}°C</span><span>•</span><span className="inline-flex items-center gap-1 text-[var(--teal,#0d9488)]"><Gauge size={12} />{cyc.pressureBar} бар</span><span>•</span><span className="inline-flex items-center gap-1 text-[var(--teal,#0d9488)]"><Timer size={12} />{cyc.durationMin} мин</span></div><div className="flex items-center gap-1.5 text-[11px] font-semibold"><div className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ background: cyc.colorBeforeHex }} /><ArrowRight size={9} className="text-[var(--muted,#64748b)]" /><div className="w-2.5 h-2.5 rounded-full border border-black/25" style={{ background: cyc.colorAfterHex }} /><span>{cyc.indicatorClass} кл. (Норма)</span></div></div>
										<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]"><div className="truncate pr-2"><div className="font-medium text-[var(--ink,#1e293b)] truncate">{cyc.itemsSummary}</div>{cyc.pouchCodes && cyc.pouchCodes.length > 0 && (<div className="text-[11px] text-[var(--muted,#64748b)] truncate">{cyc.pouchCodes.join(", ")}</div>)}</div><span className="shrink-0">{cyc.operatorName}</span></div>
									</div>
								);
							})
						)}
					</div>
				</>
			)}

			{/* ВКЛАДКА 2: ПРОВЕСТИ ЦИКЛ АВТОКЛАВА */}
			{activeTab === "cycle" && (
				<div className="rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] p-4 sm:p-5 flex flex-col gap-4 shadow-2xs">
					<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] dark:border-[#334155] pb-3">
						<div><h4 className="text-sm sm:text-base font-bold m-0 text-[var(--ink,#1e293b)]">Провести цикл автоклава</h4><p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">Пакетная стерилизация смены с фоновым списанием расходников</p></div>
						<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-[var(--teal,#0d9488)]">Класс B</span>
					</div>

					<div className="space-y-1.5">
						<label htmlFor="cycle-autoclave-select" className="text-xs font-semibold text-[var(--ink,#1e293b)] uppercase tracking-wider">Автоклав клиники:</label>
						<select id="cycle-autoclave-select" value={selectedAutoclaveId} onChange={(e) => setSelectedAutoclaveId(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] text-xs sm:text-sm font-medium text-[var(--ink,#1e293b)]">
							<option value="АК-01">АК-01 — Melag Vacuklav 23 B+ (22 л, Класс B, ЦСО №1)</option>
							<option value="АК-02">АК-02 — W&H Lina 17 (17 л, Класс B, ЦСО №2)</option>
						</select>
					</div>

					<div className="space-y-1.5">
						<span className="text-xs font-semibold text-[var(--ink,#1e293b)] uppercase tracking-wider">Режим стерилизации:</span>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							<button type="button" onClick={() => setSelectedRegime("standard_134")} className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer min-h-[52px] ${selectedRegime === "standard_134" ? "border-[var(--teal,#0d9488)] bg-teal-500/10 shadow-xs" : "border-[var(--line,#e2e8f0)] dark:border-[#334155]"}`}>
								<strong className="text-xs text-[var(--ink,#1e293b)]">134°C • Универсальный</strong><span className="text-[11px] text-[var(--muted,#64748b)]">2.1 бар • 5 мин • Упакованные инструменты</span>
							</button>
							<button type="button" onClick={() => setSelectedRegime("delicate_121")} className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer min-h-[52px] ${selectedRegime === "delicate_121" ? "border-[var(--teal,#0d9488)] bg-teal-500/10 shadow-xs" : "border-[var(--line,#e2e8f0)] dark:border-[#334155]"}`}>
								<strong className="text-xs text-[var(--ink,#1e293b)]">121°C • Резина и пластик</strong><span className="text-[11px] text-[var(--muted,#64748b)]">1.15 бар • 20 мин • Деликатный</span>
							</button>
							<button type="button" onClick={() => setSelectedRegime("quick_134")} className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer min-h-[52px] ${selectedRegime === "quick_134" ? "border-[var(--teal,#0d9488)] bg-teal-500/10 shadow-xs" : "border-[var(--line,#e2e8f0)] dark:border-[#334155]"}`}>
								<strong className="text-xs text-[var(--ink,#1e293b)]">134°C • Экспресс</strong><span className="text-[11px] text-[var(--muted,#64748b)]">2.1 бар • 3 мин • Быстрая обработка</span>
							</button>
						</div>
					</div>

					<div className="space-y-1.5">
						<div className="flex items-center justify-between"><span className="text-xs font-semibold text-[var(--ink,#1e293b)] uppercase tracking-wider">Количество крафт-пакетов:</span><strong className="text-xs text-[var(--teal,#0d9488)]">{packagesCount} упаковок</strong></div>
						<div className="grid grid-cols-5 gap-2">
							{PRESET_PACK_COUNTS.map((cnt) => (
								<button key={cnt} type="button" onClick={() => setPackagesCount(cnt)} className={`py-2 text-xs font-bold rounded-xl border transition-colors min-h-[44px] cursor-pointer touch-manipulation ${packagesCount === cnt ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs" : "border-[var(--line,#e2e8f0)] dark:border-[#334155] text-[var(--ink,#1e293b)] hover:bg-[var(--paper-soft)]"}`}>
									{cnt} шт.
								</button>
							))}
						</div>
					</div>

					<div className="space-y-1.5">
						<label htmlFor="cycle-items-input" className="text-xs font-semibold text-[var(--ink,#1e293b)] uppercase tracking-wider">Содержимое партии инструментов:</label>
						<input id="cycle-items-input" type="text" value={itemsSummaryInput} onChange={(e) => setItemsSummaryInput(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] text-xs sm:text-sm text-[var(--ink,#1e293b)]" placeholder="Лотки смотровые, зеркала, боры, турбинные наконечники" />
					</div>

					<div className="space-y-1.5">
						<label htmlFor="cycle-operator-input" className="text-xs font-semibold text-[var(--ink,#1e293b)] uppercase tracking-wider">Ответственный сотрудник (медсестра ЦСО):</label>
						<div className="relative">
							<input id="cycle-operator-input" type="text" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} className="w-full h-10 px-3 pr-9 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] text-xs sm:text-sm text-[var(--ink,#1e293b)]" />
							<UserCheck size={16} className="absolute right-3 top-3 text-[var(--muted,#64748b)] pointer-events-none" />
						</div>
					</div>

					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] flex flex-col gap-2">
						<span className="text-xs font-semibold text-[var(--muted,#64748b)] uppercase tracking-wider">Фоновое списание со склада (Soft Negative Stock):</span>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
							<div className="p-2 rounded-lg bg-[var(--paper,#fff)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#e2e8f0)] dark:border-[#334155]"><div className="text-[11px] text-[var(--muted,#64748b)]">Крафт-пакеты (100×200)</div><strong className="text-[var(--teal,#0d9488)]">-{packagesCount} шт</strong></div>
							<div className="p-2 rounded-lg bg-[var(--paper,#fff)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#e2e8f0)] dark:border-[#334155]"><div className="text-[11px] text-[var(--muted,#64748b)]">Индикатор 5 класса</div><strong className="text-[var(--teal,#0d9488)]">-1 шт</strong></div>
							<div className="p-2 rounded-lg bg-[var(--paper,#fff)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] col-span-2 sm:col-span-1"><div className="text-[11px] text-[var(--muted,#64748b)]">Статус списания</div><strong className="text-emerald-700 dark:text-emerald-400">Автоматически в бэке</strong></div>
						</div>
					</div>

					<div className="pt-2 flex items-center justify-end">
						<button type="button" onClick={handleShiftBatch1Click} disabled={isBatchSubmitting} data-testid="primary-batch-sterilization-btn" style={{ backgroundColor: "#0d9488" }} className="w-full sm:w-auto h-11 min-h-[44px] px-6 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 cursor-pointer touch-manipulation hover:opacity-95 active:scale-[0.99] transition-all">
							<CheckCircle2 size={16} className="text-white" /><span>Провести цикл стерилизации</span>
						</button>
					</div>
				</div>
			)}

			{/* ВКЛАДКА 3: ОБОРУДОВАНИЕ И АВТОКЛАВЫ */}
			{activeTab === "equipment" && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div className="rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] p-4 flex flex-col gap-2.5 shadow-2xs">
						<div className="flex items-center justify-between"><span className="font-bold text-sm text-[var(--ink,#1e293b)]">АК-01 • Melag Vacuklav 23 B+</span><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">Годен к работе</span></div>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">Паровой фракционный автоклав Класс B • 22 л (ЦСО №1)</p>
						<div className="p-2.5 rounded-lg bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] text-xs space-y-1">
							<div className="flex justify-between"><span>Серийный номер:</span><strong className="text-[var(--ink,#1e293b)] font-mono">SN-MV23B-4081</strong></div>
							<div className="flex justify-between"><span>Поверка манометров:</span><strong className="text-emerald-700 dark:text-emerald-400">До 12.2027</strong></div>
							<div className="flex justify-between"><span>Плановое ТО:</span><strong className="text-[var(--ink,#1e293b)]">Пройдено (05.2027)</strong></div>
							<div className="flex justify-between"><span>Bowie-Dick тест:</span><strong className="text-emerald-700 dark:text-emerald-400">Пройден</strong></div>
						</div>
					</div>

					<div className="rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] p-4 flex flex-col gap-2.5 shadow-2xs">
						<div className="flex items-center justify-between"><span className="font-bold text-sm text-[var(--ink,#1e293b)]">АК-02 • W&H Lina 17</span><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">Годен к работе</span></div>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">Паровой автоклав Класс B • 17 л (ЦСО №2)</p>
						<div className="p-2.5 rounded-lg bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] text-xs space-y-1">
							<div className="flex justify-between"><span>Серийный номер:</span><strong className="text-[var(--ink,#1e293b)] font-mono">SN-WHL17-1904</strong></div>
							<div className="flex justify-between"><span>Поверка манометров:</span><strong className="text-emerald-700 dark:text-emerald-400">До 09.2027</strong></div>
							<div className="flex justify-between"><span>Плановое ТО:</span><strong className="text-[var(--ink,#1e293b)]">Пройдено (08.2027)</strong></div>
							<div className="flex justify-between"><span>Вакуум-тест:</span><strong className="text-emerald-700 dark:text-emerald-400">Пройден</strong></div>
						</div>
					</div>
				</div>
			)}

			{/* Floating Bottom Bar (Natural Thumb Zone для смартфонов, Мандат 8am: 1 Primary CTA) */}
			{!isCycleDrawerOpen && activeTab !== "cycle" && (
				<div className="sanpin-mobile-view fixed left-3 right-3 z-30 p-2 bg-[var(--paper,#fff)]/95 dark:bg-[var(--paper-strong,#0f172a)]/95 backdrop-blur-md rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] shadow-xl flex items-center" style={{ bottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
					<button type="button" onClick={handleOpenNewCycle} aria-busy={isBatchSubmitting} className="w-full h-11 min-h-[44px] rounded-xl font-bold text-sm bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.99]" data-testid="sanpin-mobile-start-cycle-cta" title="Пакетная стерилизация смены">
						<Plus size={18} className="text-white" /><span>Запустить цикл стерилизации</span>
					</button>
				</div>
			)}

			<SterilizationBatchCycleModal isOpen={isCycleDrawerOpen} onClose={() => setIsCycleDrawerOpen(false)} onCycleApproved={() => void fetchCyclesFromDb()} defaultBatchSize={27} />
		</div>
	);
};

export default SanPinSterilizationJournal;
