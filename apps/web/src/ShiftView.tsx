import { motion } from "framer-motion";
import { ActivePatientHero } from "./components/workspace/shift/ActivePatientHero";
import { TodaySchedule } from "./components/workspace/shift/TodaySchedule";
import { RoleFocusStrip } from "./components/workspace/shift/RoleFocusStrip";
import { ShiftIntelligence } from "./components/workspace/shift/ShiftIntelligence";
import { ShiftEndSummary } from "./components/workspace/shift/ShiftEndSummary";
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
				<ShiftEndSummary />
			</div>
		</motion.div>
	);
}
