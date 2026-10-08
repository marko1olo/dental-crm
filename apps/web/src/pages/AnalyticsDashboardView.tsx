import "./AnalyticsDashboardView.css";
import { AnalyticsDashboardView as CanonicalAnalyticsDashboardView } from "./analyticsDashboard/AnalyticsDashboardView";

/**
 * Канонический фасад AnalyticsDashboardView.
 * Декомпозирован в модули: apps/web/src/pages/analyticsDashboard/ per Mandate 8s & Decomposer Skill.
 * 100% обратная совместимость и сохранение публичного API.
 */
export function AnalyticsDashboardView() {
	return <CanonicalAnalyticsDashboardView />;
}

export type * from "./analyticsDashboard/types";
export * from "./analyticsDashboard/constants";
