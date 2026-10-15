import type { Dispatch, SetStateAction } from "react";
import { showToast } from "../GlobalToast";
import { useScheduleStore } from "../../store/scheduleStore";
import type { QuickBookingSlotInfo } from "../schedule/QuickBookingDrawerTypes";
import { buildRecallQuickBookingSlot } from "./recallBookingHelper";
import {
	buildTelegramUrl,
	buildWhatsAppUrl,
	generatePdnProtectedRecallMessage,
	sendRecallCandidateInvite,
	sendRecallCandidateStatusUpdate,
	type PatientRecallRecord,
	type RecallContactStatus,
} from "./patientRecallEngine";

export interface UseRecallHubActionsParams {
	readonly clinicName: string;
	readonly setCandidates: Dispatch<SetStateAction<readonly PatientRecallRecord[]>>;
	readonly setStatusNotice: (msg: string | null) => void;
	readonly setActivePreviewCandidate: (c: PatientRecallRecord | null) => void;
	readonly setBookingSlot: (slot: QuickBookingSlotInfo | null) => void;
	readonly onStatusChange?: ((id: string, status: RecallContactStatus) => void) | undefined;
	readonly onBookAppointment?: ((c: PatientRecallRecord) => void) | undefined;
	readonly onSendWhatsApp?: ((c: PatientRecallRecord, m: string) => Promise<void> | void) | undefined;
	readonly onSendTelegram?: ((c: PatientRecallRecord, m: string) => Promise<void> | void) | undefined;
	readonly authHeaders?: Record<string, string> | undefined;
}

export function useRecallHubActions({
	clinicName,
	setCandidates,
	setStatusNotice,
	setActivePreviewCandidate,
	setBookingSlot,
	onStatusChange,
	onBookAppointment,
	onSendWhatsApp,
	onSendTelegram,
	authHeaders,
}: UseRecallHubActionsParams) {
	const handleStatusUpdate = (
		candidateId: string,
		newStatus: RecallContactStatus,
		channel?: "whatsapp" | "telegram" | "sms" | "phone",
		note?: string,
	) => {
		setCandidates((prev) =>
			prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c)),
		);
		void sendRecallCandidateStatusUpdate({
			patientId: candidateId,
			status: newStatus,
			channel,
			note,
		}).catch((err) => console.error("[RecallActions] Status persist error:", err));
		if (onStatusChange) onStatusChange(candidateId, newStatus);
	};

	const handleWhatsApp = async (candidate: PatientRecallRecord) => {
		const message = generatePdnProtectedRecallMessage(candidate, { clinicName });
		if (!candidate.phone?.trim()) {
			showToast("У пациента не указан номер телефона. Открыт предпросмотр.", "warning");
			setActivePreviewCandidate(candidate);
			return;
		}
		if (onSendWhatsApp) {
			await onSendWhatsApp(candidate, message);
		} else {
			window.open(buildWhatsAppUrl(candidate.phone, message), "_blank", "noopener,noreferrer");
		}
		handleStatusUpdate(candidate.id, "invited", "whatsapp");
		try {
			const res = await sendRecallCandidateInvite(
				{ patientId: candidate.patientId, channel: "whatsapp", body: message },
				authHeaders,
			);
			setStatusNotice(res.message);
		} catch (err) {
			setStatusNotice(`WhatsApp открыт. ${err instanceof Error ? err.message : String(err)}`);
		}
		setTimeout(() => setStatusNotice(null), 3500);
	};

	const handleTelegram = async (candidate: PatientRecallRecord) => {
		const message = generatePdnProtectedRecallMessage(candidate, { clinicName });
		if (!candidate.phone?.trim()) {
			showToast("У пациента не указан номер телефона. Открыт предпросмотр.", "warning");
			setActivePreviewCandidate(candidate);
			return;
		}
		if (onSendTelegram) {
			await onSendTelegram(candidate, message);
		} else {
			window.open(buildTelegramUrl(candidate.phone, message), "_blank", "noopener,noreferrer");
		}
		handleStatusUpdate(candidate.id, "invited", "telegram");
	};

	const handleCopySms = async (candidate: PatientRecallRecord) => {
		const smsText = generatePdnProtectedRecallMessage(candidate, { clinicName });
		navigator.clipboard.writeText(smsText).catch(() => {});
		handleStatusUpdate(candidate.id, "invited", "sms");
		showToast("Текст сообщения 152-ФЗ скопирован", "info");
	};

	const handleBook = (candidate: PatientRecallRecord) => {
		const slot = buildRecallQuickBookingSlot(candidate);
		useScheduleStore.getState().setPendingStageBooking(slot);
		if (candidate.dueDate) useScheduleStore.getState().setScheduleDateFilter(candidate.dueDate);
		if (onBookAppointment) {
			onBookAppointment(candidate);
		} else {
			setBookingSlot(slot);
		}
	};

	return { handleStatusUpdate, handleWhatsApp, handleTelegram, handleCopySms, handleBook };
}
