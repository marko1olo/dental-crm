import React from "react";
import { CheckCircle2, Clock, MapPin, Phone, QrCode } from "lucide-react";
import type { PatientAppointmentItem } from "../../patientCabinetEngine";

export interface OverviewNextAppointmentActionsProps {
	readonly appt: PatientAppointmentItem;
	readonly onOpenSelfCheckin: () => void;
	readonly onOpenReceptionQr: () => void;
	readonly onOpenReschedule?: () => void;
}

export const OverviewNextAppointmentActions: React.FC<OverviewNextAppointmentActionsProps> = ({
	appt,
	onOpenSelfCheckin,
	onOpenReceptionQr,
	onOpenReschedule,
}) => {
	const yandexMapsUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(appt.clinicAddressRu || appt.clinicName)}`;
	const doctorPhone = "+7 (495) 789-01-23";

	return (
		<div className="pc-appt-actions-row">
			<button
				type="button"
				className="pc-btn-primary pc-appt-action-btn pc-btn-i-am-here"
				onClick={onOpenSelfCheckin}
				data-testid="btn-i-am-here-checkin"
				title="Отметить прибытие в клинику и получить талон электронной очереди"
				style={{
					minHeight: "44px",
					backgroundColor: "var(--teal)",
					color: "var(--on-teal, #ffffff)",
					fontWeight: 700,
					display: "inline-flex",
					alignItems: "center",
					gap: "6px",
					padding: "8px 16px",
					borderRadius: "10px",
					cursor: "pointer",
					border: "none",
					touchAction: "manipulation",
				}}
			>
				<CheckCircle2 size={16} />
				<span>Я на месте / Чекин</span>
			</button>

			<button
				type="button"
				className="pc-btn-secondary pc-appt-action-btn"
				onClick={onOpenReceptionQr}
				data-testid="next-appt-qr-btn"
				style={{ minHeight: "44px", touchAction: "manipulation" }}
			>
				<QrCode size={16} />
				<span>QR для входа</span>
			</button>

			<a
				href={yandexMapsUrl}
				target="_blank"
				rel="noreferrer"
				className="pc-btn-secondary pc-appt-action-btn"
				data-testid="btn-yandex-maps"
				title="Открыть маршрут в Яндекс.Картах"
				style={{ minHeight: "44px", touchAction: "manipulation" }}
			>
				<MapPin size={16} className="pc-icon-warning" />
				<span>Как добраться / Маршрут</span>
			</a>

			<button
				type="button"
				className="pc-btn-secondary pc-appt-action-btn"
				onClick={onOpenReschedule}
				data-testid="btn-reschedule-appointment"
				style={{ minHeight: "44px", touchAction: "manipulation" }}
			>
				<Clock size={16} className="pc-icon-warning" />
				<span>Перенести приём</span>
			</button>

			<a
				href={`tel:${doctorPhone.replace(/\D/g, "")}`}
				className="pc-btn-secondary pc-appt-action-btn"
				data-testid="btn-call-doctor"
				style={{ minHeight: "44px", touchAction: "manipulation" }}
			>
				<Phone size={16} className="pc-icon-primary" />
				<span>Позвонить</span>
			</a>
		</div>
	);
};
