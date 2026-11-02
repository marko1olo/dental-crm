/**
 * apps/web/src/components/analytics/ExecutiveAnalyticsStudioModal.tsx
 *
 * ОРКЕСТРАТОР СТУДИИ УПРАВЛЕНЧЕСКОЙ АНАЛИТИКИ И ДАШБОРДА РУКОВОДИТЕЛЯ DENTE CRM
 * (Мандат 8b & 8zi: Компактный оркестратор в Sweet Spot 140–180 строк).
 * (Мандат 8am: Единый дизайн-код, ровно 1 Primary CTA кнопка #0d9488).
 * (Мандат 8n: Малая клиника 1–3 кресла, честная касса 54-ФЗ, загрузка кресел, Recall).
 * (Apple HIG: мобильный Bottom Sheet rounded-t-[24px], Drag Handle 36x5px, 0px горизонтального скролла).
 * (Мандат 8e: Автономия врача, кнопки экспорта и печати никогда не блокируются).
 */

import React, { useEffect, useId, useState } from "react";
import {
	type AnalyticsPeriod,
	type ClinicAnalyticsSSOT,
	createDeterministicAnalyticsFallback,
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
		createDeterministicAnalyticsFallback(initialPeriod),
	);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [exportSuccess, setExportSuccess] = useState<boolean>(false);
	const [activeWhatsappCohort, setActiveWhatsappCohort] = useState<string | null>(null);

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

	const copyWhatsappTemplate = (template: string, cohortKey: string) => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(template).catch(() => {});
		}
		setActiveWhatsappCohort(cohortKey);
		setTimeout(() => setActiveWhatsappCohort(null), 2500);
	};

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
