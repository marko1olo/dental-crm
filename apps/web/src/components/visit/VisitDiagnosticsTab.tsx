import React from "react";
import "./VisitDiagnosticsTab.css";
import { VisitDiagnosticsTabView } from "./diagnosticsTab";
import type { DiagnosticTabMode, VisitDiagnosticsTabProps } from "./diagnosticsTab";

/*
  СНИМОК И ЗАКЛЮЧЕНИЕ ПРИВЯЗАНЫ НАПРЯМУЮ К ПАЦИЕНТУ ПРИЁМА.

  Прямая изоляция контекста пациента:
  VisiographAnalyzer принимает идентификатор пациента приёма через пропс patientId
  (patientId={activePatient?.id}), благодаря чему снимок, заключение и отметки
  зубов гарантированно сохраняются в карту пациента текущего приёма, даже если в
  разделе «Пациенты» параллельно открыта карточка другого человека.
*/
export type { DiagnosticTabMode };

export function VisitDiagnosticsTab(props?: VisitDiagnosticsTabProps) {
	return <VisitDiagnosticsTabView {...props} />;
}
