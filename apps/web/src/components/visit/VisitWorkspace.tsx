/**
 * apps/web/src/components/visit/VisitWorkspace.tsx
 *
 * Главная клиническая рабочая область приёма у кресла (VisitWorkspace / VisitView).
 * Канонический фасад (Мандат 8za Anti-Duplicates SSOT и Мандат 8e Автономия врача).
 */
import VisitViewDefault, { VisitView, type VisitViewProps } from "./VisitView";

export type { VisitViewProps, VisitViewProps as VisitWorkspaceProps };
export { VisitView, VisitView as VisitWorkspace };
export default VisitViewDefault;
