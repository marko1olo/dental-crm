import { useCallback } from "react";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";
import {
	type AppointmentMessageType,
	generateAppointmentWhatsAppMessage,
} from "../generateAppointmentWhatsAppMessage";

export interface UseQuickActionCommunicationParams {
	patientName: string;
	patientPhone?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	startsAt?: string | undefined;
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	treatmentReason?: string | null | undefined;
	cabinetName?: string | null | undefined;
	onWhatsAppConfirm?: (() => void) | undefined;
}

export function useQuickActionCommunication({
	patientName,
	patientPhone,
	doctorName,
	doctorSpecialty,
	startsAt,
	clinicName,
	clinicAddress,
	clinicPhone,
	treatmentReason,
	cabinetName,
	onWhatsAppConfirm,
}: UseQuickActionCommunicationParams) {
	const handleSendWhatsApp = useCallback(
		(
			messageType: AppointmentMessageType = "reminder_24h",
			shiftedMinutes?: number,
		) => {
			if (!startsAt) return;
			const text = generateAppointmentWhatsAppMessage({
				patientName,
				doctorName: doctorName ?? null,
				doctorSpecialty: doctorSpecialty ?? null,
				appointmentStartsAt: startsAt,
				clinicName: clinicName ?? null,
				clinicAddress: clinicAddress ?? null,
				clinicPhone: clinicPhone ?? null,
				treatmentReason: treatmentReason ?? null,
				cabinetName: cabinetName ?? null,
				messageType,
				shiftedMinutes,
			});
			if (!patientPhone) {
				showToast(
					"Укажите номер телефона пациента в карточке приёма для отправки в WhatsApp",
					"warning",
				);
				if (typeof navigator !== "undefined" && navigator.clipboard) {
					void navigator.clipboard.writeText(text);
					showToast("Текст сообщения скопирован в буфер обмена", "info");
				}
				return;
			}
			openWhatsAppChat(patientPhone, text);
			if (onWhatsAppConfirm) onWhatsAppConfirm();
		},
		[
			patientPhone,
			startsAt,
			patientName,
			doctorName,
			doctorSpecialty,
			clinicName,
			clinicAddress,
			clinicPhone,
			treatmentReason,
			cabinetName,
			onWhatsAppConfirm,
		],
	);

	const handleCopySmsReminder = useCallback(
		(messageType: AppointmentMessageType = "reminder_24h") => {
			if (!startsAt) return;
			const text = generateAppointmentWhatsAppMessage({
				patientName,
				doctorName: doctorName ?? null,
				doctorSpecialty: doctorSpecialty ?? null,
				appointmentStartsAt: startsAt,
				clinicName: clinicName ?? null,
				clinicAddress: clinicAddress ?? null,
				clinicPhone: clinicPhone ?? null,
				treatmentReason: treatmentReason ?? null,
				cabinetName: cabinetName ?? null,
				messageType,
			});
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				void navigator.clipboard.writeText(text);
				showToast(
					`Текст напоминания для ${patientName} скопирован в буфер обмена`,
					"success",
				);
			}
		},
		[
			startsAt,
			patientName,
			doctorName,
			doctorSpecialty,
			clinicName,
			clinicAddress,
			clinicPhone,
			treatmentReason,
			cabinetName,
		],
	);

	return { handleSendWhatsApp, handleCopySmsReminder };
}
