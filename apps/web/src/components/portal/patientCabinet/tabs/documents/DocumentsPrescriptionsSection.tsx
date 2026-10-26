import React from "react";
import { CheckCircle2, Pill, Printer } from "lucide-react";
import type { PatientPersonalCabinetData } from "../../patientCabinetEngine";
import { generatePrescription107PrintHtml, openPrintWindow } from "../../patientCabinetEngine";

export interface DocumentsPrescriptionsSectionProps {
	readonly prescriptions: PatientPersonalCabinetData["prescriptions"];
	readonly data: PatientPersonalCabinetData;
	readonly onShowToast: (msg: string) => void;
}

export const DocumentsPrescriptionsSection: React.FC<DocumentsPrescriptionsSectionProps> = ({
	prescriptions,
	data,
	onShowToast,
}) => {
	const handlePrint = (rx: NonNullable<PatientPersonalCabinetData["prescriptions"]>[number]) => {
		openPrintWindow(generatePrescription107PrintHtml(rx, data));
		onShowToast(`Рецептурный бланк 107-1/у (${rx.medicationName}) готов к печати!`);
	};

	return (
		<section className="pc-section-card" data-testid="prescriptions-section">
			<div className="pc-card-header">
				<div className="pc-card-title">
					<Pill size={20} className="pc-icon-primary" />
					<span>Электронные рецепты на лекарственные препараты</span>
				</div>
				<span className="pc-section-hint">Для предъявления в аптеках РФ</span>
			</div>
			{(!prescriptions || prescriptions.length === 0) ? (
				<div className="pc-empty-state" data-testid="prescriptions-empty-state">
					<Pill size={32} className="pc-icon-muted" />
					<p className="pc-empty-title">Назначений лекарственных препаратов нет</p>
					<p className="pc-empty-desc">
						Лечащий врач не назначал рецептурных медикаментов. При необходимости назначенные врачом электронные рецепты отобразятся здесь.
					</p>
				</div>
			) : (
				<div className="pc-prescriptions-list" data-testid="prescriptions-list">
					{prescriptions.map((rx) => (
						<div key={rx.id} className="pc-prescription-item" data-testid={`rx-item-${rx.id}`}>
							<div>
								<div className="pc-rx-title-line">
									<strong>{rx.medicationName} {rx.dosageRu}</strong>
									<span className="pc-status-badge paid">
										<CheckCircle2 size={12} />
										<span>{rx.validityDays ? `Действителен (${rx.validityDays} дн.)` : "Действителен"}</span>
									</span>
								</div>
								<p className="pc-rx-instruction">
									{rx.instructionRu} &bull; Курс: {rx.durationRu}
								</p>
							</div>
							<button
								type="button"
								className="pc-btn-primary pc-rx-download-btn"
								data-testid={`print-prescription-btn-${rx.id}`}
								onClick={() => handlePrint(rx)}
							>
								<Printer size={15} />
								<span>Печать рецепта (107-1/у)</span>
							</button>
						</div>
					))}
				</div>
			)}
		</section>
	);
};
