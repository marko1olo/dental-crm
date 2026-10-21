import type { Appointment, Dashboard } from "@dental/shared";
import { CalendarPlus, MessageSquare, Phone } from "lucide-react";
import type React from "react";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import { generateAppointmentWhatsAppMessage } from "../generateAppointmentWhatsAppMessage";

interface GridAppointmentHudCommunicationProps {
	appointment: Appointment;
	patObj?: any;
	docObj?: any;
	chair: { id: string; name: string };
	aStart: string;
	dashboard: Dashboard;
	onFreeSlotToWaitlist?: (appt: Appointment) => void;
}

export function GridAppointmentHudCommunication({
	appointment: a,
	patObj,
	docObj,
	chair,
	aStart,
	dashboard,
	onFreeSlotToWaitlist,
}: GridAppointmentHudCommunicationProps) {
	const phone = patObj?.phone;

	const handleWhatsApp = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!phone) {
			showToast("У пациента не указан номер телефона", "error");
			return;
		}
		const clinicName = dashboard?.clinicSettings?.profile?.name || "Клиника";
		const text = generateAppointmentWhatsAppMessage({
			patientName: patObj?.fullName || "Пациент",
			startsAt: a.startsAt || aStart,
			doctorName: docObj?.fullName || docObj?.name,
			clinicName,
		});
		openWhatsAppChat(phone, text);
		showToast("WhatsApp открыт", "success");
	};

	const handleCall = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!phone) {
			showToast("У пациента не указан номер телефона", "error");
			return;
		}
		window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
	};

	return (
		<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--line)]">
			{phone && (
				<>
					<button
						type="button"
						onClick={handleCall}
						className="flex-1 min-h-[32px] px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-500/20 cursor-pointer transition-all"
						title={`Позвонить: ${phone}`}
					>
						<Phone className="w-3.5 h-3.5" />
						<span>Позвонить</span>
					</button>
					<button
						type="button"
						onClick={handleWhatsApp}
						className="flex-1 min-h-[32px] px-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center gap-1 border border-teal-500/20 cursor-pointer transition-all"
						title="Написать в WhatsApp"
					>
						<MessageSquare className="w-3.5 h-3.5" />
						<span>WhatsApp</span>
					</button>
				</>
			)}
			{onFreeSlotToWaitlist && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onFreeSlotToWaitlist(a);
					}}
					className="min-h-[32px] px-2 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] font-semibold text-xs flex items-center justify-center gap-1 border border-[var(--line)] cursor-pointer transition-all"
					title="Освободить слот для листа ожидания"
				>
					<CalendarPlus className="w-3.5 h-3.5 text-amber-500" />
					<span className="hidden sm:inline">Лист ожидания</span>
				</button>
			)}
		</div>
	);
}
