/**
 * @file ShadowAnalystReport.tsx
 * Canonical Compatibility Facade (Mandate 8s: Single Canonical Domain Authority).
 * 
 * Re-exports ClinicalXrayProtocolPanel from ./ClinicalXrayProtocolPanel.
 * Pseudo-AI "Shadow Analyst" brand has been replaced with the professional
 * clinical radiology protocol panel (Mandate 8e: Doctor Autonomy).
 */

import React from "react";
import {
	ClinicalXrayProtocolPanel,
	type ClinicalXrayProtocolPanelProps,
	type ToothUpdate,
} from "./ClinicalXrayProtocolPanel";

export type { ToothUpdate };
export interface ShadowAnalystReportProps extends ClinicalXrayProtocolPanelProps {}

export function ShadowAnalystReport(props: ShadowAnalystReportProps) {
	return <ClinicalXrayProtocolPanel {...props} />;
}

export default ShadowAnalystReport;
