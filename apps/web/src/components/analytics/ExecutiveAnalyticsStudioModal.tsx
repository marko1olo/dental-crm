/**
 * apps/web/src/components/analytics/ExecutiveAnalyticsStudioModal.tsx
 *
 * ОРКЕСТРАТОР СТУДИИ УПРАВЛЕНЧЕСКОЙ АНАЛИТИКИ И ДАШБОРДА РУКОВОДИТЕЛЯ DENTE CRM
 * (Мандат 8b & 8zi: Компактный оркестратор в Sweet Spot 140–180 строк).
 * (Мандат 8am: Единый дизайн-код, ровно 1 Primary CTA кнопка #0d9488).
 * (Мандат 8n: Малая клиника 1–3 кресла, честная касса 54-ФЗ, загрузка кресел, Recall).
 * (Apple HIG: мобильный Bottom Sheet rounded-t-[24px], Drag Handle 36x5px, 0px горизонтального скролла).
 * (Мандат 8e: Автономия врача, кнопки экспорта и печати никогда не блокируются).
 * (Мандат 8ap: Zero fake mock simulation. Честный Empty State при нулевых данных).
 */

import React, { useEffect, useId, useState } from "react";
import { Calendar } from "lucide-react";
import {
	type AnalyticsPeriod,
	type ClinicAnalyticsSSOT,
	createEmptyAnalyticsState,
	exportAnalyticsToCsv,
	fetchClinicAnalyticsSSOT,
} from "./analyticsCatalogData";
import {
	ExecutiveAnalyticsChartsSection,
	ExecutiveAnalyticsKpiGrid,
	ExecutiveAnalyticsStudioFooter,
	ExecutiveAnalyticsStudioHeader,
} from "./studio/index";
import "./styles/analyticsStudio.css";

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
		createEmptyAnalyticsState(initialPeriod),
	);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [hasError, setHasError] = useState<boolean>(false);
	const [exportSuccess, setExportSuccess] = useState<boolean>(false);
	const [activeWhatsappCohort, setActiveWhatsappCohort] = useState<string | null>(null);

	useEffect(() => {
		if (!isOpen) return;

		let isMounted = true;
		const controller = new AbortController();

		setIsLoading(true);
		setHasError(false);

		fetchClinicAnalyticsSSOT(period, controller.signal)
			.then((res) => {
				if (isMounted) {
					setData(res);
					setIsLoading(false);
					setHasError(false);
				}
			})
			.catch(() => {
				if (isMounted) {
					// Никакой подмены данных моками! Честный Empty State при сбое
					setData(createEmptyAnalyticsState(period));
					setIsLoading(false);
					setHasError(true);
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
		setHasError(false);
		fetchClinicAnalyticsSSOT(period)
			.then((res) => {
				setData(res);
				setIsLoading(false);
				setHasError(false);
			})
			.catch(() => {
				setData(createEmptyAnalyticsState(period));
				setIsLoading(false);
				setHasError(true);
			});
	};

	const copyWhatsappTemplate = (template: string, cohortKey: string) => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(template).catch(() => {});
		}
		setActiveWhatsappCohort(cohortKey);
		setTimeout(() => setActiveWhatsappCohort(null), 2500);
	};

	const isEmptyState =
		Boolean(data.isEmpty) || (data.revenueKopecks === 0 && data.totalVisitsCount === 0);

	return (
		<div
			id="executive-analytics-studio-overlay"
			className="studio-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			data-testid="executive-analytics-studio-modal"
		>
			<div className="studio-modal-container max-w-5xl">
				{/* 1. Шапка студии, переключатели периодов и Apple HIG Drag Handle */}
				<ExecutiveAnalyticsStudioHeader
					titleId={titleId}
					period={period}
					onPeriodChange={setPeriod}
					onClose={onClose}
				/>

				{/* 2. Основное тело: 3 доминантных столпа (Apple Health / Cards) */}
				<main className="p-3 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] pb-8 sm:pb-6">
					{hasError && (
						<div
							className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 flex items-center justify-between text-xs"
							role="alert"
						>
							<span>Не удалось загрузить данные аналитики с сервера. Проверьте соединение.</span>
							<button
								type="button"
								onClick={refreshData}
								className="secondary-button h-7 px-2.5 rounded-md border border-rose-500/40 bg-[var(--paper)] text-xs font-medium cursor-pointer"
							>
								Повторить
							</button>
						</div>
					)}

					{/* Честное пустое состояние (Empty State) при отсутствии записей и оплат за период */}
					{isEmptyState && (
						<div
							className="p-6 sm:p-8 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-center space-y-2.5"
							data-testid="analytics-empty-state"
						>
							<div className="w-10 h-10 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center mx-auto text-[var(--muted)]">
								<Calendar className="w-5 h-5" />
							</div>
							<h2 className="text-sm sm:text-base font-bold text-[var(--ink)]">
								За выбранный период операций не зафиксировано
							</h2>
							<p className="text-xs text-[var(--muted)] max-w-md mx-auto leading-relaxed">
								В базе данных клиники отсутствуют проведённые приёмы и фискальные чеки за выбранный период ({data.periodLabel}). Выберите другой период или создайте запись в расписании.
							</p>
						</div>
					)}

					{/* Сетка 3 Доминантных KPI (Выручка, Загрузка кресел, Средний чек / Recall) */}
					<ExecutiveAnalyticsKpiGrid data={data} />

					{/* Секции: Структура оплат 54-ФЗ, Услуги, Рейтинг врачей и Когорты Recall */}
					<ExecutiveAnalyticsChartsSection
						data={data}
						activeWhatsappCohort={activeWhatsappCohort}
						onCopyWhatsapp={copyWhatsappTemplate}
					/>
				</main>

				{/* 3. Нижний тулбар: статус, печать и РОВНО ОДНА Primary CTA кнопка #0d9488 (Мандат 8am) */}
				<ExecutiveAnalyticsStudioFooter
					isLoading={isLoading}
					exportSuccess={exportSuccess}
					onRefresh={refreshData}
					onPrint={handlePrint}
					onExport={handleExport}
				/>
			</div>
		</div>
	);
};
