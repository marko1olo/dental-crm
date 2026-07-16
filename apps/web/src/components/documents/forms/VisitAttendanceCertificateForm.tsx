import React from 'react';
import { useDocumentStore } from '../../../store/documentStore';
import { CheckCircle2, FileText } from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function VisitAttendanceCertificateForm({ activeAppointment, activeDoctor, formatDateTime }: any) {
  const {
    attendanceEndedAt,
    attendanceIssuedAt,
    attendanceNotSickLeaveAcknowledged,
    attendancePurpose,
    attendanceRecipientOrganization,
    attendanceSignedByFullName,
    attendanceSignedByRole,
    attendanceStartedAt,
    setAttendanceDiagnosisDisclosureExcluded,
    setAttendanceEndedAt,
    setAttendanceIssuedAt,
    setAttendanceNotSickLeaveAcknowledged,
    setAttendancePurpose,
    setAttendanceRecipientOrganization,
    setAttendanceSignedByFullName,
    setAttendanceSignedByRole,
    setAttendanceStartedAt,
    attendanceDiagnosisDisclosureExcluded
  } = useDocumentStore();

  return (

						<article className="document-payload-card">
							<div>
								<h3>Справка о посещении</h3>
								<p>
									Фиксирует только факт и время приема без диагноза, лечения,
									снимков и стоимости.
								</p>
							</div>
							<details className="document-manual-override">
								<summary className="document-summary-toggle">
									✏️ Ручная корректировка полей (развернуть)
								</summary>
								<div className="document-payload-collapsed-content">
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
