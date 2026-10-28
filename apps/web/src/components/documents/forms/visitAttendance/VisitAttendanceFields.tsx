import React from "react";
import type { Appointment, StaffMember } from "@dental/shared";
import { formatDateTime } from "../../../../AppHelpers";
import { useDocumentStore } from "../../../../store/documentStore";

export interface VisitAttendanceFieldsProps {
	activeAppointment?: Appointment | null | undefined;
	activeDoctor?: StaffMember | null | undefined;
}

export const VisitAttendanceFields: React.FC<VisitAttendanceFieldsProps> = React.memo(
	function VisitAttendanceFields({ activeAppointment, activeDoctor }) {
		const {
			attendanceDiagnosisDisclosureExcluded, attendanceEndedAt, attendanceIssuedAt,
			attendanceNotSickLeaveAcknowledged, attendancePurpose, attendanceRecipientOrganization,
			attendanceSignedByFullName, attendanceSignedByRole, attendanceStartedAt,
			setAttendanceDiagnosisDisclosureExcluded, setAttendanceEndedAt, setAttendanceIssuedAt,
			setAttendanceNotSickLeaveAcknowledged, setAttendancePurpose, setAttendanceRecipientOrganization,
			setAttendanceSignedByFullName, setAttendanceSignedByRole, setAttendanceStartedAt,
		} = useDocumentStore();

		return (
			<div className="document-payload-collapsed-content" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
				<div className="document-payload-row">
					<label>
						Начало приема
						<input
							value={attendanceStartedAt}
							onChange={(e) => setAttendanceStartedAt(e.target.value)}
							placeholder={activeAppointment?.startsAt ? formatDateTime(activeAppointment.startsAt) : "дата и время начала"}
						/>
					</label>
					<label>
						Окончание приема
						<input
							value={attendanceEndedAt}
							onChange={(e) => setAttendanceEndedAt(e.target.value)}
							placeholder={activeAppointment?.endsAt ? formatDateTime(activeAppointment.endsAt) : "дата и время окончания"}
						/>
					</label>
				</div>
				<label>
					Цель выдачи
					<input value={attendancePurpose} onChange={(e) => setAttendancePurpose(e.target.value)} />
				</label>
				<label>
					Куда предъявляется
					<input
						value={attendanceRecipientOrganization}
						onChange={(e) => setAttendanceRecipientOrganization(e.target.value)}
						placeholder="работа, учеба, страховая или по месту требования"
					/>
				</label>
				<div className="document-payload-row">
					<label>
						Подписант
						<input
							value={attendanceSignedByFullName}
							onChange={(e) => setAttendanceSignedByFullName(e.target.value)}
							placeholder={activeDoctor?.fullName ?? "врач или администратор"}
						/>
					</label>
					<label>
						Должность
						<input value={attendanceSignedByRole} onChange={(e) => setAttendanceSignedByRole(e.target.value)} />
					</label>
				</div>
				<label>
					Дата выдачи
					<input value={attendanceIssuedAt} onChange={(e) => setAttendanceIssuedAt(e.target.value)} />
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={attendanceDiagnosisDisclosureExcluded}
						type="checkbox"
						onChange={(e) => setAttendanceDiagnosisDisclosureExcluded(e.target.checked)}
					/>
					Диагноз, план лечения, снимки и стоимость не раскрываются
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={attendanceNotSickLeaveAcknowledged}
						type="checkbox"
						onChange={(e) => setAttendanceNotSickLeaveAcknowledged(e.target.checked)}
					/>
					Справка не заменяет листок нетрудоспособности
				</label>
			</div>
		);
	},
);
