/**
 * apps/web/src/components/analytics/studio/ExecutiveAnalyticsStudioHeader.tsx
 *
 * Единая шапка экрана управленческой аналитики и переключатель периодов
 * (Мандат 8am: единый дизайн-код, ровно 1 строка, 48-56px).
 * (Apple HIG: мобильный Drag Handle 36x5px, сенсорный минимум закрытия >= 44x44px).
 */

import React from "react";
import { TrendingUp, X } from "lucide-react";
import {
	ANALYTICS_PERIOD_OPTIONS,
	type AnalyticsPeriod,
} from "../analyticsCatalogData";

export interface ExecutiveAnalyticsStudioHeaderProps {
	readonly titleId: string;
	readonly period: AnalyticsPeriod;
	readonly onPeriodChange: (period: AnalyticsPeriod) => void;
	readonly onClose: () => void;
}

export const ExecutiveAnalyticsStudioHeader: React.FC<ExecutiveAnalyticsStudioHeaderProps> = ({
	titleId,
	period,
	onPeriodChange,
	onClose,
}) => {
	return (
		<>
			{/* 0. Тактильный Drag Handle для Apple HIG Bottom Sheet (<= 640px) */}
			<div className="studio-drag-handle" aria-hidden="true">
				<div className="studio-drag-handle-bar" />
			</div>

			{/* 1. Единая шапка экрана (Мандат 8am: ровно 1 строка, 48-56px) */}
			<header className="studio-header">
				<div className="flex items-center gap-2 sm:gap-3 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0">
						<TrendingUp className="w-4 h-4" aria-hidden="true" />
					</div>
					<div className="flex items-center gap-2 min-w-0">
						<h1 id={titleId} className="studio-header-title">
							<span className="sm:hidden">Аналитика клиники</span>
							<span className="hidden sm:inline">Управленческая аналитика клиники</span>
						</h1>
						<span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0">
							<span className="w-1.5 h-1.5 rounded-full bg-[var(--teal)]" />
							Касса 54-ФЗ
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* Переключатель периода для десктопа (sm+) */}
					<div
						className="hidden sm:inline-flex studio-period-pill-group"
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
									onClick={() => onPeriodChange(opt.key)}
									className={`studio-period-pill ${isActive ? "is-active" : ""}`}
								>
									<span>{opt.label}</span>
								</button>
							);
						})}
					</div>

					{/* Кнопка закрытия (сенсорный минимум >= 44x44px на мобильном по Apple HIG) */}
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

			{/* Полоса периодов для мобильных устройств (sm:hidden) */}
			<div className="sm:hidden px-3 pt-3">
				<div
					className="grid grid-cols-6 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-0.5"
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
								onClick={() => onPeriodChange(opt.key)}
								className={`h-8 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center px-1 ${
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
		</>
	);
};
