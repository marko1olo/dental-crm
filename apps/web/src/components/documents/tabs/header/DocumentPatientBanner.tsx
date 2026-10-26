import React from "react";
import type { GeneratedDocument, Patient } from "@dental/shared";
import { CheckCircle2, Clock } from "lucide-react";
import { formatShortDate } from "../../../../AppHelpers";

export interface DocumentPatientBannerProps {
	activePatient?: Patient | null | undefined;
	patientIssuedDocsCount: number;
	patientDraftDocsCount: number;
	typedActiveDocuments: GeneratedDocument[];
}

export const DocumentPatientBanner: React.FC<DocumentPatientBannerProps> = React.memo(
	function DocumentPatientBanner({
		activePatient,
		patientIssuedDocsCount,
		patientDraftDocsCount,
		typedActiveDocuments,
	}) {
		return (
			<div className="document-patient-banner">
				<div className="document-patient-info">
					<span className="document-patient-name">
						{activePatient ? activePatient.fullName : "Все пациенты клиники"}
					</span>
					{activePatient?.birthDate && (
						<span className="document-patient-badge">
							Д/Р: {formatShortDate(activePatient.birthDate)}
						</span>
					)}
					{activePatient?.phone && (
						<span className="document-patient-badge">
							Тел: {activePatient.phone}
						</span>
					)}
				</div>
				<div className="document-patient-stats">
					<span className="document-stat-pill" title="Выданные и подписанные документы">
						<CheckCircle2 size={13} className="inline mr-1 text-[var(--primary,#0d9488)]" aria-hidden="true" />
						Выдано: {patientIssuedDocsCount}
					</span>
					<span className="document-stat-pill" title="Черновики в работе">
						<Clock size={13} className="inline mr-1 text-[var(--muted)]" aria-hidden="true" />
						Черновиков: {patientDraftDocsCount}
					</span>
					<span className="document-stat-pill" title="Всего документов">
						Всего: {typedActiveDocuments.length}
					</span>
				</div>
			</div>
		);
	},
);

DocumentPatientBanner.displayName = "DocumentPatientBanner";
