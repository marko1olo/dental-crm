import React from "react";
import { Calendar, Percent } from "lucide-react";

interface TreatmentPlanEmptyStateProps {
	readonly curatingDoctor?: string;
	readonly onBookAppointment: () => void;
}

export const TreatmentPlanEmptyState: React.FC<TreatmentPlanEmptyStateProps> = ({
	curatingDoctor,
	onBookAppointment,
}) => {
	return (
		<div className="pc-empty-state" data-testid="pc-treatment-plan-empty">
			<Percent size={40} className="pc-icon-muted" />
			<h4 className="pc-empty-title">План комплексного лечения формируется</h4>
			<p className="pc-empty-desc">
				Ваш лечащий врач <strong>{curatingDoctor || "Клиники"}</strong> составляет
				индивидуальный план лечения и оздоровления. После согласования он сразу появится в вашем
				личном кабинете.
			</p>
			<button
				type="button"
				className="pc-btn-primary"
				onClick={onBookAppointment}
			>
				<Calendar size={16} />
				<span>Записаться на консультацию</span>
			</button>
		</div>
	);
};
