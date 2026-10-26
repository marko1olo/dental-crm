import React from "react";
import { Calendar, Check, Clock, MapPin } from "lucide-react";
import type { PatientAppointmentItem } from "../../patientCabinetEngine";
import { OverviewCalendarButtons } from "./OverviewCalendarButtons";
import { OverviewNextAppointmentActions } from "./OverviewNextAppointmentActions";

export interface OverviewNextAppointmentCardProps {
	readonly appt: PatientAppointmentItem;
	readonly countdown: string | null;
	readonly onOpenSelfCheckin: () => void;
	readonly onOpenReceptionQr: () => void;
	readonly onOpenReschedule?: () => void;
}

export const OverviewNextAppointmentCard: React.FC<OverviewNextAppointmentCardProps> = ({
	appt,
	countdown,
	onOpenSelfCheckin,
	onOpenReceptionQr,
	onOpenReschedule,
}) => {
	return (
		<div className="pc-card pc-next-appointment-card" data-testid="pc-next-appointment-card">
			<div className="pc-card-header">
				<div className="pc-card-title">
					<Calendar size={20} className="pc-icon-primary" />
					<span>Ближайший запланированный прием</span>
				</div>
				<div className="pc-header-tags">
					<span className="pc-status-badge paid">
						<Check size={14} />
						<span>Запись подтверждена</span>
					</span>
					{countdown && (
						<span className="pc-status-badge unpaid pc-countdown-badge">
							<Clock size={14} />
							<span>До приема осталось: {countdown}</span>
						</span>
					)}
				</div>
			</div>

			<div className="pc-next-appt-body">
				<div className="pc-time-room-highlight">
					<span className="pc-next-visit-time">{appt.timeRu}</span>
					<span className="pc-next-visit-room">{appt.roomNumber}</span>
				</div>
				<div className="pc-next-appt-info">
					<div className="pc-appt-title-row" style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
						<strong className="pc-appt-date">{appt.dateIso}</strong>
						<span className="pc-divider" style={{ opacity: 0.5 }}>•</span>
						<span className="pc-appt-procedure">{appt.titleRu}</span>
					</div>
					<div className="pc-appt-meta">
						Врач: <strong>{appt.doctorName}</strong> ({appt.doctorSpecialtyRu})
					</div>
					<div className="pc-appt-address">
						<MapPin size={15} />
						<span>{appt.clinicName} &bull; {appt.clinicAddressRu || "г. Москва, ул. Клиническая, д. 10"}</span>
					</div>
				</div>
			</div>

			<OverviewNextAppointmentActions
				appt={appt}
				onOpenSelfCheckin={onOpenSelfCheckin}
				onOpenReceptionQr={onOpenReceptionQr}
				onOpenReschedule={onOpenReschedule}
			/>

			<OverviewCalendarButtons appt={appt} />
		</div>
	);
};
