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
			<h4 className="pc-empty-title">Планы лечения не назначены</h4>
			<p className="pc-empty-desc">
				Индивидуальный план комплексного лечения ещё не составлен лечащим врачом.
				Запишитесь на первичную консультацию и диагностику к врачу клиники.
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
