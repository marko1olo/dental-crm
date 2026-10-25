import React from "react";
import { Copy, MessageSquare, UserMinus } from "lucide-react";
import type { Appointment, Dashboard } from "@dental/shared";
import { generateAppointmentWhatsAppMessage } from "../generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { showRollbackToast, showToast } from "../../GlobalToast";

interface Props {
	appointment: Appointment;
	pName: string;
	patObj?: any;
	docObj?: any;
	dashboard: Dashboard;
	onCloseMenu: () => void;
	onFreeSlotToWaitlist: (appt: Appointment) => void;
}

export const GridAppointmentCommunicationSubmenu: React.FC<Props> = ({
	appointment: a,
	pName,
	patObj,
	docObj,
	dashboard,
	onCloseMenu,
	onFreeSlotToWaitlist,
}) => {
	const handleWhatsApp = () => {
		const text = generateAppointmentWhatsAppMessage({
			patientName: pName,
			doctorName: docObj?.fullName,
			doctorSpecialty: docObj?.role,
			appointmentStartsAt: a.startsAt,
			clinicName: dashboard.clinicSettings?.profile?.clinicName,
			clinicAddress: dashboard.clinicSettings?.profile?.address,
			clinicPhone: dashboard.clinicSettings?.profile?.phone,
			treatmentReason: a.reason,
		});
		openWhatsAppChat(patObj.phone!, text);
		onCloseMenu();
	};

	const handleCopySms = () => {
		const text = generateAppointmentWhatsAppMessage({
			patientName: pName,
			doctorName: docObj?.fullName,
			doctorSpecialty: docObj?.role,
			appointmentStartsAt: a.startsAt,
			clinicName: dashboard.clinicSettings?.profile?.clinicName,
			clinicAddress: dashboard.clinicSettings?.profile?.address,
			clinicPhone: dashboard.clinicSettings?.profile?.phone,
			treatmentReason: a.reason,
		});
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(text);
			showToast(`Текст напоминания для ${pName} скопирован в буфер`, "success");
		}
		onCloseMenu();
	};

	const handleFreeSlot = () => {
		onCloseMenu();
		onFreeSlotToWaitlist(a);
		showRollbackToast(`Слот освобожден и передан в лист ожидания`, () => {
			showToast(`Восстановление слота: визит возвращен`, "info");
		}, 5000, "Вернуть");
	};

	return (
		<>
			{patObj?.phone && (
				<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
					<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
						Связь
					</div>
					<button
						type="button"
						onClick={handleWhatsApp}
						className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 font-bold transition-colors cursor-pointer"
					>
						<MessageSquare size={14} className="text-emerald-600 dark:text-emerald-400" />
						<span>WhatsApp напоминание</span>
					</button>
					<button
						type="button"
						onClick={handleCopySms}
						className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium transition-colors cursor-pointer"
					>
						<Copy size={14} className="text-[var(--teal)]" />
						<span>Скопировать SMS</span>
					</button>
				</div>
			)}
			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
				<button
					type="button"
					data-testid={`menu-free-slot-waitlist-${a.id}`}
					onClick={handleFreeSlot}
					className="w-full text-left min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 font-bold transition-colors cursor-pointer"
					title="Освободить слот -> в лист ожидания"
				>
					<UserMinus size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
					<span>Освободить слот -&gt; в лист ожидания</span>
				</button>
			</div>
		</>
	);
};
