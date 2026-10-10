import { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	DEFAULT_CONTACTS,
	DEFAULT_MESSAGES_BY_PATIENT,
	DEFAULT_NPS_REVIEWS,
	DEFAULT_TEMPLATES,
	calculateNpsMetrics,
	formatCurrencyRu,
	replaceTemplateVariables,
} from "../omnichannelEngine.js";
import type {
	InteractiveButtonPayload,
	MessageAttachment,
	NpsReview,
	NpsReviewStatus,
	OmnichannelChannel,
	OmnichannelChannelFilter,
	OmnichannelMessage,
	OmnichannelTab,
	OmnichannelTemplate,
	PatientOmnichannelContact,
	SbpPaymentInvoice,
} from "./types.js";

let omnichannelMsgSeq = 0;

export interface UseOmnichannelHubStateParams {
	readonly initialPatientId?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly onSendMessage?: ((message: OmnichannelMessage) => Promise<void> | void) | undefined;
}

export function useOmnichannelHubState({
	initialPatientId = "pat-101",
	clinicName = "DENTE Dental Clinic",
	clinicAddress = "г. Москва, ул. Арбат, д. 24",
	onSendMessage,
}: UseOmnichannelHubStateParams) {
	const [activeTab, setActiveTab] = useState<OmnichannelTab>("chat");
	const [contacts] = useState<readonly PatientOmnichannelContact[]>(DEFAULT_CONTACTS);
	const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId);
	const [patientSearchQuery, setPatientSearchQuery] = useState<string>("");

	const [messagesByPatient, setMessagesByPatient] = useState<Record<string, OmnichannelMessage[]>>(
		DEFAULT_MESSAGES_BY_PATIENT,
	);
	const [channelFilter, setChannelFilter] = useState<OmnichannelChannelFilter>("all");

	const [inputChannel, setInputChannel] = useState<OmnichannelChannel>("whatsapp");
	const [messageText, setMessageText] = useState<string>("");
	const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("");
	const [isSending, setIsSending] = useState<boolean>(false);

	const [npsReviews, setNpsReviews] = useState<readonly NpsReview[]>(DEFAULT_NPS_REVIEWS);
	const [npsFilterUrgency, setNpsFilterUrgency] = useState<string>("all");
	const [npsFilterStatus, setNpsFilterStatus] = useState<string>("all");

	const [isSbpModalOpen, setIsSbpModalOpen] = useState<boolean>(false);
	const [currentSbpInvoice, setCurrentSbpInvoice] = useState<SbpPaymentInvoice | null>(null);
	const [interceptedPatients, setInterceptedPatients] = useState<Record<string, boolean>>({});

	const isCurrentPatientIntercepted = Boolean(interceptedPatients[selectedPatientId]);

	const selectedContact = useMemo(() => {
		return contacts.find((c) => c.id === selectedPatientId) || contacts[0]!;
	}, [contacts, selectedPatientId]);

	const currentThreadMessages = useMemo(() => {
		const allMsgs = messagesByPatient[selectedPatientId] || [];
		if (channelFilter === "all") return allMsgs;
		return allMsgs.filter((m) => m.channel === channelFilter);
	}, [messagesByPatient, selectedPatientId, channelFilter]);

	const npsMetrics = useMemo(() => calculateNpsMetrics(npsReviews), [npsReviews]);

	const filteredNpsReviews = useMemo(() => {
		return npsReviews.filter((r) => {
			if (npsFilterUrgency !== "all") {
				if (npsFilterUrgency === "critical" && r.urgency !== "critical") return false;
				if (npsFilterUrgency === "detractor" && r.category !== "detractor") return false;
				if (npsFilterUrgency === "promoter" && r.category !== "promoter") return false;
				if (npsFilterUrgency === "neutral" && r.category !== "neutral") return false;
			}
			if (npsFilterStatus !== "all" && r.status !== npsFilterStatus) return false;
			return true;
		});
	}, [npsReviews, npsFilterUrgency, npsFilterStatus]);

	const handleApplyTemplate = (template: OmnichannelTemplate) => {
		const context = {
			patientName: selectedContact.fullName,
			clinicName,
			clinicAddress,
			appointmentDate: selectedContact.nextAppointment?.date || "",
			appointmentTime: selectedContact.nextAppointment?.time || "",
			cabinet: selectedContact.nextAppointment?.cabinet || "",
			doctorName: selectedContact.nextAppointment?.doctorName || "Лечащий врач",
			treatmentPlanTitle: selectedContact.activeTreatmentPlan?.title || "Комплексный план лечения",
			treatmentSum: selectedContact.activeTreatmentPlan
				? formatCurrencyRu(selectedContact.activeTreatmentPlan.totalRub)
				: "0,00 ₽",
			orderId: `ORD-${Date.now().toString().slice(-6)}`,
			paymentLink: "",
			bonusAmount: "1 000 ₽",
			promoCode: "BIRTHDAY",
			validDays: "30 дней",
		};

		const filled = replaceTemplateVariables(template.templateText, context);
		setMessageText(filled);
		setSelectedTemplateCategory(template.category);
		if (template.channel !== "all") {
			setInputChannel(template.channel);
		}
		setActiveTab("chat");
	};

	const handleSendMessage = async () => {
		if (isSending) return;
		const text = messageText.trim();
		if (!text) {
			const template = DEFAULT_TEMPLATES[0];
			if (template) {
				handleApplyTemplate(template);
			} else {
				setMessageText(
					`Здравствуйте, ${selectedContact.fullName}! Напоминаем о вашей записи на приём в клинику ${clinicName}. Если у вас есть вопросы, пожалуйста, сообщите нам.`,
				);
			}
			showToast("Подставлен шаблон сообщения. Нажмите «Отправить»", "info");
			return;
		}

		setIsSending(true);
		const newMsg: OmnichannelMessage = {
			id: `msg-${Date.now()}-${++omnichannelMsgSeq}`,
			patientId: selectedPatientId,
			channel: inputChannel,
			direction: "outbound",
			senderName: "Администратор клиники",
			senderType: "clinic_staff",
			timestamp: new Date().toISOString(),
			body: text,
			status: "sent",
		};

		setMessagesByPatient((prev) => ({
			...prev,
			[selectedPatientId]: [...(prev[selectedPatientId] || []), newMsg],
		}));

		setMessageText("");
		setSelectedTemplateCategory("");

		try {
			if (onSendMessage) {
				await onSendMessage(newMsg);
			}
		} finally {
			setIsSending(false);
		}
	};

	const handleInteractiveButtonClick = (btn: InteractiveButtonPayload, originalMsg: OmnichannelMessage) => {
		const replyMsg: OmnichannelMessage = {
			id: `msg-${Date.now()}`,
			patientId: selectedPatientId,
			channel: originalMsg.channel,
			direction: "outbound",
			senderName: "Администратор клиники",
			senderType: "clinic_staff",
			timestamp: new Date().toISOString(),
			body: `Выбрано действие: ${btn.title}`,
			status: "sent",
		};
		setMessagesByPatient((prev) => ({
			...prev,
			[selectedPatientId]: [...(prev[selectedPatientId] || []), replyMsg],
		}));
		onSendMessage?.(replyMsg);
		showToast(`Действие «${btn.title}» выполнено`, "success");
	};

	const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const newAtt: MessageAttachment = {
			id: `att-${Date.now()}`,
			name: file.name,
			type: file.type.includes("pdf") ? "pdf" : file.type.includes("image") ? "image" : "document",
			url: URL.createObjectURL(file),
			sizeFormatted: `${(file.size / 1024).toFixed(1)} КБ`,
		};
		const attMsg: OmnichannelMessage = {
			id: `msg-${Date.now()}`,
			patientId: selectedPatientId,
			channel: inputChannel,
			direction: "outbound",
			senderName: "Администратор клиники",
			senderType: "clinic_staff",
			timestamp: new Date().toISOString(),
			body: `Прикреплен файл: ${file.name}`,
			attachments: [newAtt],
			status: "sent",
		};
		setMessagesByPatient((prev) => ({
			...prev,
			[selectedPatientId]: [...(prev[selectedPatientId] || []), attMsg],
		}));
		onSendMessage?.(attMsg);
		showToast(`Файл «${file.name}» прикреплен к переписке`, "success");
		e.target.value = "";
	};

	const handleOpenSbpModal = () => {
		const sumRub = selectedContact.activeTreatmentPlan?.totalRub || 14500;
		const invoice: SbpPaymentInvoice = {
			orderId: `ORD-${Date.now().toString().slice(-6)}`,
			patientId: selectedContact.id,
			patientName: selectedContact.fullName,
			phone: selectedContact.phone,
			sumRub,
			sumKopecks: sumRub * 100,
			purpose: `Оплата медицинских стоматологических услуг (${clinicName})`,
			clinicName,
			totalInvoiceRub: sumRub,
		};
		setCurrentSbpInvoice(invoice);
		setIsSbpModalOpen(true);
	};

	const handleSbpPaymentSuccess = (res: {
		orderId: string;
		sumRub: number;
		fiscalReceiptId: string | null;
	}) => {
		const successMsg: OmnichannelMessage = {
			id: `msg-sbp-${Date.now()}`,
			patientId: selectedPatientId,
			channel: inputChannel,
			direction: "outbound",
			senderName: "DENTE Фискальный Шлюз",
			senderType: "automated_bot",
			timestamp: new Date().toISOString(),
			body: `Поступила оплата заказа №${res.orderId} на сумму ${formatCurrencyRu(res.sumRub)} через СБП.\n${
				res.fiscalReceiptId
					? `Электронный фискальный чек 54-ФЗ: #${res.fiscalReceiptId}`
					: "Ручная сверка (без чека ККТ)"
			}`,
			status: "delivered",
			templateCategory: "sbp_payment",
		};

		setMessagesByPatient((prev) => ({
			...prev,
			[selectedPatientId]: [...(prev[selectedPatientId] || []), successMsg],
		}));
	};

	const handleUpdateNpsStatus = (reviewId: string, newStatus: NpsReviewStatus) => {
		setNpsReviews((prev) =>
			prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r)),
		);
	};

	const handleOpenChatFromNps = (patientId: string) => {
		setSelectedPatientId(patientId);
		setActiveTab("chat");
	};

	const handleTakeoverChat = () => {
		setInterceptedPatients((prev) => ({
			...prev,
			[selectedPatientId]: true,
		}));

		const takeoverMsg: OmnichannelMessage = {
			id: `msg-takeover-${Date.now()}`,
			patientId: selectedPatientId,
			channel: inputChannel,
			direction: "outbound",
			senderName: "Дежурный оператор",
			senderType: "clinic_staff",
			timestamp: new Date().toISOString(),
			body: "👩‍💼 Оператор клиники подключился к диалогу. Бот переведён в спящий режим. Чем я могу вам помочь?",
			status: "delivered",
		};

		setMessagesByPatient((prev) => ({
			...prev,
			[selectedPatientId]: [...(prev[selectedPatientId] || []), takeoverMsg],
		}));
		onSendMessage?.(takeoverMsg);
		showToast("Диалог успешно перехвачен оператором клиники", "success");
	};

	return {
		activeTab,
		setActiveTab,
		contacts,
		selectedPatientId,
		setSelectedPatientId,
		patientSearchQuery,
		setPatientSearchQuery,
		selectedContact,
		channelFilter,
		setChannelFilter,
		currentThreadMessages,
		inputChannel,
		setInputChannel,
		messageText,
		setMessageText,
		selectedTemplateCategory,
		setSelectedTemplateCategory,
		isSending,
		npsReviews,
		npsMetrics,
		filteredNpsReviews,
		npsFilterUrgency,
		setNpsFilterUrgency,
		npsFilterStatus,
		setNpsFilterStatus,
		isSbpModalOpen,
		setIsSbpModalOpen,
		currentSbpInvoice,
		isCurrentPatientIntercepted,
		handleApplyTemplate,
		handleSendMessage,
		handleInteractiveButtonClick,
		handleAttachFile,
		handleOpenSbpModal,
		handleSbpPaymentSuccess,
		handleUpdateNpsStatus,
		handleOpenChatFromNps,
		handleTakeoverChat,
	};
}

export type UseOmnichannelHubStateReturn = ReturnType<typeof useOmnichannelHubState>;
