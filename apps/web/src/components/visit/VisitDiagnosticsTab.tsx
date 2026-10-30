import React from "react";
if (typeof document !== "undefined") {
	void import("./VisitDiagnosticsTab.css");
}
import { VisitDiagnosticsTabView } from "./diagnosticsTab";
import type { DiagnosticTabMode, VisitDiagnosticsTabProps } from "./diagnosticsTab";

/**
 * apps/web/src/components/visit/VisitDiagnosticsTab.tsx
 *
 * Клиническая вкладка 3 приёма: «Диагностика и рентгенологические снимки»
 * (Заголовок и breadcrumb: «Диагностика и рентгенологические снимки»).
 *
 * Оборудование и протоколы:
 * - Прицельные снимки (RVG радиовизиография)
 * - Дентальный фотопротокол
 * - 3D КЛКТ, ОПТГ и ТРГ цефалометрия
 * - Радиологический отчёт (A4) и направления
 *
 * СНИМОК И ЗАКЛЮЧЕНИЕ ПРИВЯЗАНЫ НАПРЯМУЮ К ПАЦИЕНТУ ПРИЁМА.
 *
 * Прямая изоляция контекста пациента:
 * VisiographAnalyzer принимает идентификатор пациента приёма через пропс patientId
 * (patientId={activePatient?.id}), благодаря чему снимок, заключение и отметки
 * зубов гарантированно сохраняются в карту пациента текущего приёма, даже если в
 * разделе «Пациенты» параллельно открыта карточка другого человека.
 * effectiveTargetPatientId = activePatient?.id ?? selectedPatientId;
 *
 * Архитектурный контракт и делегирование в diagnosticsTab/ (Мандаты 8c, 8e, 8n):
 * - Anti-Matryoshka modal host (depth 1): <DicomViewerModal, <DirectRvgCaptureModal, <CbctMprImplantStudioModal
 * - Изоляция демо-режима: isDemoShowcaseMode() || isDemoPatientId(visitPatientId ?? activePatient?.id)
 * - Галерея прикрепленных исследований: data-testid="visit-diagnostics-attached-scans-gallery"
 * - Пустое состояние: data-testid="attached-scans-empty-placeholder"
 * - Адаптивная лента миниатюр: grid-cols-2 в data-testid="attached-scans-list"
 * - Квадратная пропорция предпросмотра: aspectRatio: "1 / 1"
 *
 * Required AST Contract Test-IDs:
 * data-testid="tab-diagnostic-mode-rvg"
 * data-testid="tab-diagnostic-mode-photo"
 * data-testid="tab-diagnostic-mode-cbct"
 * data-testid="btn-open-direct-rvg-modal"
 * data-testid="btn-open-hot-folder-modal"
 * data-testid="btn-open-dicom-viewer-modal"
 * data-testid="btn-open-radiology-referral-modal"
 * data-testid="btn-open-cbct-studio-modal"
 * data-testid="toggle-advanced-diagnostics-btn"
 * data-testid="open-visit-ceph-modal-btn"
 * data-testid="visit-photo-protocol-card"
 * data-testid="visit-cbct-optg-card"
 * data-testid="visit-ceph-diagnostic-card"
 * data-testid="visit-diagnostics-header"
 */
export type { DiagnosticTabMode };

export function VisitDiagnosticsTab(props?: VisitDiagnosticsTabProps) {
	return <VisitDiagnosticsTabView {...props} />;
}
