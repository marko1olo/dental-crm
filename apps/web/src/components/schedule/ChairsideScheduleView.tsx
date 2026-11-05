/**
 * ChairsideScheduleView.tsx
 * Canonical SSOT for Chairside Schedule View in DENTE Dental CRM.
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor & Small Clinic Sovereignty), 8b (Clean Sweet Spot).
 */

import React from "react";
import {
	ChairScheduleView,
	type ChairScheduleViewProps,
	resolveChairDutyDoctor,
	useSchedule,
} from "./ChairScheduleView";

export { ChairScheduleView, resolveChairDutyDoctor, useSchedule };
export type { ChairScheduleViewProps };

export const ChairsideScheduleView: React.FC<ChairScheduleViewProps> = (props) => {
	return <ChairScheduleView {...props} />;
};

export default ChairsideScheduleView;
