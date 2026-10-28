import type { Appointment, StaffMember } from "@dental/shared";
import { Edit3 } from "lucide-react";
import React from "react";
import { VisitAttendanceFields } from "./visitAttendance/VisitAttendanceFields";

export interface VisitAttendanceCertificateFormProps {
	activeAppointment?: Appointment | null | undefined;
	activeDoctor?: StaffMember | null | undefined;
}

export const VisitAttendanceCertificateForm: React.FC<
	VisitAttendanceCertificateFormProps
> = React.memo(function VisitAttendanceCertificateForm({ activeAppointment, activeDoctor }) {
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
				<summary
					style={{
						cursor: "pointer",
						fontWeight: 600,
						color: "var(--brand-700)",
						userSelect: "none",
					}}
				>
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<Edit3 size={13} aria-hidden="true" />
						Ручная корректировка полей (развернуть)
					</span>
				</summary>
				<VisitAttendanceFields
					activeAppointment={activeAppointment}
					activeDoctor={activeDoctor}
				/>
			</details>
		</article>
	);
});
