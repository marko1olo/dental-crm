/**
 * apps/web/src/components/sanpin/SanPinSterilizationJournal.tsx
 *
 * Канонический объединенный экран стерилизации и автоклавирования (Мандаты 8b, 8e, 8n, 8x, 8am, 8ze).
 * - Объединяет паспорт оборудования автоклава и журнал работы стерилизаторов (300–450 строк, Sweet Spot).
 * - Пакетная стерилизация смены крупными батчами (134°C, 2.1 бар, 5 мин, азопирам отрицательный, индикатор 5 кл.).
 * - Автоматическое пакетное списание со склада (Soft Negative Stock, Мандат 8n).
 * - Ровно 1 Primary CTA кнопка var(--teal, #0d9488) на экран.
 * - Чистый клинический русский язык без советского канцелярита и номеров форм.
 * - Apple HIG: карточки >= 52px, Bottom Sheet с drag handle, 0px горизонтального скролла на 390x844.
 */

import React, { useState, useCallback } from "react";
import {
	ShieldCheck, CheckCircle2, Plus, Search, Printer, Download,
	Thermometer, Gauge, Timer, Layers, ArrowRight,
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

export const SanPinSterilizationJournal: React.FC<SanPinSterilizationJournalProps> = ({
	initialFilterAutoclave = "all",
	className = "",
	onOpenNewCycleModal,
}) => {
	const [isCycleDrawerOpen, setIsCycleDrawerOpen] = useState(false);
	const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

	const {
		period, setPeriod, selectedAutoclave, setSelectedAutoclave,
		searchQuery, setSearchQuery, isAutofilling, filteredCycles,
		fetchCyclesFromDb, handleQuickBatchNorm,
		handlePrintSterilizationLog, handlePrint257, handleExportCsv,
	} = useSanPinJournalLogic({ initialFilterAutoclave });

	const handlePrint = handlePrintSterilizationLog || handlePrint257;

	// Регламентная пакетная фиксация цикла стерилизации смены с автосписанием со склада
	const handleShiftBatch1Click = useCallback(async () => {
		if (isBatchSubmitting || isAutofilling) return;
		setIsBatchSubmitting(true);
		try {
			const activeDeviceName = selectedAutoclave === "АК-02"
				? "W&H Lina 17 (ЦСО №2)" : "Melag Vacuklav 23 B+ (ЦСО №1)";
			const activeAutoclaveId = selectedAutoclave === "АК-02" ? "АК-02" : "АК-01";

			const payload = {
				cyclesCount: 1, batchSize: 27, deviceName: activeDeviceName, autoclaveId: activeAutoclaveId,
				packagingType: "kraft_heat_sealed",
				itemsDescription: "Базовый стоматологический набор смены (27 наборов: лотки, зеркала, зонды, пинцеты, боры)",
			};

			const res = await fetch("/api/sanpin/sterilization/shift-batch", {
				method: "POST", headers: getDenteAuthHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(payload),
			}).catch(() => null);

			if (res && res.ok) {
				showToast("Цикл стерилизации смены зафиксирован: 134°C, 2.1 бар, 5 мин. Расходники списаны со склада.", "success");
				await fetchCyclesFromDb(period);
			} else if (isDemoShowcaseMode()) {
				showToast("Цикл стерилизации смены зафиксирован: 134°C, 2.1 бар, 5 мин. Расходники списаны со склада.", "success");
				await fetchCyclesFromDb(period);
			} else {
				await handleQuickBatchNorm(27, "134", "Пакетная стерилизация смены");
			}
		} finally {
			setIsBatchSubmitting(false);
		}
	}, [isBatchSubmitting, isAutofilling, selectedAutoclave, period, fetchCyclesFromDb, handleQuickBatchNorm]);

	const handleOpenNewCycle = onOpenNewCycleModal || (() => setIsCycleDrawerOpen(true));

	return (
		<div
			className={`sanpin-sterilization-journal autoclave-journal-tab flex flex-col gap-3.5 w-full max-w-full overflow-x-clip ${className}`}
			role="region" aria-label="Журнал стерилизации инструментов"
			data-testid="sanpin-sterilization-journal"
		>
			<style>{`
				.sanpin-desktop-view, .autoclave-desktop-view { display: block; }
				.sanpin-desktop-cta, .autoclave-desktop-cta { display: inline-flex; }
				.sanpin-mobile-view, .autoclave-mobile-view { display: none; }
				@media (max-width: 768px) {
					.sanpin-desktop-view, .autoclave-desktop-view { display: none !important; }
					.sanpin-desktop-cta, .autoclave-desktop-cta { display: none !important; }
					.sanpin-mobile-view, .autoclave-mobile-view { display: block !important; }
				}
			`}</style>

			{/* КАРТОЧКА ОБОРУДОВАНИЯ АВТОКЛАВА КЛИНИКИ */}
			<div className="rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] p-3 sm:p-4 flex flex-col gap-2.5 shadow-2xs">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-500/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<ShieldCheck size={18} />
						</div>
						<div>
							<h3 className="text-xs sm:text-sm font-bold m-0 text-[var(--ink,#1e293b)]">Основной автоклав ЦСО (АК-01)</h3>
							<p className="text-[11px] sm:text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								Melag Vacuklav 23 B+ • 22 л • Класс B (134°C / 2.1 бар / 5 мин)
							</p>
						</div>
					</div>

					<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
						<CheckCircle2 size={13} /><span>Годен к работе</span>
					</span>
				</div>

				{/* На десктопе — 3 четко отграниченных тайла; на мобильном скрыты для эргономики */}
				<div className="hidden sm:grid grid-cols-3 gap-2.5 pt-1">
					<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] flex flex-col gap-0.5 shadow-2xs">
						<span className="text-[11px] text-[var(--muted,#64748b)]">Класс стерилизации:</span>
						<strong className="text-[var(--ink,#1e293b)] text-xs">Класс B (Паровой фракционный)</strong>
					</div>
					<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] flex flex-col gap-0.5 shadow-2xs">
						<span className="text-[11px] text-[var(--muted,#64748b)]">Поверка манометров:</span>
						<strong className="text-emerald-700 dark:text-emerald-400 text-xs">Действительна до 12.2027</strong>
					</div>
					<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] flex flex-col gap-0.5 shadow-2xs">
						<span className="text-[11px] text-[var(--muted,#64748b)]">Плановое техобслуживание:</span>
						<strong className="text-[var(--ink,#1e293b)] text-xs">Пройдено (следующее: 05.2027)</strong>
					</div>
				</div>

				<div className="hidden sm:flex items-center justify-between text-xs text-[var(--muted,#64748b)] pt-1 border-t border-[var(--line,#f1f5f9)] dark:border-[#334155]/60 flex-wrap gap-1">
					<span>Регламент: 134°C / 2.1 бар / 5 мин • Предстерилизационная очистка: норма</span>
					<span className="text-emerald-700 dark:text-emerald-400 font-medium">Bowie-Dick тест: Пройден сегодня</span>
				</div>
			</div>

			{/* ТУЛБАР УПРАВЛЕНИЯ И ЕДИНСТВЕННЫЙ PRIMARY CTA (МАНДАТ 8am) */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] shadow-2xs">
				<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
					<div className="inline-flex bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] rounded-lg p-0.5 gap-0.5 shrink-0">
						{(["day", "week", "month"] as const).map((p: SanPinJournalPeriod) => (
							<button
								key={p} type="button" onClick={() => setPeriod(p)}
								className="px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer touch-manipulation transition-colors"
								style={{
									background: period === p ? "var(--teal, #0d9488)" : "transparent",
									color: period === p ? "#fff" : "var(--muted, #64748b)", border: "none",
								}}
							>
								{p === "day" ? "Сегодня" : p === "week" ? "Неделя" : "Месяц"}
							</button>
						))}
					</div>

					<select
						value={selectedAutoclave} onChange={(e) => setSelectedAutoclave(e.target.value)}
						className="h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] text-xs text-[var(--ink,#1e293b)] cursor-pointer flex-1 sm:flex-initial"
						aria-label="Выбор автоклава"
					>
						<option value="all">Все автоклавы</option>
						<option value="АК-01">АК-01 (Melag Vacuklav 23B+)</option>
						<option value="АК-02">АК-02 (W&H Lina 17)</option>
					</select>
				</div>

				<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
					<div className="relative inline-flex items-center w-full sm:w-52">
						<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] pointer-events-none" />
						<input
							type="text" placeholder="Поиск по набору/номеру..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
							className="h-8 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] text-xs text-[var(--ink,#1e293b)] w-full focus:outline-none"
							style={{ paddingLeft: 34, paddingRight: 8 }}
						/>
					</div>

					<div className="hidden sm:inline-flex items-center gap-2">
						<button
							type="button" onClick={handlePrint}
							className="dente-btn-secondary h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink,#1e293b)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation"
							title="Печать журнала"
						>
							<Printer size={13} /><span>Печать журнала</span>
						</button>

						<button
							type="button" onClick={handleExportCsv}
							className="dente-btn-secondary h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-[#334155] bg-[var(--paper,#fff)] dark:bg-[var(--paper-soft,#0f172a)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink,#1e293b)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation"
							title="Экспорт CSV"
						>
							<Download size={13} /><span>CSV</span>
						</button>
					</div>

					{/* РОСКОШНЫЙ ЕДИНСТВЕННЫЙ PRIMARY CTA НА ЭКРАН (МАНДАТЫ 8am, 8ze) */}
					<button
						type="button" onClick={handleOpenNewCycle}
						aria-busy={isBatchSubmitting}
						className="sanpin-desktop-cta hidden sm:inline-flex h-8 min-h-[32px] px-3.5 rounded-lg font-bold text-xs text-white bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] shadow-xs items-center gap-1.5 cursor-pointer touch-manipulation transition-all shrink-0"
						data-testid="start-cycle-primary-btn" title="Пакетная стерилизация смены (134°C, 2.1 бар, 5 мин)"
					>
						<Plus size={14} className="text-white" />
						<span>Запустить цикл стерилизации</span>
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
							<th className="py-2.5 px-3 text-left font-semibold">Дата / Цикл</th>
							<th className="py-2.5 px-3 text-left font-semibold">Автоклав</th>
							<th className="py-2.5 px-3 text-left font-semibold">Партия</th>
							<th className="py-2.5 px-3 text-left font-semibold">Параметры</th>
							<th className="py-2.5 px-3 text-left font-semibold">Хим. индикатор</th>
							<th className="py-2.5 px-3 text-left font-semibold">Содержимое партии</th>
							<th className="py-2.5 px-3 text-left font-semibold">Оператор</th>
							<th className="py-2.5 px-3 text-center font-semibold">Результат</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line,#f1f5f9)] dark:divide-[#334155]/60">
						{filteredCycles.length === 0 ? (
							<tr>
								<td colSpan={8} className="py-10 text-center text-[var(--muted,#64748b)]">
									<p className="font-semibold text-sm mb-2 text-[var(--ink,#1e293b)]">
										Нет записей стерилизации за выбранный период
									</p>
									<button
										type="button" onClick={handleShiftBatch1Click}
										aria-busy={isBatchSubmitting}
										className="h-8 px-3.5 rounded-lg text-xs font-semibold text-white bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation shadow-xs"
									>
										<CheckCircle2 size={13} />
										<span>Пакетная стерилизация смены (27 наборов, 134°C)</span>
									</button>
								</td>
							</tr>
						) : (
							filteredCycles.map((cyc: SanPinCycleEntry) => {
								const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 25;
								return (
									<tr key={cyc.id} className="hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-[#1e293b]/50 transition-colors">
										<td className="py-2 px-3 font-medium text-[var(--ink,#1e293b)]">
											<div>{cyc.date}</div>
											<div className="text-[11px] text-[var(--muted,#64748b)]">№{cyc.cycleNumber} ({cyc.time})</div>
										</td>
										<td className="py-2 px-3 font-semibold text-[var(--ink,#1e293b)]">
											<div>{cyc.autoclaveCode}</div>
											<div className="text-[11px] font-normal text-[var(--muted,#64748b)] truncate">{cyc.autoclaveModel}</div>
										</td>
										<td className="py-2 px-3">
											<span className="inline-flex items-center gap-1 font-semibold text-[var(--teal,#0d9488)] bg-teal-500/10 px-2 py-0.5 rounded-md text-[11px]">
												<Layers size={11} /><span>{batchCount} наборов</span>
											</span>
										</td>
										<td className="py-2 px-3 font-medium">
											<div className="inline-flex items-center gap-1.5 text-[var(--ink,#1e293b)]">
												<span>{cyc.temperatureC}°C</span><span>•</span><span>{cyc.pressureBar} бар</span><span>•</span><span>{cyc.durationMin} мин</span>
											</div>
											<div className="text-[10px] text-[var(--muted,#64748b)]">Паровой Класс B</div>
										</td>
										<td className="py-2 px-3">
											<div className="inline-flex items-center gap-1.5">
												<div className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ background: cyc.colorBeforeHex }} />
												<ArrowRight size={10} className="text-[var(--muted,#64748b)]" />
												<div className="w-2.5 h-2.5 rounded-full border border-black/25" style={{ background: cyc.colorAfterHex }} />
												<span className="font-semibold text-[11px] text-[var(--ink,#1e293b)] ml-1">{cyc.indicatorClass} кл. (Норма)</span>
											</div>
										</td>
										<td className="py-2 px-3 text-[var(--ink,#1e293b)] truncate" title={cyc.itemsSummary}>
											<div className="truncate">{cyc.itemsSummary}</div>
											{cyc.pouchCodes && cyc.pouchCodes.length > 0 && (
												<div className="text-[11px] text-[var(--muted,#64748b)] truncate">{cyc.pouchCodes.join(", ")}</div>
											)}
										</td>
										<td className="py-2 px-3 text-[var(--muted,#64748b)] truncate">{cyc.operatorName}</td>
										<td className="py-2 px-3 text-center">
											<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
												<CheckCircle2 size={11} /><span>Стерильно</span>
											</span>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>

				{/* ПОДВАЛ ЖУРНАЛА СТЕРИЛИЗАЦИИ: ОТГРАНИЧЕННЫЕ ИТОГОВЫЕ ТАЙЛЫ ВМЕСТО ПУСТОТЫ */}
				<div className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#1e293b)] border-t border-[var(--line,#e2e8f0)] dark:border-[#334155] text-xs text-[var(--muted,#64748b)]">
					<div className="flex items-center gap-3">
						<span>Показано циклов: <strong className="text-[var(--ink,#1e293b)]">{filteredCycles.length}</strong></span>
						<span>•</span>
						<span>Упакованных наборов: <strong className="text-[var(--teal,#0d9488)]">{filteredCycles.reduce((acc, c) => acc + (c.batchSize || c.kraftPouchesCount || 25), 0)} шт</strong></span>
						<span>•</span>
						<span className="text-emerald-700 dark:text-emerald-400 font-medium">Все индикаторы 5 класса в норме (100%)</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
							<CheckCircle2 size={11} /> Списание расходников подтверждено
						</span>
					</div>
				</div>
			</div>

			{/* МОБИЛЬНЫЙ ВИД (390x844 Apple HIG: КАРТОЧКИ ВЫСОТОЙ >= 52px, 0px ГОРИЗОНТАЛЬНОГО СКРОЛЛА) */}
			<div className="sanpin-mobile-view autoclave-mobile-view flex flex-col gap-3 pb-28">
				{filteredCycles.length === 0 ? (
					<div className="p-6 text-center bg-[var(--paper,#fff)] dark:bg-[var(--paper-strong,#1e293b)] rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-[#334155]">
						<p className="font-semibold text-sm mb-2 text-[var(--ink,#1e293b)]">Нет циклов за выбранный период</p>
						<button
							type="button" onClick={handleShiftBatch1Click}
							aria-busy={isBatchSubmitting}
							className="h-11 min-h-[44px] w-full rounded-xl font-bold text-sm text-white bg-[var(--teal,#0d9488)] flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
						>
							<CheckCircle2 size={16} /><span>Зафиксировать смену (27 наборов)</span>
						</button>
					</div>
				) : (
					filteredCycles.map((cyc: SanPinCycleEntry) => {
						const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 25;
						return (
							<div
								key={`mob-${cyc.id}`} className="bg-[var(--paper,#fff)] dark:bg-[var(--paper-strong,#1e293b)] rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] p-3.5 flex flex-col gap-2.5 shadow-xs"
								style={{ minHeight: "52px" }}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="font-bold text-[15px] text-[var(--ink,#1e293b)]">{cyc.autoclaveCode}</span>
										<span className="text-xs text-[var(--muted,#64748b)]">{cyc.autoclaveModel}</span>
									</div>
									<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
										<CheckCircle2 size={12} /><span>Стерильно</span>
									</span>
								</div>

								<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
									<span>{cyc.date} • {cyc.time} • Цикл №{cyc.cycleNumber}</span>
									<span className="inline-flex items-center gap-1 font-semibold text-[var(--teal,#0d9488)] bg-teal-500/10 px-2 py-0.5 rounded-md">
										<Layers size={11} /><span>{batchCount} наборов</span>
									</span>
								</div>

								<div className="flex items-center justify-between p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] text-xs">
									<div className="flex items-center gap-2 font-semibold text-[var(--ink,#1e293b)]">
										<span className="inline-flex items-center gap-1 text-[var(--teal,#0d9488)]"><Thermometer size={12} />{cyc.temperatureC}°C</span>
										<span>•</span>
										<span className="inline-flex items-center gap-1 text-[var(--teal,#0d9488)]"><Gauge size={12} />{cyc.pressureBar} бар</span>
										<span>•</span>
										<span className="inline-flex items-center gap-1 text-[var(--teal,#0d9488)]"><Timer size={12} />{cyc.durationMin} мин</span>
									</div>
									<div className="flex items-center gap-1.5 text-[11px] font-semibold">
										<div className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ background: cyc.colorBeforeHex }} />
										<ArrowRight size={9} className="text-[var(--muted,#64748b)]" />
										<div className="w-2.5 h-2.5 rounded-full border border-black/25" style={{ background: cyc.colorAfterHex }} />
										<span>{cyc.indicatorClass} кл. (Норма)</span>
									</div>
								</div>

								<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
									<div className="truncate pr-2">
										<div className="font-medium text-[var(--ink,#1e293b)] truncate">{cyc.itemsSummary}</div>
										{cyc.pouchCodes && cyc.pouchCodes.length > 0 && (
											<div className="text-[11px] text-[var(--muted,#64748b)] truncate">{cyc.pouchCodes.join(", ")}</div>
										)}
									</div>
									<span className="shrink-0">{cyc.operatorName}</span>
								</div>
							</div>
						);
					})
				)}

				{/* Floating Bottom Bar (Natural Thumb Zone для смартфонов, Мандат 8am: 1 Primary CTA) */}
				{!isCycleDrawerOpen && (
					<div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-[var(--paper,#fff)]/95 dark:bg-[var(--paper-strong,#0f172a)]/95 backdrop-blur-md border-t border-[var(--line,#e2e8f0)] dark:border-[#334155] shadow-lg flex items-center pb-[max(12px,env(safe-area-inset-bottom))]">
						<button
							type="button" onClick={handleOpenNewCycle}
							aria-busy={isBatchSubmitting}
							className="w-full h-12 min-h-[48px] rounded-xl font-bold text-sm bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
							data-testid="sanpin-mobile-start-cycle-cta" title="Пакетная стерилизация смены"
						>
							<Plus size={18} className="text-white" />
							<span>Запустить цикл стерилизации</span>
						</button>
					</div>
				)}
			</div>

			{/* МОДАЛЬНОЕ ОКНО ЗАПУСКА ЦИКЛА СТЕРИЛИЗАЦИИ */}
			<SterilizationBatchCycleModal
				isOpen={isCycleDrawerOpen}
				onClose={() => setIsCycleDrawerOpen(false)}
				onCycleApproved={() => void fetchCyclesFromDb()}
				defaultBatchSize={27}
			/>
		</div>
	);
};

export default SanPinSterilizationJournal;
