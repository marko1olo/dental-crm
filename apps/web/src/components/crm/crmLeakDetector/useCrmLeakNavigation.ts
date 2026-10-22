import type { CrmLeakLeadItem } from "@dental/shared";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";

export function useCrmLeakNavigation(
	onClose?: () => void,
	onOpenPatientWorkspace?: (patientId: string) => void,
) {
	const handleOpenWhatsApp = (lead: CrmLeakLeadItem) => {
		const text =
			lead.aiReactivationSuggestion ||
			`Здравствуйте, ${lead.patientFullName}! Вас приветствует стоматологическая клиника DENTE. Напоминаем о возможности контрольного осмотра.`;
		openWhatsAppChat(lead.phone, text);
		showToast(`Чат WhatsApp открыт для ${lead.patientFullName}`, "success");
	};

	const handleBookAppointment = (lead: CrmLeakLeadItem) => {
		usePatientStore.getState().setSelectedPatientId(lead.patientId);
		useAppStore.getState().setCurrentView("schedule");
		onClose?.();
		showToast(
			`Пациент ${lead.patientFullName} выбран. Выберите время приёма в расписании`,
			"info",
		);
	};

	const handleOpenPatient = (patientId: string) => {
		if (onOpenPatientWorkspace) {
			onOpenPatientWorkspace(patientId);
			return;
		}
		usePatientStore.getState().setSelectedPatientId(patientId);
		useAppStore.getState().setCurrentView("patients");
		if (typeof window !== "undefined") {
			window.location.hash = "patients";
		}
		onClose?.();
		showToast("Открыта амбулаторная карта пациента", "info");
	};

	return {
		handleOpenWhatsApp,
		handleBookAppointment,
		handleOpenPatient,
	};
}
