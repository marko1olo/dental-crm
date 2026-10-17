/**
 * apps/web/src/components/analytics/DirectorExecutiveDashboard.tsx
 *
 * Полномасштабный Рабочий стол Генерального директора клиники (Фича #29 — Мастер-Фасад).
 * Тонкий фасад над каноническим ExecutiveDashboard под мандат /decomposer (<= 120 строк).
 */

import React from "react";
import { ExecutiveDashboard } from "./ExecutiveDashboard";
import type { DirectorExecutiveDashboardProps } from "./executiveModules/executiveAnalyticsTypes";

export type { DirectorExecutiveDashboardProps };

export const DirectorExecutiveDashboard: React.FC<DirectorExecutiveDashboardProps> = (props) => {
	return <ExecutiveDashboard {...props} />;
};
