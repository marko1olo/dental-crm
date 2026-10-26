import React from "react";
import { Award, Clock, ExternalLink } from "lucide-react";
import type { PatientPersonalCabinetData } from "../../patientCabinetEngine";
import {
	calculateCheckupDaysRemaining,
	calculateWarrantyValidity,
	formatRussianDateIso,
} from "../../patientCabinetEngine";

export interface DocumentsWarrantiesSectionProps {
	readonly warranties: PatientPersonalCabinetData["warranties"];
}

export const DocumentsWarrantiesSection: React.FC<DocumentsWarrantiesSectionProps> = ({ warranties }) => {
	if (!warranties || warranties.length === 0) return null;

	return (
		<section className="pc-section-card">
			<div className="pc-card-header">
				<div className="pc-card-title">
					<Award size={20} className="pc-icon-primary" />
					<span>Электронные гарантийные паспорта DENTE</span>
				</div>
				<span className="pc-section-hint">Положение СтАР • Закон РФ № 2300-1</span>
			</div>
			<div className="pc-warranties-list">
				{warranties.map((war) => {
					const checkupCalc = calculateCheckupDaysRemaining(war.nextCheckupDueDateIso);
					const validityCalc = calculateWarrantyValidity(war.expirationDateIso);
					const countdownClass = checkupCalc.isOverdue ? "overdue" : checkupCalc.isUrgent ? "urgent" : "normal";

					return (
						<div key={war.certificateId} className="pc-warranty-card">
							<div className="pc-warranty-head">
								<div>
									<div className="pc-warranty-title-line">
										<strong>Сертификат № {war.certificateId}</strong>
										<span className={`pc-warranty-countdown-badge ${countdownClass}`}>
											<Clock size={12} />
											<span>Чекап: {checkupCalc.labelRu}</span>
										</span>
									</div>
									<p className="pc-warranty-meta">
										Выдан: {formatRussianDateIso(war.issueDateIso)} &bull; Врач: {war.doctorName} &bull; {validityCalc.labelRu}
									</p>
								</div>
								<a href={war.verificationUrl} target="_blank" rel="noreferrer" className="pc-btn-secondary pc-btn-compact">
									<ExternalLink size={14} />
									<span>Проверить онлайн</span>
								</a>
							</div>
							<div className="pc-warranty-items-box">
								{war.items.map((item, idx) => (
									<div key={idx} className="pc-warranty-item-row">
										<div>
											<strong>Зуб #{item.toothFdi}</strong>: {item.workTitleRu} ({item.materialName})
										</div>
										{item.lotNumber && <span className="pc-lot-number">{item.lotNumber}</span>}
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
};
