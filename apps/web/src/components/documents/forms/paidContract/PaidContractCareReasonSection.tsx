import React from "react";
import { QuickChipsRow } from "../../QuickChipsRow";
import { appendChipToText } from "../../documentChipText";

const PAID_CONTRACT_CARE_REASON_CHIPS = [
	"Кариес", "Пульпит", "Острая боль", "Плановый осмотр", "Профгигиена", "Жалобы отсутствуют",
] as const;

export interface PaidContractCareReasonSectionProps {
	careReason: string;
	setCareReason: (v: string) => void;
	serviceScope: string;
	setServiceScope: (v: string) => void;
	activeVisitComplaint?: string | null | undefined;
	activeVisitTreatmentPlan?: string | null | undefined;
	activeVisitDoctorSummary?: string | null | undefined;
}

export const PaidContractCareReasonSection: React.FC<PaidContractCareReasonSectionProps> = React.memo(
	function PaidContractCareReasonSection({
		careReason,
		setCareReason,
		serviceScope,
		setServiceScope,
		activeVisitComplaint,
		activeVisitTreatmentPlan,
		activeVisitDoctorSummary,
	}) {
		return (
			<>
				<label>
					Основание обращения
					<textarea
						value={careReason}
						onChange={(e) => setCareReason(e.target.value)}
						placeholder={activeVisitComplaint ?? "жалоба, диагноз или плановый повод"}
						rows={2}
					/>
					<QuickChipsRow
						chips={PAID_CONTRACT_CARE_REASON_CHIPS}
						onPick={(chip) => setCareReason(appendChipToText(careReason, chip))}
					/>
				</label>
				<label>
					Состав услуг
					<textarea
						value={serviceScope}
						onChange={(e) => setServiceScope(e.target.value)}
						placeholder={activeVisitTreatmentPlan || activeVisitDoctorSummary || "перечень согласованных платных услуг"}
						rows={3}
					/>
				</label>
			</>
		);
	},
);
