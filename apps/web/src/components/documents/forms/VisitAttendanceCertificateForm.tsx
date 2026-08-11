import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function VisitAttendanceCertificateForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                input,
                attendanceStartedAt,
                event,
                setAttendanceStartedAt,
                activeAppointment,
                formatDateTime,
                attendanceEndedAt,
                setAttendanceEndedAt,
                attendancePurpose,
                setAttendancePurpose,
                attendanceRecipientOrganization,
                setAttendanceRecipientOrganization,
                attendanceSignedByFullName,
                setAttendanceSignedByFullName,
                activeDoctor,
                attendanceSignedByRole,
                setAttendanceSignedByRole,
                attendanceIssuedAt,
                setAttendanceIssuedAt,
                attendanceDiagnosisDisclosureExcluded,
                setAttendanceDiagnosisDisclosureExcluded,
                attendanceNotSickLeaveAcknowledged,
                setAttendanceNotSickLeaveAcknowledged
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Справка о посещении</h3>
    								<p>
    									Фиксирует только факт и время приема без диагноза, лечения,
    									снимков и стоимости.
    								</p>
    							</div>
    							<details
    								className="document-manual-override"
    								style={{
    									background: "var(--surface-100)",
    									padding: "12px 16px",
    									borderRadius: "8px",
    									border: "1px solid var(--line)",
    									marginTop: "16px",
    								}}
    							>
    								<summary
    									style={{
    										cursor: "pointer",
    										fontWeight: 600,
    										color: "var(--brand-700)",
    										userSelect: "none",
    									}}
    								>
    									✏️ Ручная корректировка полей (развернуть)
    								</summary>
    								<div
    									className="document-payload-collapsed-content"
    									style={{
    										marginTop: "16px",
    										display: "flex",
    										flexDirection: "column",
    										gap: "16px",
    									}}
    								>
    									<div className="document-payload-row">
    										<label>
    											Начало приема
    											<input
    												value={attendanceStartedAt}
    												onChange={(event) =>
    													setAttendanceStartedAt(event.target.value)
    												}
    												placeholder={
    													activeAppointment?.startsAt
    														? formatDateTime(activeAppointment.startsAt)
    														: "дата и время начала"
    												}
    											/>
    										</label>
    										<label>
    											Окончание приема
    											<input
    												value={attendanceEndedAt}
    												onChange={(event) =>
    													setAttendanceEndedAt(event.target.value)
    												}
    												placeholder={
    													activeAppointment?.endsAt
    														? formatDateTime(activeAppointment.endsAt)
    														: "дата и время окончания"
    												}
    											/>
    										</label>
    									</div>
    									<label>
    										Цель выдачи
    										<input
    											value={attendancePurpose}
    											onChange={(event) =>
    												setAttendancePurpose(event.target.value)
    											}
    										/>
    									</label>
    									<label>
    										Куда предъявляется
    										<input
    											value={attendanceRecipientOrganization}
    											onChange={(event) =>
    												setAttendanceRecipientOrganization(event.target.value)
    											}
    											placeholder="работа, учеба, страховая или по месту требования"
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Подписант
    											<input
    												value={attendanceSignedByFullName}
    												onChange={(event) =>
    													setAttendanceSignedByFullName(event.target.value)
    												}
    												placeholder={
    													activeDoctor?.fullName ?? "врач или администратор"
    												}
    											/>
    										</label>
    										<label>
    											Должность
    											<input
    												value={attendanceSignedByRole}
    												onChange={(event) =>
    													setAttendanceSignedByRole(event.target.value)
    												}
    											/>
    										</label>
    									</div>
    									<label>
    										Дата выдачи
    										<input
    											value={attendanceIssuedAt}
    											onChange={(event) =>
    												setAttendanceIssuedAt(event.target.value)
    											}
    										/>
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={attendanceDiagnosisDisclosureExcluded}
    											type="checkbox"
    											onChange={(event) =>
    												setAttendanceDiagnosisDisclosureExcluded(
    													event.target.checked,
    												)
    											}
    										/>
    										Диагноз, план лечения, снимки и стоимость не раскрываются
    									</label>
    									<label className="document-payload-checkbox">
    										<input
    											checked={attendanceNotSickLeaveAcknowledged}
    											type="checkbox"
    											onChange={(event) =>
    												setAttendanceNotSickLeaveAcknowledged(
    													event.target.checked,
    												)
    											}
    										/>
    										Справка не заменяет листок нетрудоспособности
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

