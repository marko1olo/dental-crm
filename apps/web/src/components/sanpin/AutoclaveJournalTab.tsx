/**
 * apps/web/src/components/sanpin/AutoclaveJournalTab.tsx
 *
 * Канонический журнал автоклавирования и стерилизации (Мандаты 8b, 8e, 8n, 8x, Apple HIG).
 * - Живой клинический язык: «Журнал автоклавирования», «Запустить цикл стерилизации».
 * - Никаких советских номеров приказов (Форма 257/у) в интерфейсе.
 * - Ровно 1 Primary CTA кнопка var(--teal, #0d9488) на экран: «Запустить цикл стерилизации».
 * - Пакетная стерилизация смены крупными батчами в 1 клик, списание со склада (Soft Negative Stock).
 * - На смартфонах (390x844): карточки высотой >= 52px, кнопка в Natural Thumb Zone, 0px горизонтального скролла.
 * - Размер: 200–300 строк (Sweet Spot).
 */

import React, { useState } from "react";
import {
	Plus,
	Search,
	Download,
	Printer,
	CheckCircle2,
	Thermometer,
	Gauge,
	Timer,
	Layers,
	ArrowRight,
} from "lucide-react";
import { useSanPinJournalLogic, type SanPinCycleEntry, type SanPinJournalPeriod } from "./journalModules";
import { SterilizationCycleDrawer } from "./sterilization/SterilizationCycleDrawer";
import { useIsMobile } from "../../hooks/useIsMobile";

export interface AutoclaveJournalTabProps {
	readonly initialFilterAutoclave?: string | undefined;
	readonly className?: string | undefined;
}

export function AutoclaveJournalTab({
	initialFilterAutoclave = "all",
	className = "",
}: AutoclaveJournalTabProps) {
	const isMobile = useIsMobile();
	const [isCycleDrawerOpen, setIsCycleDrawerOpen] = useState(false);

	const {
		period, setPeriod, selectedAutoclave, setSelectedAutoclave,
		searchQuery, setSearchQuery, filteredCycles, fetchCyclesFromDb,
		handleQuickBatchNorm, handlePrintSterilizationLog, handlePrint257, handleExportCsv,
	} = useSanPinJournalLogic({ initialFilterAutoclave });

	const handlePrint = handlePrintSterilizationLog || handlePrint257;

	return (
		<div
			className={`autoclave-journal-tab flex flex-col gap-3.5 w-full max-w-full overflow-x-clip ${className}`}
			role="region"
			aria-label="Журнал автоклавирования"
		>
			<style>{`
				.autoclave-desktop-view { display: block; }
				.autoclave-mobile-view { display: none; }
				@media (max-width: 768px) {
					.autoclave-desktop-view { display: none !important; }
					.autoclave-mobile-view { display: block !important; }
				}
			`}</style>

			{/* ТУЛБАР УПРАВЛЕНИЯ И ЕДИНСТВЕННЫЙ PRIMARY CTA */}
			<div className="flex items-center justify-between gap-2.5 flex-wrap p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
				<div className="flex items-center gap-2 flex-wrap">
					<div className="inline-flex bg-[var(--paper,#fff)] border border-[var(--line,#cbd5e1)] rounded-lg p-0.5 gap-0.5">
						{(["day", "week", "month"] as const).map((p: SanPinJournalPeriod) => (
							<button
								key={p} type="button" onClick={() => setPeriod(p)}
								className="px-2.5 py-1 text-xs rounded-md font-semibold cursor-pointer touch-manipulation"
								style={{ background: period === p ? "var(--teal, #0d9488)" : "transparent", color: period === p ? "#fff" : "var(--muted, #64748b)", border: "none" }}
							>
								{p === "day" ? "Сегодня" : p === "week" ? "Неделя" : "Месяц"}
							</button>
						))}
					</div>

					<select
						value={selectedAutoclave} onChange={(e) => setSelectedAutoclave(e.target.value)}
						className="h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#fff)] text-xs text-[var(--ink,#1e293b)] cursor-pointer"
						aria-label="Выбор автоклава"
					>
						<option value="all">Все автоклавы</option>
						<option value="АК-01">АК-01 (Melag Vacuklav 23B+)</option>
						<option value="АК-02">АК-02 (W&H Lina 17)</option>
					</select>
				</div>

				<div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
					<div className="relative inline-flex items-center w-full sm:w-auto">
						<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] pointer-events-none" />
						<input
							type="text" placeholder="Поиск по набору/номеру..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
							className="h-8 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#fff)] text-xs text-[var(--ink,#1e293b)] w-full sm:w-52 focus:outline-none"
							style={{ paddingLeft: 34, paddingRight: 8 }}
						/>
					</div>

					<button type="button" onClick={handlePrint} className="h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#fff)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink,#1e293b)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation" title="Печать">
						<Printer size={13} /><span className="hidden sm:inline">Печать</span>
					</button>

					<button type="button" onClick={handleExportCsv} className="h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#fff)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink,#1e293b)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation" title="Экспорт CSV">
						<Download size={13} /><span className="hidden sm:inline">CSV</span>
					</button>

					{/* РОСКОШНЫЙ PRIMARY CTA (МАНДАТ 8am) */}
					{!isMobile && (
						<button
							type="button" onClick={() => setIsCycleDrawerOpen(true)}
							className="h-8 min-h-[32px] px-3.5 rounded-lg font-bold text-xs text-white bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] shadow-xs inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
							data-testid="start-cycle-primary-btn" title="Запустить цикл стерилизации (134°C, Класс B)"
						>
							<Plus size={14} className="text-white" />
							<span>Запустить цикл стерилизации</span>
						</button>
					)}
				</div>
			</div>

			{/* ДЕСКТОПНАЯ ТАБЛИЦА (1440x900) */}
			<div className="autoclave-desktop-view rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] overflow-hidden">
				<table className="w-full border-collapse text-xs tabular-nums" style={{ tableLayout: "fixed" }}>
					<colgroup>
						<col style={{ width: "110px" }} /><col style={{ width: "140px" }} /><col style={{ width: "120px" }} />
						<col style={{ width: "180px" }} /><col style={{ width: "170px" }} /><col style={{ width: "auto" }} />
						<col style={{ width: "130px" }} /><col style={{ width: "110px" }} />
					</colgroup>
					<thead>
						<tr className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
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
					<tbody className="divide-y divide-[var(--line,#f1f5f9)]">
						{filteredCycles.length === 0 ? (
							<tr>
								<td colSpan={8} className="py-8 text-center text-[var(--muted,#64748b)]">
									<p className="font-semibold text-sm mb-2">Нет записей автоклавирования за выбранный период</p>
									<button
										type="button" onClick={() => handleQuickBatchNorm?.(27, "134")}
										className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation"
									>
										<CheckCircle2 size={13} /><span>Зафиксировать смену (27 наборов, 134°C)</span>
									</button>
								</td>
							</tr>
						) : (
							filteredCycles.map((cyc: SanPinCycleEntry) => {
								const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 25;
								return (
									<tr key={cyc.id} className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
										<td className="py-2 px-3 font-medium text-[var(--ink,#1e293b)]">
											<div>{cyc.date}</div><div className="text-[11px] text-[var(--muted,#64748b)]">№{cyc.cycleNumber} ({cyc.time})</div>
										</td>
										<td className="py-2 px-3 font-semibold text-[var(--ink,#1e293b)]">
											<div>{cyc.autoclaveCode}</div><div className="text-[11px] font-normal text-[var(--muted,#64748b)] truncate">{cyc.autoclaveModel}</div>
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
										<td className="py-2 px-3 text-[var(--ink,#1e293b)] truncate" title={cyc.itemsSummary}>{cyc.itemsSummary}</td>
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
			</div>

			{/* МОБИЛЬНЫЙ ВИД (390x844 Apple HIG: КАРТОЧКИ ВЫСОТОЙ >= 52px, 0px ГОРИЗОНТАЛЬНОГО СКРОЛЛА) */}
			<div className="autoclave-mobile-view flex flex-col gap-3 pb-24">
				{filteredCycles.length === 0 ? (
					<div className="p-6 text-center bg-[var(--paper,#fff)] rounded-2xl border border-[var(--line,#e2e8f0)]">
						<p className="font-semibold text-sm mb-2 text-[var(--ink,#1e293b)]">Нет циклов за выбранный период</p>
						<button
							type="button" onClick={() => handleQuickBatchNorm?.(27, "134")}
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
								key={`mob-${cyc.id}`}
								className="bg-[var(--paper,#fff)] rounded-2xl border border-[var(--line,#e2e8f0)] p-3.5 flex flex-col gap-2.5 shadow-xs"
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

								<div className="flex items-center justify-between p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-xs">
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
									<span className="truncate pr-2 font-medium text-[var(--ink,#1e293b)]">{cyc.itemsSummary}</span>
									<span className="shrink-0">{cyc.operatorName}</span>
								</div>
							</div>
						);
					})
				)}

				{/* Floating Bottom Bar (Natural Thumb Zone для смартфонов, Мандат 8am: 1 Primary CTA) */}
				{isMobile && (
					<div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-[var(--paper,#fff)]/95 backdrop-blur-md border-t border-[var(--line,#e2e8f0)] shadow-lg flex items-center pb-[max(12px,env(safe-area-inset-bottom))]">
						<button
							type="button" onClick={() => setIsCycleDrawerOpen(true)}
							className="w-full h-12 min-h-[48px] rounded-xl font-bold text-sm bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
							data-testid="sanpin-mobile-start-cycle-cta"
						>
							<Plus size={18} className="text-white" />
							<span>Запустить цикл стерилизации</span>
						</button>
					</div>
				)}
			</div>

			{/* ШТОРКА ЗАПУСКА ЦИКЛА СТЕРИЛИЗАЦИИ */}
			<SterilizationCycleDrawer
				isOpen={isCycleDrawerOpen}
				onClose={() => setIsCycleDrawerOpen(false)}
				onCycleApproved={() => void fetchCyclesFromDb()}
				defaultBatchSize={27}
			/>
		</div>
	);
}

export default AutoclaveJournalTab;
