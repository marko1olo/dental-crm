/**
 * apps/web/src/components/perio/index.ts
 * Канонический экспортный шлюз модуля пародонтологии и экспресс-скрининга PSR DENTE CRM.
 */

export { PerioStudioModal, type PerioStudioModalProps } from "./PerioStudioModal";
export { PerioWorkspaceModal, type PerioWorkspaceModalProps } from "./PerioWorkspaceModal";
export { DirectPerioLauncher } from "./DirectPerioLauncher";
export { PeriodontogramChart, type PeriodontogramChartProps } from "./PeriodontogramChart";
export { PerioChartModal, type PerioChartModalProps } from "./PerioChartModal";
export { PeriodontalPocketDepthModal, type PeriodontalPocketDepthModalProps } from "./PeriodontalPocketDepthModal";
export { PerioStandaloneWorkspace } from "./PerioStandaloneWorkspace";
export { PerioPsrExpressScreening, type PerioPsrExpressScreeningProps } from "./PerioPsrExpressScreening";

export * from "./perioCatalogData";
export * from "./perioTypes";
export * from "./perioMath";
export * from "./perioHeatmap";
export * from "./periodontalQuickScreening";
