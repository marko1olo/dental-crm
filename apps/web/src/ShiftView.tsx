import { motion } from "framer-motion";
import { ActivePatientHero } from "./components/workspace/shift/ActivePatientHero";
import { TodaySchedule } from "./components/workspace/shift/TodaySchedule";
import { RoleFocusStrip } from "./components/workspace/shift/RoleFocusStrip";
import { ShiftIntelligence } from "./components/workspace/shift/ShiftIntelligence";
import { ProdoctorovSyncWidget } from "./components/integrations/ProdoctorovSyncWidget";
import { CustomExaminationFormCatalogsWidget } from "./components/clinical/CustomExaminationFormCatalogsWidget";
import { TreatmentPlanPrintOdontogramWidget } from "./components/documents/TreatmentPlanPrintOdontogramWidget";
import { EgiszMultipleDiagnosesWidget } from "./components/clinical/EgiszMultipleDiagnosesWidget";
import { Mkb10AutoDirectoriesWidget } from "./components/integrations/Mkb10AutoDirectoriesWidget";
import { NonDentalExaminationFormsWidget } from "./components/clinical/NonDentalExaminationFormsWidget";
import { TreatmentPlanStagesWidget } from "./components/documents/TreatmentPlanStagesWidget";
import { ScheduleTimeReservationsWidget } from "./components/schedule/ScheduleTimeReservationsWidget";
import { DiagnocatAiFindingsWidget } from "./components/integrations/DiagnocatAiFindingsWidget";
import { ExtendedOdontogramStatesWidget } from "./components/clinical/ExtendedOdontogramStatesWidget";

export { PatientCockpit } from "./components/workspace/shift/PatientCockpit";

export function ShiftView() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
			style={{ display: "flex", flexDirection: "column", gap: "16px" }}
		>
			<section className="shift-hero" id="shift">
				<ActivePatientHero />
				<TodaySchedule />
			</section>

			<div
				className="shift-dashboard-grid"
				style={{
					display: "grid",
					gridTemplateColumns: "1fr",
					gap: "16px",
					marginTop: "16px",
				}}
			>
				<RoleFocusStrip />
				<ShiftIntelligence />
				<ProdoctorovSyncWidget />
				<CustomExaminationFormCatalogsWidget />
				<TreatmentPlanPrintOdontogramWidget />
				<EgiszMultipleDiagnosesWidget />
				<Mkb10AutoDirectoriesWidget />
				<NonDentalExaminationFormsWidget />
				<TreatmentPlanStagesWidget />
				<ScheduleTimeReservationsWidget />
				<DiagnocatAiFindingsWidget />
				<ExtendedOdontogramStatesWidget />
			</div>
		</motion.div>
	);
}


