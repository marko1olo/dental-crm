import React from "react";
import { AlertTriangle } from "lucide-react";
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
					createdAt={activeAppointment?.startsAt}
				/>
			</div>

			{consolidatedAllergyChip ? (
				<div
					className="mobile-chairside-allergy-chip mobile-chairside-allergy-pulse inline-flex items-center gap-1 text-xs"
					data-testid={`${testId}-allergy-chip`}
					title={consolidatedAllergyChip}
				>
					<AlertTriangle size={13} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
					<span className="mobile-chairside-allergy-text">{consolidatedAllergyChip}</span>
				</div>
			) : (
				<div
					className="mobile-chairside-allergy-clean"
					data-testid={`${testId}-allergy-clean-badge`}
					title="Аллергии не выявлены"
				>
					<span className="mobile-chairside-allergy-clean-text">✓ Аллергии не выявлены</span>
				</div>
			)}
		</div>
	);
};
