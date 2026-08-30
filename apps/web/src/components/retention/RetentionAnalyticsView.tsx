/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RETENTION ANALYTICS & LOST PATIENTS VIEW (DENTE CRM)
 * Patient Churn Risk, Recall Cohort 6/12m, and Chair-Hour Rate Analytics
 * Compliant with Hick's Law (<= 2 direct actions per entity row) & WCAG AA
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type React from "react";
import {
	LostPatientsPanel,
	type LostPatientsPanelProps,
	type LostPatientRow,
	type ChairConfig,
} from "../analytics/LostPatientsPanel";

export interface RetentionAnalyticsViewProps extends LostPatientsPanelProps {
	readonly className?: string;
}

export const RetentionAnalyticsView: React.FC<RetentionAnalyticsViewProps> = (props) => {
	return <LostPatientsPanel {...props} />;
};

export {
	LostPatientsPanel,
	type LostPatientsPanelProps,
	type LostPatientRow,
	type ChairConfig,
};

export default RetentionAnalyticsView;
