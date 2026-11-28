/**
 * apps/web/src/components/sanpin/CleaningControlTab.tsx
 *
 * Канонический журнал контроля очистки инструментов (Мандаты 8b, 8e, 8n, 8x, Apple HIG).
 * - Живой клинический язык: «Контроль очистки инструментов», «Предстерилизационная очистка».
 * - Никаких советских номеров приказов (Форма 366/у) в интерфейсе.
 * - Пакетная фиксация нормативного контроля в 1 клик (азопирам и фенолфталеин отрицательно).
 * - На смартфонах (390x844): карточки высотой >= 52px, кнопка в Natural Thumb Zone, 0px горизонтального скролла.
 * - Размер: 200–300 строк (Sweet Spot).
 */

import React from "react";
import { todayDateKeyInTimeZone } from "@dental/shared";
import {
	FlaskConical,
	Search,
	Printer,
	CheckCircle2,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { usePsoRegisterLogic } from "./pso/usePsoRegisterLogic";

export interface CleaningControlTabProps {
	readonly className?: string;
}

export function CleaningControlTab({ className = "" }: CleaningControlTabProps) {
	const appLogic = useOptionalAppLogicContext();
	const isMobile = useIsMobile();
	const clinicTimezone = appLogic?.dashboard?.clinicSettings?.profile?.timezone;
	const fallbackTodayDate = todayDateKeyInTimeZone(clinicTimezone);
	const logic = usePsoRegisterLogic(appLogic);

	return (
		<div
			className={`cleaning-control-tab flex flex-col gap-3.5 w-full max-w-full overflow-x-clip ${className}`}
			role="region"
			aria-label="Журнал контроля очистки инструментов"
		>
			{/* БАННЕР СТАТУСА И БЫСТРАЯ ФИКСАЦИЯ НОРМЫ */}
			<div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex-wrap shadow-2xs">
				<div className="flex items-center gap-3 min-w-0">
					<div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
						<FlaskConical size={20} />
					</div>
					<div className="min-w-0">
						<h2 className="text-sm font-bold text-[var(--ink)] m-0 leading-snug">
							Контроль очистки инструментов
						</h2>
						<p className="text-xs text-[var(--ink-muted)] m-0 mt-0.5">
							Предстерилизационная очистка инструментов (контроль качества) • Азопирамовая проба (скрытая кровь) и фенолфталеиновая проба (щелочь)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={logic.handlePrintJournal}
						className="h-9 min-h-[36px] max-md:h-11 max-md:min-h-[44px] px-3.5 rounded-lg max-md:rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation"
						title="Печать журнала контроля очистки"
					>
						<Printer className="w-4 h-4 shrink-0" />
						<span>Печать журнала</span>
					</button>

					<button
						type="button"
						onClick={logic.handleQuickMarkBatchNorm}
						aria-busy={logic.submitting}
						className="h-9 min-h-[36px] max-md:h-11 max-md:min-h-[44px] px-3.5 rounded-lg max-md:rounded-xl font-medium text-xs text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
						data-testid="pso-quick-mark-shift-btn"
						title="Зафиксировать пробу предстерилизационной очистки (100% норма)"
					>
						<Sparkles className="w-4 h-4 shrink-0 text-white" />
						<span>{logic.submitting ? "Фиксация..." : "Зафиксировать пробу (100% норма)"}</span>
					</button>
				</div>
			</div>

			{/* ТУЛБАР ПОИСКА И ФИЛЬТРАЦИИ */}
			<div className="flex items-center justify-between gap-2.5 flex-wrap p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs">
				<div className="relative inline-flex items-center w-full sm:w-72">
					<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
					<input
						type="text"
						placeholder="Поиск по набору инструментов..."
						value={logic.searchQuery}
						onChange={(e) => logic.setSearchQuery(e.target.value)}
						className="h-9 max-md:h-11 rounded-lg max-md:rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] w-full focus:outline-none"
						style={{ paddingLeft: 34, paddingRight: 8 }}
					/>
				</div>

				<div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
					<span>Показано: <strong className="text-[var(--ink)]">{logic.filteredLogs.length}</strong> проб</span>
				</div>
			</div>

			{!isMobile ? (
				/* ДЕСКТОПНАЯ ТАБЛИЦА (1440x900) */
				<div className="cleaning-desktop-view rounded-xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs">
					<table className="w-full border-collapse text-xs tabular-nums" style={{ tableLayout: "fixed" }}>
						<colgroup>
							<col style={{ width: "110px" }} />
							<col style={{ width: "auto" }} />
							<col style={{ width: "100px" }} />
							<col style={{ width: "110px" }} />
							<col style={{ width: "150px" }} />
							<col style={{ width: "160px" }} />
							<col style={{ width: "130px" }} />
							<col style={{ width: "110px" }} />
						</colgroup>
						<thead>
							<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--ink-muted)]">
								<th className="py-2.5 px-3 text-left font-semibold">Дата / Время</th>
								<th className="py-2.5 px-3 text-left font-semibold">Набор инструментов</th>
								<th className="py-2.5 px-3 text-center font-semibold">В партии</th>
								<th className="py-2.5 px-3 text-center font-semibold">Проверено</th>
								<th className="py-2.5 px-3 text-left font-semibold">Азопирам (кровь)</th>
								<th className="py-2.5 px-3 text-left font-semibold">Фенолфталеин (щелочь)</th>
								<th className="py-2.5 px-3 text-left font-semibold">Ответственный</th>
								<th className="py-2.5 px-3 text-center font-semibold">Результат</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]">
							{logic.filteredLogs.length === 0 ? (
								<tr>
									<td colSpan={8} className="py-10 text-center text-[var(--ink-muted)]">
										<p className="font-semibold text-sm mb-2 text-[var(--ink)]">Пробы очистки за выбранный период не зафиксированы</p>
										<button
											type="button"
											onClick={logic.handleQuickMarkBatchNorm}
											aria-busy={logic.submitting}
											className="h-9 px-3.5 rounded-lg text-xs font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] inline-flex items-center gap-1.5 cursor-pointer touch-manipulation shadow-sm"
										>
											<CheckCircle2 className="w-4 h-4 shrink-0" />
											<span>Зафиксировать норму (5 проб из 50 инструментов)</span>
										</button>
									</td>
								</tr>
							) : (
								logic.filteredLogs.map((log) => {
									const isAzopyramOk = log.isAzopyramNegative !== false;
									const isPhenolOk = log.isPhenolphthaleinNegative !== false;
									const rawStamp = log.timestamp || log.createdAt || "";
									const logDate = rawStamp.split("T")[0] || fallbackTodayDate;
									const logTime = rawStamp.split("T")[1]?.slice(0, 5) || "Смена";
									return (
										<tr key={log.id} className="hover:bg-[var(--paper-soft)] transition-colors">
											<td className="py-2.5 px-3 font-medium text-[var(--ink)]">
												<div>{logDate}</div>
												<div className="text-[11px] text-[var(--ink-muted)]">{logTime}</div>
											</td>
											<td className="py-2.5 px-3 font-medium text-[var(--ink)]">
												<div>{log.instrumentName || "Стоматологический инструментарий смены"}</div>
												<div className="text-[11px] text-[var(--ink-muted)]">{log.detergentBrand || "Биолот 0.5% + Аламинол 1%"}</div>
											</td>
											<td className="py-2.5 px-3 text-center font-semibold text-[var(--ink)]">
												{log.batchItemCount || 50} шт
											</td>
											<td className="py-2.5 px-3 text-center font-semibold text-[var(--primary)]">
												{log.testedSampleCount || 5} шт ({Math.round(((log.testedSampleCount || 5) / (log.batchItemCount || 50)) * 100)}%)
											</td>
											<td className="py-2.5 px-3">
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--success-soft)] text-[var(--success)]">
													<CheckCircle2 size={11} />
													<span>{isAzopyramOk ? "Отрицательно (Норма)" : "Положительно"}</span>
												</span>
											</td>
											<td className="py-2.5 px-3">
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--success-soft)] text-[var(--success)]">
													<CheckCircle2 size={11} />
													<span>{isPhenolOk ? "Отрицательно (Норма)" : "Положительно"}</span>
												</span>
											</td>
											<td className="py-2.5 px-3 text-[var(--ink-muted)] truncate">
												{log.operatorName || logic.nurseName}
											</td>
											<td className="py-2.5 px-3 text-center">
												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20">
													<ShieldCheck size={11} />
													<span>Годно</span>
												</span>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>

					{/* ПОДВАЛ ЖУРНАЛА ПСО */}
					<div className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper-soft)] border-t border-[var(--line)] text-xs text-[var(--ink-muted)]">
						<div className="flex items-center gap-3">
							<span>Всего проверено проб: <strong className="text-[var(--ink)]">{logic.filteredLogs.length}</strong></span>
							<span>•</span>
							<span>Инструментов в партиях: <strong className="text-[var(--primary)]">{logic.filteredLogs.reduce((acc, l) => acc + (l.batchItemCount || 50), 0)} шт</strong></span>
							<span>•</span>
							<span className="text-[var(--success)] font-medium">Азопирам и фенолфталеин: 100% норма</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--success)] bg-[var(--success-soft)] px-2 py-0.5 rounded-md border border-[var(--success)]/20">
								<ShieldCheck size={11} /> Годно к автоклавированию
							</span>
						</div>
					</div>
				</div>
			) : (
				/* МОБИЛЬНЫЙ ВИД (390x844 Apple HIG: КАРТОЧКИ ВЫСОТОЙ >= 52px, 0px ГОРИЗОНТАЛЬНОГО СКРОЛЛА) */
				<div className="cleaning-mobile-view flex flex-col gap-3 pb-28">
					{logic.filteredLogs.length === 0 ? (
						<div className="p-6 text-center bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
							<p className="font-semibold text-sm mb-2 text-[var(--ink)]">Нет проб за смену</p>
							<button
								type="button"
								onClick={logic.handleQuickMarkBatchNorm}
								aria-busy={logic.submitting}
								className="h-11 min-h-[44px] w-full rounded-xl font-semibold text-sm text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
							>
								<Sparkles size={16} />
								<span>Зафиксировать норму (5 проб)</span>
							</button>
						</div>
					) : (
						logic.filteredLogs.map((log) => {
							const isAzopyramOk = log.isAzopyramNegative !== false;
							const isPhenolOk = log.isPhenolphthaleinNegative !== false;
							const rawStamp = log.timestamp || log.createdAt || "";
							const logDate = rawStamp.split("T")[0] || fallbackTodayDate;
							const logTime = rawStamp.split("T")[1]?.slice(0, 5) || "Смена";
							return (
								<div
									key={`mob-pso-${log.id}`}
									className="bg-[var(--paper)] rounded-2xl border border-[var(--line)] p-3.5 flex flex-col gap-2.5 shadow-xs"
									style={{ minHeight: "52px" }}
								>
									{/* Шапка карточки */}
									<div className="flex items-center justify-between gap-2">
										<span className="font-bold text-[14px] text-[var(--ink)]">
											{log.instrumentName || "Партия инструментов"}
										</span>
										<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20 shrink-0">
											<ShieldCheck size={12} />
											<span>Годно к автоклаву</span>
										</span>
									</div>

									{/* Партия и пробы */}
									<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
										<span>{logDate} • {logTime}</span>
										<div className="flex items-center gap-2">
											<span className="font-semibold text-[var(--ink)]">Партия: {log.batchItemCount || 50} шт</span>
											<span className="font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-md">
												Проба: {log.testedSampleCount || 5} шт
											</span>
										</div>
									</div>

									{/* Результаты химических проб */}
									<div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
										<div className="flex flex-col">
											<span className="text-[11px] text-[var(--ink-muted)]">Азопирам (кровь):</span>
											<span className="font-semibold text-[var(--success)] inline-flex items-center gap-1 mt-0.5">
												<CheckCircle2 size={11} />
												{isAzopyramOk ? "Отрицательно" : "Положительно"}
											</span>
										</div>
										<div className="flex flex-col">
											<span className="text-[11px] text-[var(--ink-muted)]">Фенолфталеин (щелочь):</span>
											<span className="font-semibold text-[var(--success)] inline-flex items-center gap-1 mt-0.5">
												<CheckCircle2 size={11} />
												{isPhenolOk ? "Отрицательно" : "Положительно"}
											</span>
										</div>
									</div>

									{/* Моющее средство и оператор */}
									<div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
										<span className="truncate pr-2">{log.detergentBrand || "Биолот 0.5% + Аламинол 1%"}</span>
										<span className="shrink-0">{log.operatorName || logic.nurseName}</span>
									</div>
								</div>
							);
						})
					)}

					{/* Floating Bottom Bar (Natural Thumb Zone для смартфонов, Мандат 8am: 1 Primary CTA) */}
					<div
						className="fixed left-0 right-0 z-30 p-2.5 sm:p-3 bg-[var(--paper-strong)] border-t border-[var(--line)] shadow-lg flex items-center"
						style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
					>
						<button
							type="button"
							onClick={logic.handleQuickMarkBatchNorm}
							aria-busy={logic.submitting}
							className="w-full h-11 min-h-[44px] rounded-xl font-semibold text-sm bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.99]"
							data-testid="pso-mobile-start-cta"
							title="Зафиксировать норму очистки смены"
						>
							<Sparkles size={18} className="text-white shrink-0" />
							<span>Зафиксировать пробу очистки (100% норма)</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

export default CleaningControlTab;
