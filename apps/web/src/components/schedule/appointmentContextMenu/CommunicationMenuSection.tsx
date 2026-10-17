import React from "react";
import { MessageSquare, Phone } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { generateAppointmentWhatsAppMessage } from "../generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import type { AppointmentCardContextMenuProps } from "./types";

export function CommunicationMenuSection({
	appointment,
	dashboard,
	appointmentPatient,
	appointmentPatientName,
	appointmentDoctor,
	onClose,
}: Pick<
	AppointmentCardContextMenuProps,
	"appointment" | "dashboard" | "appointmentPatient" | "appointmentPatientName" | "appointmentDoctor"
> & { onClose: () => void }) {
	return (
		<>
			<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
				Связь и напоминания
			</div>
			{appointmentPatient?.phone ? (
				<button
					type="button"
					className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
					onClick={() => {
						onClose();
						window.location.href = `tel:${appointmentPatient.phone}`;
					}}
					title={`Позвонить пациенту ${appointmentPatient.phone}`}
				>
					<Phone size={14} className="text-[var(--teal)] shrink-0" />
					<span className="truncate">Позвонить ({appointmentPatient.phone})</span>
				</button>
			) : null}
			<button
				type="button"
				className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				onClick={() => {
					onClose();
					const text = generateAppointmentWhatsAppMessage({
						patientName: appointmentPatientName,
						doctorName: appointmentDoctor?.fullName,
						doctorSpecialty: appointmentDoctor?.role,
						appointmentStartsAt: appointment.startsAt,
						clinicName: dashboard?.clinicSettings?.profile?.clinicName,
						clinicAddress: dashboard?.clinicSettings?.profile?.address,
						clinicPhone: dashboard?.clinicSettings?.profile?.phone,
						treatmentReason: appointment.reason,
					});
					if (appointmentPatient?.phone) {
						openWhatsAppChat(appointmentPatient.phone, text);
					} else if (typeof navigator !== "undefined" && navigator.clipboard) {
						void navigator.clipboard.writeText(text);
						showToast(`Текст напоминания для ${appointmentPatientName} скопирован в буфер`, "success");
					}
				}}
			>
				<MessageSquare size={14} className="text-[var(--teal)] shrink-0" />
				<span>Напомнить в WhatsApp / СМС</span>
			</button>
		</>
	);
}
