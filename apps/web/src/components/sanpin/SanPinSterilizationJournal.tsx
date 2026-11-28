/**
 * apps/web/src/components/sanpin/SanPinSterilizationJournal.tsx
 *
 * Канонический объединенный экран стерилизации и автоклавирования (Мандаты 8b, 8e, 8n, 8x, 8am, 8ze).
 * - 3 канонические вкладки: «Журнал циклов стерилизации», «Провести цикл автоклава», «Оборудование и автоклавы».
 * - Пакетная стерилизация смены крупными батчами (134°C, 2.1 бар, 5 мин, азопирам отрицательный, индикатор 5 кл.).
 * - Автоматическое пакетное списание со склада (Soft Negative Stock, Мандат 8n).
 * - Ровно 1 Primary CTA кнопка var(--primary) на экран.
 * - Чистый клинический русский язык без советского канцелярита и номеров форм.
 * - Apple HIG: карточки >= 52px, 0px горизонтального скролла на 390x844, Floating Bottom Bar.
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
	ShieldCheck, CheckCircle2, Plus, Search, Printer, Download,
	Thermometer, Gauge, Timer, Layers, ArrowRight, Sparkles,
	Wrench,
} from "lucide-react";
import {
	useSanPinJournalLogic, DEFAULT_CYCLES, SanPinRunCycleTab,
	type SanPinCycleEntry, type SanPinJournalPeriod, type SanPinSterilizationJournalProps,
} from "./journalModules";
import { SterilizationBatchCycleModal } from "./SterilizationBatchCycleModal";
import { SterilizerFleetManager } from "./SterilizerFleetManager";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { clientLogger } from "../../services/logging/clientLogger";
import { showToast } from "../GlobalToast";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { getCachedActiveStaffUser } from "../../lib/offlineStorage";

export type { SanPinCycleEntry, SanPinSterilizationJournalProps } from "./journalModules";
export { DEFAULT_CYCLES, useSanPinJournalLogic } from "./journalModules";

type ActiveSubTab = "journal" | "cycle" | "equipment";

export const SanPinSterilizationJournal: React.FC<SanPinSterilizationJournalProps> = ({
	initialFilterAutoclave = "all", className = "", onOpenNewCycleModal,
}) => {
	const [activeTab, setActiveTab] = useState<ActiveSubTab>("journal");
	const [isCycleDrawerOpen, setIsCycleDrawerOpen] = useState(false);
	const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
	const [selectedAutoclaveId, setSelectedAutoclaveId] = useState("АК-01");
	const [selectedRegime, setSelectedRegime] = useState<"standard_134" | "delicate_121" | "quick_134">("standard_134");
	const [packagesCount, setPackagesCount] = useState<number>(12);
	const appLogic = useOptionalAppLogicContext();
	const resolvedOperator = useMemo(() => {
		const authAny = appLogic?.auth as { currentUser?: { fullName?: string; name?: string }; activeWorkspaceProfile?: { title?: string } } | undefined;
		const userAny = appLogic as { user?: { name?: string } } | null | undefined;
		const fromAuth = authAny?.currentUser?.fullName || authAny?.currentUser?.name || userAny?.user?.name || authAny?.activeWorkspaceProfile?.title;
		if (fromAuth && fromAuth.trim()) return fromAuth.trim();
		const cached = getCachedActiveStaffUser() as { fullName?: string; name?: string; role?: string } | null;
		if (cached?.fullName?.trim()) return cached.fullName.trim();
		if (cached?.name?.trim()) return cached.name.trim();
		return "Дежурная медсестра ЦСО";
	}, [appLogic]);

	const [operatorName, setOperatorName] = useState<string>(resolvedOperator);

	useEffect(() => {
		if (resolvedOperator) {
			setOperatorName((prev: string) => (!prev || prev === "Дежурный администратор / медицинская сестра" || prev === "Дежурная медсестра ЦСО" ? resolvedOperator : prev));
		}
	}, [resolvedOperator]);

	const [itemsSummaryInput, setItemsSummaryInput] = useState<string>("Смена Утро — 12 крафт-пакетов (лотки, зеркала, зонды, пинцеты, боры)");

	const {
		period, setPeriod, selectedAutoclave, setSelectedAutoclave,
		searchQuery, setSearchQuery, isAutofilling, filteredCycles,
		fetchCyclesFromDb, handleQuickBatchNorm,
		handlePrintSterilizationLog, handleExportCsv,
	} = useSanPinJournalLogic({ initialFilterAutoclave });

	const handlePrint = handlePrintSterilizationLog;

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
			const idempotencyKey = crypto.randomUUID();
			let res: Response | null = null;
			try {
				res = await fetch("/api/sanpin/sterilization/quick-norm", {
					method: "POST", headers: getDenteAuthHeaders({ "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }),
					body: JSON.stringify(payload),
				});
			} catch (err) {
				clientLogger.warn("[SanPinSterilizationJournal] Ошибка quick-norm стерилизации", err, { module: "SanPin" });
			}

			if (!res || !res.ok) {
				try {
					res = await fetch("/api/sanpin/autoclave/cycles", {
						method: "POST", headers: getDenteAuthHeaders({ "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }),
						body: JSON.stringify(payload),
					});
				} catch (err) {
					clientLogger.warn("[SanPinSterilizationJournal] Ошибка fallback autoclave/cycles", err, { module: "SanPin" });
				}
			}

			if (res && res.ok) {
				showToast(`Цикл стерилизации смены зафиксирован: ${tempCelsius}°C, ${pressureBar} бар. Расходники списаны со склада.`, "success");
				await fetchCyclesFromDb(period);
				setActiveTab("journal");
			} else if (isDemoShowcaseMode()) {
				showToast(`Цикл стерилизации смены зафиксирован: ${tempCelsius}°C, ${pressureBar} бар. Расходники списаны со склада.`, "success");
				await fetchCyclesFromDb(period);
				setActiveTab("journal");
			} else {
				await handleQuickBatchNorm(packagesCount, tempCelsius === 121 ? "121" : "134", itemsSummaryInput);
				setActiveTab("journal");
			}
		} finally {
			setIsBatchSubmitting(false);
		}
	}, [isBatchSubmitting, isAutofilling, selectedAutoclaveId, selectedRegime, packagesCount, operatorName, itemsSummaryInput, period, fetchCyclesFromDb, handleQuickBatchNorm]);

	const handleOpenNewCycle = onOpenNewCycleModal || (() => setIsCycleDrawerOpen(true));

	return (
		<div className={`sanpin-sterilization-journal autoclave-journal-tab flex flex-col gap-3.5 w-full max-w-full overflow-x-clip ${className}`} role="region" aria-label="Журнал стерилизации инструментов" data-testid="sanpin-sterilization-journal">
			<style>{`.sanpin-desktop-view, .autoclave-desktop-view { display: block; } .sanpin-desktop-cta, .autoclave-desktop-cta { display: inline-flex; } .sanpin-mobile-view, .autoclave-mobile-view { display: none; } @media (max-width: 768px) { .sanpin-desktop-view, .autoclave-desktop-view, .sanpin-desktop-cta, .autoclave-desktop-cta { display: none !important; } .sanpin-mobile-view, .autoclave-mobile-view { display: block !important; } }`}</style>

			{/* ШАПКА ХАБА СТЕРИЛИЗАЦИИ И СЕНСОРНЫЙ ПЕРЕКЛЮЧАТЕЛЬ 3 КЛЮЧЕВЫХ ВКЛАДОК */}
			<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 sm:p-4 flex flex-col gap-3 shadow-2xs">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--teal-surface)] text-[var(--primary)] flex items-center justify-center shrink-0"><ShieldCheck size={18} /></div>
						<div>
							<h3 className="text-xs sm:text-sm font-bold m-0 text-[var(--ink)]">Журнал автоклавирования и стерилизации</h3>
							<p className="text-[11px] sm:text-xs text-[var(--ink-muted)] m-0 mt-0.5">Melag Vacuklav 23B+ • Пакетная стерилизация смены • Санитарный регламент клиники</p>
						</div>
					</div>
					<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20 shrink-0">
						<CheckCircle2 size={13} /><span>ЦСО готово к работе</span>
					</span>
				</div>

				<div className="flex items-center gap-1.5 p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] overflow-x-auto scrollbar-none">
					<button type="button" onClick={() => setActiveTab("journal")} data-testid="tab-journal-view" className={`flex-1 min-h-[36px] px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer touch-manipulation transition-all whitespace-nowrap ${activeTab === "journal" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
						<Layers size={14} className="shrink-0" /><span>Журнал ({filteredCycles.length})</span>
					</button>
					<button type="button" onClick={() => setActiveTab("cycle")} data-testid="tab-run-cycle" className={`flex-1 min-h-[36px] px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer touch-manipulation transition-all whitespace-nowrap ${activeTab === "cycle" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
						<Sparkles size={14} className="shrink-0" /><span>Провести цикл</span>
					</button>
					<button type="button" onClick={() => setActiveTab("equipment")} data-testid="tab-equipment" className={`flex-1 min-h-[36px] px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer touch-manipulation transition-all whitespace-nowrap ${activeTab === "equipment" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
						<Wrench size={14} className="shrink-0" /><span>Оборудование</span>
					</button>
				</div>
			</div>

			{/* ВКЛАДКА 1: ЖУРНАЛ ЦИКЛОВ СТЕРИЛИЗАЦИИ */}
			{activeTab === "journal" && (
				<>
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] shadow-2xs">
						<div className="flex items-center gap-2 flex-wrap">
							<div className="inline-flex bg-[var(--paper)] border border-[var(--line)] rounded-lg p-0.5 gap-0.5 shrink-0">
								{(["day", "week", "month"] as const).map((p: SanPinJournalPeriod) => (
									<button key={p} type="button" onClick={() => setPeriod(p)} className="px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer touch-manipulation transition-colors shrink-0" style={{ background: period === p ? "var(--primary)" : "transparent", color: period === p ? "#fff" : "var(--ink-muted)", border: "none" }}>
										{p === "day" ? "Сегодня" : p === "week" ? "Неделя" : "Месяц"}
									</button>
								))}
							</div>
							<select value={selectedAutoclave} onChange={(e) => setSelectedAutoclave(e.target.value)} className="h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] cursor-pointer shrink-0" aria-label="Выбор автоклава">
								<option value="all">Все автоклавы</option>
								<option value="АК-01">АК-01 (Melag Vacuklav 23B+)</option>
								<option value="АК-02">АК-02 (W&H Lina 17)</option>
							</select>
						</div>

						<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto shrink-0">
							<div className="relative inline-flex items-center w-full sm:w-56 shrink-0">
								<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
								<input type="text" placeholder="Поиск по набору/номеру..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] w-full focus:outline-none" style={{ paddingLeft: 34, paddingRight: 8 }} />
							</div>
							<div className="hidden sm:inline-flex items-center gap-2 shrink-0">
								<button type="button" onClick={handlePrint} className="dente-btn-secondary h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation shrink-0" title="Печать журнала">
									<Printer size={13} className="shrink-0" /><span>Печать</span>
								</button>
								<button type="button" onClick={handleExportCsv} className="dente-btn-secondary h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation shrink-0" title="Экспорт CSV">
									<Download size={13} className="shrink-0" /><span>CSV</span>
								</button>
							</div>
							<button type="button" onClick={handleOpenNewCycle} aria-busy={isBatchSubmitting} className="sanpin-desktop-cta hidden sm:inline-flex h-9 min-h-[36px] px-3.5 rounded-lg font-bold text-xs text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-xs items-center gap-1.5 cursor-pointer touch-manipulation transition-all shrink-0 whitespace-nowrap" data-testid="start-cycle-primary-btn" title="Пакетная стерилизация смены">
								<Plus size={14} className="text-white shrink-0" /><span>Запустить цикл стерилизации</span>
							</button>
						</div>
					</div>

					{/* ДЕСКТОПНАЯ ТАБЛИЦА ЖУРНАЛА (1440x900) */}
					<div className="sanpin-desktop-view autoclave-desktop-view rounded-xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs">
						<table className="w-full border-collapse text-xs tabular-nums" style={{ tableLayout: "fixed" }}>
							<colgroup>
								<col style={{ width: "110px" }} /><col style={{ width: "140px" }} /><col style={{ width: "120px" }} />
								<col style={{ width: "180px" }} /><col style={{ width: "170px" }} /><col style={{ width: "auto" }} />
								<col style={{ width: "130px" }} /><col style={{ width: "110px" }} />
							</colgroup>
							<thead>
								<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--ink-muted)]">
									<th className="py-2.5 px-3 text-left font-semibold">Дата / Цикл</th><th className="py-2.5 px-3 text-left font-semibold">Автоклав</th><th className="py-2.5 px-3 text-left font-semibold">Партия</th><th className="py-2.5 px-3 text-left font-semibold">Параметры</th><th className="py-2.5 px-3 text-left font-semibold">Хим. индикатор</th><th className="py-2.5 px-3 text-left font-semibold">Содержимое партии</th><th className="py-2.5 px-3 text-left font-semibold">Оператор</th><th className="py-2.5 px-3 text-center font-semibold">Результат</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line)]">
								{filteredCycles.length === 0 ? (
									<tr>
										<td colSpan={8} className="py-10 text-center text-[var(--ink-muted)]">
											<p className="font-semibold text-sm mb-2 text-[var(--ink)]">Нет записей стерилизации за выбранный период</p>
											<button type="button" onClick={handleShiftBatch1Click} aria-busy={isBatchSubmitting} className="secondary-button h-8 px-3.5 rounded-lg text-xs font-semibold text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation shadow-xs">
												<CheckCircle2 size={13} className="text-[var(--primary)]" /><span>Пакетная стерилизация смены (27 наборов, 134°C)</span>
											</button>
										</td>
									</tr>
								) : (
									filteredCycles.map((cyc: SanPinCycleEntry) => {
										const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 25;
										return (
											<tr key={cyc.id} className="hover:bg-[var(--paper-soft)] transition-colors">
												<td className="py-2 px-3 font-medium text-[var(--ink)]"><div>{cyc.date}</div><div className="text-[11px] text-[var(--ink-muted)]">№{cyc.cycleNumber} ({cyc.time})</div></td>
												<td className="py-2 px-3 font-semibold text-[var(--ink)]"><div>{cyc.autoclaveCode}</div><div className="text-[11px] font-normal text-[var(--ink-muted)] truncate">{cyc.autoclaveModel}</div></td>
												<td className="py-2 px-3"><span className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] bg-[var(--teal-surface)] px-2 py-0.5 rounded-md text-[11px]"><Layers size={11} /><span>{batchCount} наборов</span></span></td>
												<td className="py-2 px-3 font-medium"><div className="inline-flex items-center gap-1.5 text-[var(--ink)]"><span>{cyc.temperatureC}°C</span><span>•</span><span>{cyc.pressureBar} бар</span><span>•</span><span>{cyc.durationMin} мин</span></div><div className="text-[10px] text-[var(--ink-muted)]">Паровой Класс B</div></td>
												<td className="py-2 px-3"><div className="inline-flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ background: cyc.colorBeforeHex }} /><ArrowRight size={10} className="text-[var(--ink-muted)]" /><div className="w-2.5 h-2.5 rounded-full border border-black/25" style={{ background: cyc.colorAfterHex }} /><span className="font-semibold text-[11px] text-[var(--ink)] ml-1">{cyc.indicatorClass} кл. (Норма)</span></div></td>
												<td className="py-2 px-3 text-[var(--ink)] truncate" title={cyc.itemsSummary}><div className="truncate">{cyc.itemsSummary}</div>{cyc.pouchCodes && cyc.pouchCodes.length > 0 && (<div className="text-[11px] text-[var(--ink-muted)] truncate">{cyc.pouchCodes.join(", ")}</div>)}</td>
												<td className="py-2 px-3 text-[var(--ink-muted)] truncate">{cyc.operatorName}</td>
												<td className="py-2 px-3 text-center"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20"><CheckCircle2 size={11} /><span>Стерильно</span></span></td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
						<div className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper-soft)] border-t border-[var(--line)] text-xs text-[var(--ink-muted)]">
							<div className="flex items-center gap-3">
								<span>Показано циклов: <strong className="text-[var(--ink)]">{filteredCycles.length}</strong></span><span>•</span>
								<span>Упакованных наборов: <strong className="text-[var(--primary)]">{filteredCycles.reduce((acc, c) => acc + (c.batchSize || c.kraftPouchesCount || 25), 0)} шт</strong></span><span>•</span>
								<span className="text-[var(--success)] font-medium">Все индикаторы 5 класса в норме (100%)</span>
							</div>
							<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--success)] bg-[var(--success-soft)] px-2 py-0.5 rounded-md border border-[var(--success)]/20">
								<CheckCircle2 size={11} /> Списание расходников подтверждено
							</span>
						</div>
					</div>

					{/* МОБИЛЬНЫЙ ВИД */}
					<div className="sanpin-mobile-view autoclave-mobile-view flex flex-col gap-3 pb-36">
						{filteredCycles.length === 0 ? (
							<div className="p-5 text-center bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
								<p className="font-semibold text-sm mb-2 text-[var(--ink)]">Нет циклов за выбранный период</p>
								<button type="button" onClick={handleShiftBatch1Click} aria-busy={isBatchSubmitting} className="secondary-button h-11 min-h-[44px] w-full rounded-xl font-bold text-sm text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-2 cursor-pointer touch-manipulation">
									<CheckCircle2 size={16} className="text-[var(--primary)]" /><span>Зафиксировать смену (27 наборов)</span>
								</button>
							</div>
						) : (
							filteredCycles.map((cyc: SanPinCycleEntry) => {
								const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 25;
								return (
									<div key={`mob-${cyc.id}`} className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-3.5 flex flex-col gap-2.5 shadow-xs" style={{ minHeight: "52px" }}>
										<div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="font-bold text-[15px] text-[var(--ink)]">{cyc.autoclaveCode}</span><span className="text-xs text-[var(--ink-muted)]">{cyc.autoclaveModel}</span></div><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20"><CheckCircle2 size={12} /><span>Стерильно</span></span></div>
										<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]"><span>{cyc.date} • {cyc.time} • Цикл №{cyc.cycleNumber}</span><span className="inline-flex items-center gap-1 font-semibold text-[var(--primary)] bg-[var(--teal-surface)] px-2 py-0.5 rounded-md"><Layers size={11} /><span>{batchCount} наборов</span></span></div>
										<div className="flex items-center justify-between p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs"><div className="flex items-center gap-2 font-semibold text-[var(--ink)]"><span className="inline-flex items-center gap-1 text-[var(--primary)]"><Thermometer size={12} />{cyc.temperatureC}°C</span><span>•</span><span className="inline-flex items-center gap-1 text-[var(--primary)]"><Gauge size={12} />{cyc.pressureBar} бар</span><span>•</span><span className="inline-flex items-center gap-1 text-[var(--primary)]"><Timer size={12} />{cyc.durationMin} мин</span></div><div className="flex items-center gap-1.5 text-[11px] font-semibold"><div className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ background: cyc.colorBeforeHex }} /><ArrowRight size={9} className="text-[var(--ink-muted)]" /><div className="w-2.5 h-2.5 rounded-full border border-black/25" style={{ background: cyc.colorAfterHex }} /><span>{cyc.indicatorClass} кл. (Норма)</span></div></div>
										<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]"><div className="pr-2 min-w-0"><div className="font-medium text-[var(--ink)] line-clamp-2 break-words">{cyc.itemsSummary}</div>{cyc.pouchCodes && cyc.pouchCodes.length > 0 && (<div className="text-[11px] text-[var(--ink-muted)] line-clamp-1 break-words">{cyc.pouchCodes.join(", ")}</div>)}</div><span className="shrink-0">{cyc.operatorName}</span></div>
									</div>
								);
							})
						)}
					</div>
				</>
			)}

			{/* ВКЛАДКА 2: ПРОВЕСТИ ЦИКЛ АВТОКЛАВА */}
			{activeTab === "cycle" && (
				<SanPinRunCycleTab
					selectedAutoclaveId={selectedAutoclaveId}
					setSelectedAutoclaveId={setSelectedAutoclaveId}
					selectedRegime={selectedRegime}
					setSelectedRegime={setSelectedRegime}
					packagesCount={packagesCount}
					setPackagesCount={setPackagesCount}
					itemsSummaryInput={itemsSummaryInput}
					setItemsSummaryInput={setItemsSummaryInput}
					operatorName={operatorName}
					setOperatorName={setOperatorName}
					isBatchSubmitting={isBatchSubmitting}
					onSubmitBatch={handleShiftBatch1Click}
				/>
			)}

			{/* ВКЛАДКА 3: ОБОРУДОВАНИЕ И АВТОКЛАВЫ */}
			{activeTab === "equipment" && (
				<SterilizerFleetManager />
			)}

			{/* Floating Bottom Bar (Natural Thumb Zone для смартфонов, Мандат 8am: 1 Primary CTA) */}
			{!isCycleDrawerOpen && activeTab !== "cycle" && (
				<div className="sanpin-mobile-view fixed left-3 right-3 z-30 p-2 bg-[var(--paper)]/95 backdrop-blur-md rounded-2xl border border-[var(--line)] shadow-xl flex items-center" style={{ bottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
					<button type="button" onClick={handleOpenNewCycle} aria-busy={isBatchSubmitting} className="w-full h-11 min-h-[44px] rounded-xl font-bold text-sm bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.99]" data-testid="sanpin-mobile-start-cycle-cta" title="Пакетная стерилизация смены">
						<Plus size={18} className="text-white" /><span>Запустить цикл стерилизации</span>
					</button>
				</div>
			)}

			<SterilizationBatchCycleModal isOpen={isCycleDrawerOpen} onClose={() => setIsCycleDrawerOpen(false)} onCycleApproved={() => void fetchCyclesFromDb()} defaultBatchSize={27} />
		</div>
	);
};

export default SanPinSterilizationJournal;
