/**
 * DENTE CRM — Clinical Guide Content Component Dispatcher
 * Authority: Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy)
 */

import React from "react";
import type { ClinicalGuideTab } from "./helpTypes";
import { ScheduleGuide } from "../ScheduleGuide";
import { OdontogramGuide } from "../OdontogramGuide";
import { MedicalRecordGuide } from "../MedicalRecordGuide";
import { CashierGuide } from "../CashierGuide";
import { Imaging3DGuide } from "../Imaging3DGuide";
import { TreatmentPlansGuide } from "../TreatmentPlansGuide";
import { DentalLabGuide } from "../DentalLabGuide";
import { InventoryWarehouseGuide } from "../InventoryWarehouseGuide";
import { SanPiNAutoclaveGuide } from "../SanPiNAutoclaveGuide";
import { LeadsTelephonyGuide } from "../LeadsTelephonyGuide";
import { LanMeshGuide } from "../LanMeshGuide";
import { AnalyticsReportsGuide } from "../AnalyticsReportsGuide";

export interface ClinicalGuideRendererProps {
	readonly activeTab: ClinicalGuideTab;
	readonly onLaunchTour?: ((trackId?: string) => void) | undefined;
}

export const ClinicalGuideRenderer: React.FC<ClinicalGuideRendererProps> = React.memo(({
	activeTab,
	onLaunchTour,
}) => {
	switch (activeTab) {
		case "schedule":
			return <ScheduleGuide onLaunchTour={onLaunchTour} />;
		case "odontogram":
			return <OdontogramGuide onLaunchTour={onLaunchTour} />;
		case "medical_record":
			return <MedicalRecordGuide onLaunchTour={onLaunchTour} />;
		case "cashier":
			return <CashierGuide onLaunchTour={onLaunchTour} />;
		case "imaging":
			return <Imaging3DGuide onLaunchTour={onLaunchTour} />;
		case "treatment_plans":
			return <TreatmentPlansGuide onLaunchTour={onLaunchTour} />;
		case "dental_lab":
			return <DentalLabGuide onLaunchTour={onLaunchTour} />;
		case "inventory":
			return <InventoryWarehouseGuide onLaunchTour={onLaunchTour} />;
		case "sanpin":
			return <SanPiNAutoclaveGuide onLaunchTour={onLaunchTour} />;
		case "leads":
			return <LeadsTelephonyGuide onLaunchTour={onLaunchTour} />;
		case "lan_mesh":
			return <LanMeshGuide onLaunchTour={onLaunchTour} />;
		case "analytics":
			return <AnalyticsReportsGuide onLaunchTour={onLaunchTour} />;
		default:
			return <ScheduleGuide onLaunchTour={onLaunchTour} />;
	}
});

ClinicalGuideRenderer.displayName = "ClinicalGuideRenderer";
