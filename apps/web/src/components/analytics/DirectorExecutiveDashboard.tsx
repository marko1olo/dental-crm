/**
 * apps/web/src/components/analytics/DirectorExecutiveDashboard.tsx
 *
 * Полномасштабный Рабочий стол Генерального директора клиники (Фича #29 — Мастер-Фасад).
 * Декомпозирован под мандат /decomposer (главный координатор <= 120 строк).
 * Суверенно обслуживает:
 *  - Десктопный контур 1440x900 (Apple macOS HIG: однострочный тулбар 32-36px, 4 KPI карточки,
 *    таблицы tabular-nums, P&L сводка отделений, загрузка кресел с расчетом часа простоя,
 *    топ врачей Net Revenue и топ процедур 804н).
 *  - Мобильный контур 390x844 (Apple iOS HIG: Fitness Rings, Health cards, grouped rows,
 *    touch targets >= 44x44px, 0px горизонтального скролла).
 */

import React from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { ExecutiveDashboard } from "./ExecutiveDashboard";
import { DesktopExecutiveView } from "./executiveModules/DesktopExecutiveView";
import { useExecutiveDashboardData } from "./executiveModules/useExecutiveDashboardData";
import type { DirectorExecutiveDashboardProps } from "./executiveModules/executiveAnalyticsTypes";
import "./executiveDashboard.css";

export type { DirectorExecutiveDashboardProps };

export const DirectorExecutiveDashboard: React.FC<DirectorExecutiveDashboardProps> = (props) => {
	const isMobile = useIsMobile(768);
	const data = useExecutiveDashboardData(props);

	if (isMobile) {
		return (
			<ExecutiveDashboard
				period={data.period as any}
				onPeriodChange={(p) => data.setPeriod(p as any)}
				onNavigateToSection={props.onNavigateToSection}
			/>
		);
	}

	return (
		<DesktopExecutiveView
			{...data}
			hideHeaderToolbar={props.hideHeaderToolbar}
			onNavigateToSection={props.onNavigateToSection}
			onOpenFinancialAnalytics={props.onOpenFinancialAnalytics}
		/>
	);
};
