/**
 * DENTE CRM — Doctor Signature & Rubber Stamp (Layer 2)
 * Authentic clinical stamp and doctor signature line.
 */

import React from "react";

export interface ReportDoctorSignatureStampProps {
	doctorName: string;
}

export const ReportDoctorSignatureStamp: React.FC<ReportDoctorSignatureStampProps> = ({
	doctorName,
}) => {
	return (
		<footer className="radiology-signature-row">
			<div className="radiology-signature-doctor">
				<div className="radiology-signature-doc-name">Врач: {doctorName}</div>
				<div className="radiology-signature-doc-role">Врач-стоматолог терапевт / рентгенолог</div>
			</div>

			<div className="radiology-signature-line-box">
				<div className="radiology-signature-line">
					<div className="radiology-signature-handwritten">Воронов А.</div>
					<div className="radiology-signature-underline" />
					<div className="radiology-signature-label">Личная подпись врача</div>
				</div>

				{/* Real Clinical Rubber Stamp */}
				<div className="radiology-clinic-stamp" aria-hidden="true">
					<div className="radiology-stamp-top">СТОМАТОЛОГИЯ DENTE</div>
					<div className="radiology-stamp-center">ДЛЯ ДОКУМЕНТОВ</div>
					<div className="radiology-stamp-bottom">ЛО-77-01-019842</div>
				</div>
			</div>
		</footer>
	);
};
