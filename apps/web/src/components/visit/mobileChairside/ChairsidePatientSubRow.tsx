import React from "react";
import { AlertOctagon } from "lucide-react";
import { VisitTimer } from "../VisitTimer";

export interface ChairsidePatientSubRowProps {
	activeAppointment?: { startsAt?: string; [key: string]: any } | undefined;
	consolidatedAllergyChip?: string | null | undefined;
	testId?: string;
}

export const ChairsidePatientSubRow: React.FC<ChairsidePatientSubRowProps> = ({
	activeAppointment,
	consolidatedAllergyChip,
	testId = "mobile-chairside-workspace",
}) => {
	return (
		<div className="mobile-chairside-hud-sub-row">
			<div className="mobile-chairside-timer-wrap">
				<VisitTimer
					startTime={activeAppointment?.startsAt}
					compact
					className="mobile-chairside-timer"
				/>
			</div>

			{consolidatedAllergyChip && (
				<div
					className="mobile-chairside-allergy-chip"
					data-testid={`${testId}-allergy-chip`}
					title={consolidatedAllergyChip}
				>
					<AlertOctagon size={13} className="shrink-0 animate-pulse text-rose-500" />
					<span className="mobile-chairside-allergy-text">{consolidatedAllergyChip}</span>
				</div>
			)}
		</div>
	);
};
