import type React from "react";
import {
	RECALL_CYCLE_CATALOG,
	formatHumanRecallBadge,
	type PatientRecallRecord,
	type RecallContactStatus,
} from "./patientRecallEngine";
import { PatientRecallsTableActions } from "./PatientRecallsTableActions";

export interface PatientRecallsTableRowProps {
	readonly candidate: PatientRecallRecord;
	readonly isScriptActive: boolean;
	readonly isRealPreviewActive: boolean;
	readonly isDropdownOpen: boolean;
	readonly copiedCandidateId: string | null;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
	readonly onPostpone?: ((candidate: PatientRecallRecord, duration: "2_weeks" | "1_month") => void) | undefined;
	readonly onToggleDropdown: () => void;
}

export const PatientRecallsTableRow: React.FC<PatientRecallsTableRowProps> = ({
	candidate,
	isScriptActive,
	isRealPreviewActive,
	isDropdownOpen,
	copiedCandidateId,
	onBook,
	onTogglePreview,
	onToggleScript,
	onWhatsApp,
	onTelegram,
	onCopySms,
	onStatusUpdate,
	onPostpone,
	onToggleDropdown,
}) => {
	const cycleDef = RECALL_CYCLE_CATALOG[candidate.cycleType];
	const badge = formatHumanRecallBadge({
		urgencyStatus: candidate.urgencyStatus,
		daysOverdue: candidate.daysOverdue,
		dueDate: candidate.dueDate,
		status: candidate.status,
	});

	return (
		<tr data-testid={`recall-hub-row-${candidate.id}`}>
			<td>
				<div className="recall-patient-cell">
					<span className="recall-patient-name">{candidate.fullName}</span>
					<span className="recall-patient-phone">{candidate.phone || "телефон не указан"}</span>
				</div>
			</td>
			<td>
				<span className="recall-cycle-tag" title={cycleDef?.clinicalRationale}>
					{cycleDef?.shortTitle || candidate.cycleType}
				</span>
			</td>
			<td>
				<div>
					<div>{candidate.lastVisitDate}</div>
					<div style={{ fontSize: "0.75rem", color: "var(--rm-text-muted)" }}>План: {candidate.dueDate}</div>
				</div>
			</td>
			<td>
				<span className={`recall-badge recall-badge--${badge.badgeClass}`} title={badge.badgeTitle} data-testid={`recall-badge-${candidate.id}`}>
					{badge.badgeText}
				</span>
			</td>
			<td>
				<span style={{ fontSize: "0.8125rem", color: "var(--rm-text-main)" }}>{candidate.attendingDoctorName || "—"}</span>
			</td>
			<td>
				<select
					style={{
						padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--rm-border)",
						background: "var(--rm-surface)", color: "var(--rm-text-main)", fontSize: "0.8125rem", minHeight: "44px",
					}}
					value={candidate.status}
					onChange={(e) => onStatusUpdate(candidate.id, e.target.value as RecallContactStatus)}
				>
					<option value="due_now">Срок подошел</option>
					<option value="invited">Приглашен</option>
					<option value="scheduled">Записан на прием</option>
					<option value="completed">Визит завершен</option>
					<option value="declined">Отказ / Перенос</option>
				</select>
			</td>
			<td>
				<PatientRecallsTableActions
					candidate={candidate}
					isScriptActive={isScriptActive}
					isRealPreviewActive={isRealPreviewActive}
					isOpen={isDropdownOpen}
					copiedCandidateId={copiedCandidateId}
					onBook={onBook}
					onTogglePreview={onTogglePreview}
					onToggleScript={onToggleScript}
					onWhatsApp={onWhatsApp}
					onTelegram={onTelegram}
					onCopySms={onCopySms}
					onStatusUpdate={onStatusUpdate}
					onPostpone={onPostpone}
					onToggleDropdown={onToggleDropdown}
				/>
			</td>
		</tr>
	);
};
