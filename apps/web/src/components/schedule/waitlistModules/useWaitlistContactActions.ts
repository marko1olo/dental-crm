/**
 * useWaitlistContactActions.ts — 1-Click contact actions (WhatsApp, Telegram, SMS copy) for waitlist candidates.
 */

import { useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	type TargetSlotInfo,
	type WaitlistCandidateItem,
	generateWaitlistOfferMessage,
	openTelegramChat,
	openWhatsAppChat,
} from "../waitlistCancellationEngine";

export function useWaitlistContactActions(
	targetSlot?: TargetSlotInfo | null | undefined,
	clinicName = "DENTE",
) {
	const [contactedPatients, setContactedPatients] = useState<Set<string>>(new Set());

	const handleSendWhatsApp = (item: WaitlistCandidateItem) => {
		if (!item.patientPhone) {
			showToast("У пациента не указан номер телефона", "error");
			return;
		}
		const msg = generateWaitlistOfferMessage({
			patientName: item.patientName,
			doctorName: targetSlot?.doctorName || item.preferredDoctorName,
			startsAt: targetSlot?.startsAt || new Date().toISOString(),
			clinicName,
		});

		openWhatsAppChat(item.patientPhone, msg);
		setContactedPatients((prev) => new Set(prev).add(item.id));
		showToast(
			`Сообщение WhatsApp подготовлено для ${item.patientName || "пациента"}`,
			"success",
		);
	};

	const handleSendTelegram = (item: WaitlistCandidateItem) => {
		if (!item.patientPhone) {
			showToast("У пациента не указан номер телефона", "error");
			return;
		}
		const msg = generateWaitlistOfferMessage({
			patientName: item.patientName,
			doctorName: targetSlot?.doctorName || item.preferredDoctorName,
			startsAt: targetSlot?.startsAt || new Date().toISOString(),
			clinicName,
		});

		openTelegramChat(item.patientPhone, msg);
		setContactedPatients((prev) => new Set(prev).add(item.id));
		showToast(
			`Предложение слота сформировано для Telegram: ${item.patientName || "пациент"}`,
			"success",
		);
	};

	const handleCopySms = (item: WaitlistCandidateItem) => {
		const msg = generateWaitlistOfferMessage({
			patientName: item.patientName,
			doctorName: targetSlot?.doctorName || item.preferredDoctorName,
			startsAt: targetSlot?.startsAt || new Date().toISOString(),
			clinicName,
		});

		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(msg).then(() => {
				setContactedPatients((prev) => new Set(prev).add(item.id));
				showToast("Текст сообщения пациенту скопирован в буфер", "success");
			});
		}
	};

	return {
		contactedPatients,
		setContactedPatients,
		handleSendWhatsApp,
		handleSendTelegram,
		handleCopySms,
	};
}
