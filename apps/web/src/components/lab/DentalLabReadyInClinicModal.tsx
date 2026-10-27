import React, { useState } from "react";
import { CalendarCheck, Copy, Send, X } from "lucide-react";
import { showToast } from "../GlobalToast";
import { openWhatsAppChat } from "../../store/telephonyClinical";
import type { PartialDeliveryResult } from "./dentalLabOrderEngine";
import {
	type ReadyInClinicLabOrder,
	generateReadyInClinicSmsTemplate,
	generateReadyInClinicWhatsAppTemplate,
} from "./readyInClinicModules/ReadyInClinicTemplates";

export { type ReadyInClinicLabOrder, generateReadyInClinicSmsTemplate, generateReadyInClinicWhatsAppTemplate };

export interface DentalLabReadyInClinicModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: ReadyInClinicLabOrder | null;
	readonly onScheduleAppointment?: (draft: Record<string, unknown>) => void;
	readonly onPartialDelivery?: (result: PartialDeliveryResult) => void;
}

/**
 * Диалог готовности работы ЗТЛ в клинике (Мандат 8b, 8e: <= 120 строк).
 */
export function DentalLabReadyInClinicModal({
	isOpen,
	onClose,
	order,
	onScheduleAppointment,
}: DentalLabReadyInClinicModalProps) {
	const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
	if (!isOpen || !order) return null;

	const msgText = channel === "whatsapp"
		? generateReadyInClinicWhatsAppTemplate(order)
		: generateReadyInClinicSmsTemplate(order);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(msgText);
			showToast("Сообщение скопировано в буфер");
		} catch {
			showToast("Не удалось скопировать");
		}
	};

	const handleSendWhatsApp = () => {
		if (!order.patientPhone) {
			showToast("У пациента не указан номер телефона");
			return;
		}
		openWhatsAppChat(order.patientPhone, msgText);
	};

	const handleSchedule = () => {
		const draft = {
			patientId: order.patientId,
			patientName: order.patientName,
			doctorId: order.doctorId,
			doctorName: order.doctorName,
			title: `Примерка / фиксация: ${order.material || "ортопедия"} (зуб ${order.toothFdi || "челюсть"})`,
			durationMinutes: 45,
			orderId: order.id,
			orderNumber: order.orderNumber,
		};
		if (typeof window !== "undefined") {
			try {
				window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(draft));
				window.dispatchEvent(new CustomEvent("dente-quick-appointment-draft", { detail: draft }));
				window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: draft }));
			} catch {}
		}
		onScheduleAppointment?.(draft);
		showToast("Открыта запись на примерку / фиксацию", "success");
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 max-sm:p-0 max-sm:items-end bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="dental-lab-ready-in-clinic-modal">
			<div className="relative w-full max-w-lg bg-[var(--paper)] border border-[var(--line)] rounded-2xl max-sm:rounded-t-[24px] max-sm:rounded-b-none p-4 sm:p-5 shadow-2xl space-y-4 max-sm:max-h-[92vh] overflow-y-auto">
				<div className="sm:hidden w-9 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-1 shrink-0" aria-hidden="true" />
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
					<div>
						<h3 className="text-base font-bold text-[var(--ink)]">Работа доставлена в клинику</h3>
						<p className="text-xs text-[var(--muted)]">Наряд #{order.orderNumber} · {order.patientName}</p>
					</div>
					<button type="button" onClick={onClose} className="w-11 h-11 sm:w-8 sm:h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer" aria-label="Закрыть">
						<X size={18} />
					</button>
				</div>
				<div className="flex gap-2 border-b border-[var(--line)] pb-2">
					<button type="button" onClick={() => setChannel("whatsapp")} className={`dente-btn-pill ${channel === "whatsapp" ? "active" : ""}`}>WhatsApp</button>
					<button type="button" onClick={() => setChannel("sms")} className={`dente-btn-pill ${channel === "sms" ? "active" : ""}`}>SMS</button>
				</div>
				<div className="p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] text-xs text-[var(--ink)] whitespace-pre-wrap font-sans max-h-40 overflow-y-auto">
					{msgText}
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
					<div className="flex items-center gap-2">
						<button type="button" onClick={handleCopy} className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-0 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
							<Copy size={14} /><span>Копировать</span>
						</button>
						{channel === "whatsapp" && (
							<button type="button" onClick={handleSendWhatsApp} className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-0 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
								<Send size={14} className="text-[var(--teal)]" /><span>Открыть чат</span>
							</button>
						)}
					</div>
					<button type="button" onClick={handleSchedule} className="dente-btn dente-btn-primary min-h-[44px] sm:min-h-0 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs" data-testid="btn-lab-schedule-appointment">
						<CalendarCheck size={14} /><span>Записать на примерку</span>
					</button>
				</div>
			</div>
		</div>
	);
}

export default DentalLabReadyInClinicModal;
