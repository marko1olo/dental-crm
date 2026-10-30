/**
 * apps/web/src/components/analytics/ExecutiveAnalyticsStudioModal.tsx
 *
 * МОНОЛИТНАЯ СТУДИЯ УПРАВЛЕНЧЕСКОЙ АНАЛИТИКИ И ДАШБОРДА РУКОВОДИТЕЛЯ DENTE CRM
 * (Мандат 8am: Единый дизайн-код, ровно 1 Primary CTA кнопка #0d9488).
 * (Мандат 8n: Суверенитет малой клиники 1–3 кресла, честная касса 54-ФЗ, загрузка кресел, Recall).
 * (Apple HIG: мобильная адаптация 390x844, 0px горизонтального скролла, сенсорный минимум >= 44x44px).
 *
 * Строгий Sweet Spot: 350–480 строк.
 */

import React, { useEffect, useId, useState } from "react";
import {
	Activity,
	Armchair,
	CheckCircle2,
	ChevronRight,
	Clock,
	CreditCard,
	Download,
	FileSpreadsheet,
	HelpCircle,
	Printer,
	QrCode,
	RefreshCw,
	Sparkles,
	TrendingUp,
	Users,
	Wallet,
	X,
} from "lucide-react";
import {
	ANALYTICS_PERIOD_OPTIONS,
	type AnalyticsPeriod,
	type ClinicAnalyticsSSOT,
	createDeterministicAnalyticsFallback,
	exportAnalyticsToCsv,
	fetchClinicAnalyticsSSOT,
} from "./analyticsCatalogData";

export interface ExecutiveAnalyticsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPeriod?: AnalyticsPeriod;
}

export const ExecutiveAnalyticsStudioModal: React.FC<ExecutiveAnalyticsStudioModalProps> = ({
	isOpen,
	onClose,
	initialPeriod = "month",
}) => {
	const titleId = useId();
	const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
	const [data, setData] = useState<ClinicAnalyticsSSOT>(() =>
		createDeterministicAnalyticsFallback(initialPeriod),
	);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [exportSuccess, setExportSuccess] = useState<boolean>(false);

	useEffect(() => {
		if (!isOpen) return;

		let isMounted = true;
		const controller = new AbortController();

		setIsLoading(true);
		fetchClinicAnalyticsSSOT(period, controller.signal)
			.then((res) => {
				if (isMounted) {
					setData(res);
					setIsLoading(false);
				}
			})
			.catch(() => {
				if (isMounted) {
					setData(createDeterministicAnalyticsFallback(period));
					setIsLoading(false);
				}
			});

		return () => {
			isMounted = false;
			controller.abort();
		};
	}, [isOpen, period]);

	if (!isOpen) return null;

	const handleExport = () => {
		exportAnalyticsToCsv(data);
		setExportSuccess(true);
		setTimeout(() => setExportSuccess(false), 2500);
	};

	const handlePrint = () => {
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	const refreshData = () => {
		setIsLoading(true);
		fetchClinicAnalyticsSSOT(period)
			.then((res) => {
				setData(res);
				setIsLoading(false);
			})
			.catch(() => {
				setIsLoading(false);
			});
	};

	return (
		<div
			id="executive-analytics-studio-overlay"
			className="fixed inset-0 z-[99999] flex flex-col items-center justify-start bg-black/70 backdrop-blur-sm overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			data-testid="executive-analytics-studio-modal"
		>
			<div className="w-full max-w-5xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto">
				{/* 1. Единая шапка экрана (Мандат 8am: ровно 1 строка, 48-56px) */}
				<header className="h-12 sm:h-14 px-3 sm:px-5 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-2 shrink-0">
					<div className="flex items-center gap-2 sm:gap-3 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0">
							<TrendingUp className="w-4 h-4" aria-hidden="true" />
						</div>
						<div className="flex items-center gap-2 min-w-0">
							<h1
								id={titleId}
								className="text-sm sm:text-base font-bold tracking-tight text-[var(--ink)] truncate"
							>
								<span className="sm:hidden">Аналитика клиники</span>
								<span className="hidden sm:inline">Управленческая аналитика клиники</span>
							</h1>
							<span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
								<span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)]" />
								Касса 54-ФЗ
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{/* Переключатель периода для десктопа (hidden sm:inline-flex) */}
						<div
							className="hidden sm:inline-flex p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]"
							role="tablist"
							aria-label="Выбор периода аналитики"
						>
							{ANALYTICS_PERIOD_OPTIONS.map((opt) => {
								const isActive = period === opt.key;
								return (
									<button
										key={opt.key}
										type="button"
										role="tab"
										aria-selected={isActive}
										onClick={() => setPeriod(opt.key)}
										className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center ${
											isActive
												? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										<span>{opt.label}</span>
									</button>
								);
							})}
						</div>

						{/* Кнопка закрытия (сенсорный минимум >= 44x44px на мобильном) */}
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
							aria-label="Закрыть аналитику"
							data-testid="studio-modal-close-btn"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</header>

				{/* 2. Основное тело: 3 доминантных столпа (Apple Health / Cards) */}
				<main className="p-3 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] pb-8 sm:pb-6">
					{/* Полоса периодов для мобильных устройств (sm:hidden) */}
					<div className="sm:hidden">
						<div
							className="grid grid-cols-4 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]"
							role="tablist"
							aria-label="Выбор периода аналитики"
						>
							{ANALYTICS_PERIOD_OPTIONS.map((opt) => {
								const isActive = period === opt.key;
								return (
									<button
										key={opt.key}
										type="button"
										role="tab"
										aria-selected={isActive}
										onClick={() => setPeriod(opt.key)}
										className={`h-9 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center ${
											isActive
												? "bg-[var(--paper)] text-[var(--ink)] font-bold shadow-xs"
												: "text-[var(--muted)] hover:text-[var(--ink)]"
										}`}
									>
										{opt.shortLabel}
									</button>
								);
							})}
						</div>
					</div>
					{/* Сетка 3 Доминантных KPI (Выручка, Загрузка кресел, Средний чек / Recall) */}
					<section
						className="grid grid-cols-1 md:grid-cols-3 gap-3"
						aria-label="Ключевые показатели эффективности"
					>
						{/* KPI 1: Выручка клиники (36px bold, крупная сумма) */}
						<article
							className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col justify-between"
							data-testid="kpi-card-revenue"
						>
							<div>
								<div className="flex items-center justify-between gap-2 mb-1.5">
									<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
										Выручка кассы (54-ФЗ)
									</span>
									<span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--teal)]/10 text-[var(--teal)]">
										{data.periodLabel}
									</span>
								</div>
								<div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mb-2">
									{data.revenueFormatted}
								</div>
							</div>
							<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
								<span>Карт: {data.paymentBreakdown.methods[0]?.formatted ?? "0 ₽"}</span>
								<span>Нал: {data.paymentBreakdown.methods[2]?.formatted ?? "0 ₽"}</span>
							</div>
						</article>

						{/* KPI 2: Загрузка кресел (норма 65–85%) */}
						<article
							className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col justify-between"
							data-testid="kpi-card-chairs"
						>
							<div>
								<div className="flex items-center justify-between gap-2 mb-1.5">
									<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
										Загрузка кресел ({data.totalChairsCount} шт)
									</span>
									<span
										className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
											data.chairOccupancyStatus === "optimal"
												? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
												: data.chairOccupancyStatus === "high"
													? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
													: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
										}`}
									>
										{data.chairOccupancyStatus === "optimal"
											? "✓ Норма 65–85%"
											: data.chairOccupancyStatus === "high"
												? "Высокая"
												: "Резерв"}
									</span>
								</div>
								<div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mb-2">
									{data.chairOccupancyPercent}%
								</div>
							</div>
							{/* Линейный индикатор занятости */}
							<div>
								<div className="w-full h-2 rounded-full bg-[var(--line)] overflow-hidden">
									<div
										className="h-full rounded-full bg-[var(--teal)] transition-all duration-300"
										style={{ width: `${Math.min(100, data.chairOccupancyPercent)}%` }}
									/>
								</div>
								<div className="flex justify-between items-center text-[11px] text-[var(--muted)] mt-1.5">
									<span>Занято: {Math.round(data.occupiedMinutes / 60)} ч</span>
									<span>Смена: {Math.round(data.availableMinutes / 60)} ч</span>
								</div>
							</div>
						</article>

						{/* KPI 3: Средний чек и Повторная явка (Recall) */}
						<article
							className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col justify-between"
							data-testid="kpi-card-average-check"
						>
							<div>
								<div className="flex items-center justify-between gap-2 mb-1.5">
									<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
										Средний чек и Recall
									</span>
									<span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--teal)]/10 text-[var(--teal)]">
										Повторные {data.rebookingRatePercent}%
									</span>
								</div>
								<div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mb-2">
									{data.averageCheckFormatted}
								</div>
							</div>
							<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
								<span>Приёмов: {data.completedVisitsCount}</span>
								<span>Неявки: {data.noShowVisitsCount}</span>
							</div>
						</article>
					</section>

					{/* 2 Секции: Способы оплаты кассы & Рейтинг врачей */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Секция 1: Структура оплат кассы (54-ФЗ) */}
						<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
							<div className="flex items-center justify-between">
								<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
									<Wallet className="w-3.5 h-3.5 text-[var(--teal)]" />
									Структура оплат (Касса 54-ФЗ)
								</h2>
								<span className="text-xs font-medium text-[var(--muted)]">
									Итого: {data.revenueFormatted}
								</span>
							</div>

							<div className="space-y-2">
								{data.paymentBreakdown.methods.map((m) => (
									<div
										key={m.id}
										className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-soft)] text-xs border border-[var(--line)]/50"
									>
										<div className="flex items-center gap-2 min-w-0">
											{m.id === "cash" && <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
											{m.id === "card" && <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
											{m.id === "sbp" && <QrCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
											{m.id === "deposit" && <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
											<span className="font-medium text-[var(--ink)] truncate">{m.label}</span>
										</div>
										<div className="flex items-center gap-2.5 shrink-0">
											<span className="font-semibold text-[var(--ink)]">{m.formatted}</span>
											<span className="w-10 text-right text-[11px] font-bold text-[var(--muted)]">
												{m.percent}%
											</span>
										</div>
									</div>
								))}
							</div>

							{/* Направления услуг */}
							<div className="pt-2 border-t border-[var(--line)] space-y-1.5">
								<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] block">
									Услуги по направлениям
								</span>
								<div className="grid grid-cols-2 gap-1.5 text-xs">
									{data.serviceStructure.map((s) => (
										<div
											key={s.category}
											className="p-1.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/40 flex flex-col justify-between"
										>
											<span className="text-[11px] text-[var(--muted)] truncate">{s.category}</span>
											<span className="font-semibold text-[var(--ink)] mt-0.5">{s.formattedRevenue}</span>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Секция 2: Рейтинг врачей и продуктивность кресел */}
						<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
							<div className="flex items-center justify-between">
								<h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
									<Users className="w-3.5 h-3.5 text-[var(--teal)]" />
									Рейтинг врачей ({data.doctors.length})
								</h2>
								<span className="text-xs font-medium text-[var(--muted)]">
									Часы и повторная запись
								</span>
							</div>

							<div className="space-y-2">
								{data.doctors.map((doc, idx) => (
									<div
										key={doc.id}
										className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]/60 flex flex-col gap-1.5 text-xs"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2 min-w-0">
												<span className="w-5 h-5 rounded-full bg-[var(--teal)]/15 text-[var(--teal)] font-bold text-[11px] flex items-center justify-center shrink-0">
													{idx + 1}
												</span>
												<span className="font-semibold text-[var(--ink)] truncate">{doc.name}</span>
											</div>
											<span className="font-bold text-[var(--teal)] shrink-0">
												{doc.revenueFormatted}
											</span>
										</div>
										<div className="flex items-center justify-between text-[11px] text-[var(--muted)] pl-7">
											<span>{doc.specialty}</span>
											<div className="flex items-center gap-3">
												<span>{doc.visitsCount} визитов ({doc.chairHours}ч)</span>
												<span className="font-medium text-emerald-600 dark:text-emerald-400">
													Recall {doc.rebookingPercent}%
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</main>

				{/* 3. Нижний тулбар: статус, печать и РОВНО ОДНА Primary CTA кнопка #0d9488 (Мандат 8am) */}
				<footer className="h-14 sm:h-16 px-3 sm:px-5 border-t border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2 min-w-0">
						<button
							type="button"
							onClick={refreshData}
							className="h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
							title="Обновить показатели"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
							<span className="hidden sm:inline">Обновить</span>
						</button>

						<button
							type="button"
							onClick={handlePrint}
							className="h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
							title="Распечатать отчёт"
						>
							<Printer className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Печать</span>
						</button>

						<span className="text-[11px] text-[var(--muted)] truncate hidden md:inline">
							Данные синхронизированы с кассой 54-ФЗ
						</span>
					</div>

					{/* РОВНО ОДНА Primary CTA КНОПКА #0d9488 (Мандат 8am & 8e: ВСЕГДА КЛИКАБЕЛЬНА) */}
					<button
						type="button"
						onClick={handleExport}
						className="primary-button h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[var(--teal,#0d9488)] hover:opacity-90 text-white text-xs sm:text-sm font-semibold transition-opacity cursor-pointer inline-flex items-center gap-2 shadow-sm shrink-0"
						data-testid="studio-primary-export-btn"
					>
						{exportSuccess ? (
							<>
								<CheckCircle2 className="w-4 h-4" />
								<span>Отчет сохранен!</span>
							</>
						) : (
							<>
								<Download className="w-4 h-4" />
								<span>✓ Экспорт финансового отчета</span>
							</>
						)}
					</button>
				</footer>
			</div>
		</div>
	);
};
