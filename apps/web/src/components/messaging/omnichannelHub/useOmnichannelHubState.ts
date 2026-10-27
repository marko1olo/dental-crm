/**
 * useOmnichannelHubState.ts — Тонкий фасад координации состояния омниканального хаба.
 * Строго <= 120 строк по Мандату 8b.
 */

import { useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { formatCurrencyRu, replaceTemplateVariables } from "../omnichannelEngine.js";
import {
	buildSbpInvoiceForContact,
	buildSbpSuccessMessage,
	createFileAttachmentMessage,
	createInteractiveButtonReply,
} from "./state/omnichannelActionHelpers.js";
import { useOmnichannelContacts } from "./state/useOmnichannelContacts.js";
import { useOmnichannelMessages } from "./state/useOmnichannelMessages.js";
import { useOmnichannelNpsState } from "./state/useOmnichannelNpsState.js";
import type {
	InteractiveButtonPayload,
	OmnichannelMessage,
	OmnichannelTab,
	OmnichannelTemplate,
	SbpPaymentInvoice,
} from "./types.js";

export interface UseOmnichannelHubStateParams {
	readonly initialPatientId?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly onSendMessage?: ((message: OmnichannelMessage) => Promise<void> | void) | undefined;
}

export function useOmnichannelHubState({
	initialPatientId,
	clinicName = "Клиника DENTE",
	clinicAddress = "",
	onSendMessage,
}: UseOmnichannelHubStateParams) {
	const [activeTab, setActiveTab] = useState<OmnichannelTab>("chat");
	const [isSbpModalOpen, setIsSbpModalOpen] = useState<boolean>(false);
	const [currentSbpInvoice, setCurrentSbpInvoice] = useState<SbpPaymentInvoice | null>(null);

	const contactsState = useOmnichannelContacts(initialPatientId);
	const messagesState = useOmnichannelMessages(contactsState.selectedPatientId, onSendMessage);
	const npsState = useOmnichannelNpsState();

	const handleApplyTemplate = (template: OmnichannelTemplate) => {
		const ctx = {
			patientName: contactsState.selectedContact.fullName,
			clinicName,
			clinicAddress,
			appointmentDate: contactsState.selectedContact.nextAppointment?.date || "",
			appointmentTime: contactsState.selectedContact.nextAppointment?.time || "",
			cabinet: contactsState.selectedContact.nextAppointment?.cabinet || "",
			doctorName: contactsState.selectedContact.nextAppointment?.doctorName || "Лечащий врач",
			treatmentPlanTitle: contactsState.selectedContact.activeTreatmentPlan?.title || "План лечения",
			treatmentSum: contactsState.selectedContact.activeTreatmentPlan
				? formatCurrencyRu(contactsState.selectedContact.activeTreatmentPlan.totalRub)
				: "0,00 ₽",
			orderId: `ORD-${Date.now().toString().slice(-6)}`,
			paymentLink: "",
			bonusAmount: "1 000 ₽",
			promoCode: "DENTE",
			validDays: "30 дней",
		};
		messagesState.setMessageText(replaceTemplateVariables(template.templateText, ctx));
		messagesState.setSelectedTemplateCategory(template.category);
		if (template.channel !== "all") messagesState.setInputChannel(template.channel);
		setActiveTab("chat");
	};

	const handleInteractiveButtonClick = (btn: InteractiveButtonPayload, originalMsg: OmnichannelMessage) => {
		const replyMsg = createInteractiveButtonReply(btn, originalMsg, contactsState.selectedPatientId);
		messagesState.setMessagesByPatient((prev) => ({
			...prev,
			[contactsState.selectedPatientId]: [...(prev[contactsState.selectedPatientId] || []), replyMsg],
		}));
		onSendMessage?.(replyMsg);
		showToast(`Действие «${btn.title}» выполнено`, "success");
	};

	const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const { message: attMsg } = createFileAttachmentMessage(
			file,
			contactsState.selectedPatientId,
			messagesState.inputChannel,
		);
		messagesState.setMessagesByPatient((prev) => ({
			...prev,
			[contactsState.selectedPatientId]: [...(prev[contactsState.selectedPatientId] || []), attMsg],
		}));
		onSendMessage?.(attMsg);
		showToast(`Файл «${file.name}» прикреплен`, "success");
		e.target.value = "";
	};

	return {
		activeTab,
		setActiveTab,
		...contactsState,
		...messagesState,
		...npsState,
		isSbpModalOpen,
		setIsSbpModalOpen,
		currentSbpInvoice,
		handleApplyTemplate,
		handleInteractiveButtonClick,
		handleAttachFile,
		handleOpenSbpModal: () => {
			setCurrentSbpInvoice(buildSbpInvoiceForContact(contactsState.selectedContact, clinicName));
			setIsSbpModalOpen(true);
		},
		handleSbpPaymentSuccess: (res: { orderId: string; sumRub: number; fiscalReceiptId: string | null }) => {
			const sMsg = buildSbpSuccessMessage(contactsState.selectedPatientId, messagesState.inputChannel, res);
			messagesState.setMessagesByPatient((p) => ({
				...p,
				[contactsState.selectedPatientId]: [...(p[contactsState.selectedPatientId] || []), sMsg],
			}));
		},
		handleOpenChatFromNps: (pId: string) => {
			contactsState.setSelectedPatientId(pId);
			setActiveTab("chat");
		},
	};
}

export type UseOmnichannelHubStateReturn = ReturnType<typeof useOmnichannelHubState>;
