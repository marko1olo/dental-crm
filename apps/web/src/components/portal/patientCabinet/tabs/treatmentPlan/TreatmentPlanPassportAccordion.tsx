import React from "react";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import type { PatientDentalPassport } from "../../patientCabinetEngine.js";

interface TreatmentPlanPassportAccordionProps {
	readonly dentalPassport: PatientDentalPassport;
	readonly isPassportExpanded: boolean;
	readonly onTogglePassport: () => void;
}

export const TreatmentPlanPassportAccordion: React.FC<TreatmentPlanPassportAccordionProps> = ({
	dentalPassport,
	isPassportExpanded,
	onTogglePassport,
}) => {
	return (
		<div className="pc-card pc-passport-accordion-card">
			<div className="pc-card-header pc-clickable-header" onClick={onTogglePassport}>
				<div className="pc-card-title">
					<ShieldCheck size={20} className="pc-icon-primary" />
					<div>
						<strong>Зубной паспорт пациента &bull; Гарантии DENTE</strong>
						<div className="pc-card-subtitle">
							Пролечено зубов: {dentalPassport.totalTreatedTeethCount} &bull;{" "}
							Активных гарантий: {dentalPassport.activeGuaranteesCount}
						</div>
					</div>
				</div>
				<button
					type="button"
					className="pc-btn-secondary pc-btn-compact"
					aria-label={isPassportExpanded ? "Свернуть" : "Развернуть"}
					onClick={(e) => {
						e.stopPropagation();
						onTogglePassport();
					}}
				>
					{isPassportExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
					<span>{isPassportExpanded ? "Скрыть" : "Показать карточки"}</span>
				</button>
			</div>

			{isPassportExpanded && (
				<div className="pc-dental-passport-grid pc-passport-expanded-grid">
					{dentalPassport.entries.map((entry) => (
						<div
							key={entry.toothFdi}
							className="pc-dental-passport-card"
							data-testid={`treatment-plan-passport-${entry.toothFdi}`}
						>
							<div className="pc-passport-card-top">
								<div className="pc-tooth-badge">{entry.toothFdi}</div>
								<div>
									<strong className="pc-tooth-card-title">Зуб №{entry.toothFdi}</strong>
									<span className="pc-tooth-card-anatomy">{entry.anatomyRu}</span>
								</div>
								{entry.isWarrantyActive && (
									<span className="pc-status-badge paid">
										Гарантия {entry.warrantyMonths} мес.
									</span>
								)}
							</div>
							<div className="pc-plain-summary-box">{entry.plainSummaryRu}</div>
							<div className="pc-passport-card-details">
								<div><strong>Процедура:</strong> {entry.procedureTitleRu}</div>
								<div><strong>Материал:</strong> {entry.materialName}</div>
								{entry.vitaShade && (
									<div><strong>Оттенок VITA:</strong> {entry.vitaShade}</div>
								)}
								<div>
									<strong>Врач:</strong> {entry.doctorName} &bull; {entry.treatmentDateRu}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
