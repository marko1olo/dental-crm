import type React from "react";
import { Phone } from "lucide-react";
import {
	RECALL_CYCLE_CATALOG,
	formatHumanRecallBadge,
	type PatientRecallRecord,
	type RecallContactStatus,
} from "./patientRecallEngine";
import { formatVisitDate, getRecommendedProcedureTitle } from "./RecallPatientRowCardHelpers";
import { RecallPatientRowCardActions } from "./RecallPatientRowCardActions";

export interface RecallPatientRowCardProps {
	readonly candidate: PatientRecallRecord;
	readonly isScriptActive?: boolean | undefined;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview?: ((candidate: PatientRecallRecord) => void) | undefined;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const RecallPatientRowCard: React.FC<RecallPatientRowCardProps> = ({
	candidate,
	isScriptActive = false,
	onBook,
	onToggleScript,
	onTogglePreview,
	onWhatsApp,
	onTelegram,
	onCopySms,
	onStatusUpdate,
}) => {
	const cycleDef = RECALL_CYCLE_CATALOG[candidate.cycleType];
	const badge = formatHumanRecallBadge({
		urgencyStatus: candidate.urgencyStatus,
		daysOverdue: candidate.daysOverdue,
		dueDate: candidate.dueDate,
		status: candidate.status,
	});

	const recommendedProcedure = getRecommendedProcedureTitle(candidate.cycleType);

	return (
		<article
			className="recall-patient-card"
			data-testid={`recall-hub-row-${candidate.id}`}
			style={{ minHeight: "52px" }}
		>
			<div className="recall-patient-card__main">
				<div className="recall-patient-card__header">
					<h4 className="recall-patient-card__name">{candidate.fullName}</h4>
					<span
						className={`recall-badge recall-badge--${badge.badgeClass}`}
						data-testid={`recall-badge-${candidate.id}`}
					>
						{badge.badgeText}
					</span>
				</div>

				<div className="recall-patient-card__details">
					<span className="recall-patient-card__procedure">
						{recommendedProcedure}
					</span>
					<span className="recall-patient-card__divider" aria-hidden="true">•</span>
					<span className="recall-patient-card__last-visit">
						Прошлый визит: {formatVisitDate(candidate.lastVisitDate)}
					</span>
					{candidate.attendingDoctorName && (
						<>
							<span className="recall-patient-card__divider" aria-hidden="true">•</span>
							<span className="recall-patient-card__doctor">
								Врач: {candidate.attendingDoctorName}
							</span>
						</>
					)}
				</div>

				<div className="recall-patient-card__meta">
					{candidate.phone ? (
						<a
							href={`tel:${candidate.phone}`}
							className="recall-patient-card__phone"
							title="Позвонить пациенту"
						>
							<Phone size={13} />
							<span>{candidate.phone}</span>
						</a>
					) : (
						<span className="recall-patient-card__no-phone">телефон не указан</span>
					)}
					<span className="recall-cycle-tag">
						{cycleDef?.shortTitle || candidate.cycleType}
					</span>
				</div>
			</div>

			<RecallPatientRowCardActions
				candidate={candidate}
				isScriptActive={isScriptActive}
				onBook={onBook}
				onToggleScript={onToggleScript}
				onTogglePreview={onTogglePreview}
				onWhatsApp={onWhatsApp}
				onTelegram={onTelegram}
				onCopySms={onCopySms}
				onStatusUpdate={onStatusUpdate}
			/>
		</article>
	);
};
