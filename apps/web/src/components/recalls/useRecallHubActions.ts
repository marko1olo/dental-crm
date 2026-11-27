import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { showToast } from "../GlobalToast";
import { useScheduleStore } from "../../store/scheduleStore";
import { clientLogger } from "../../services/logging/clientLogger";
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
	readonly candidates?: readonly PatientRecallRecord[] | undefined;
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
	candidates,
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
	const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (noticeTimerRef.current) {
				clearTimeout(noticeTimerRef.current);
				noticeTimerRef.current = null;
			}
		};
	}, []);

	const scheduleNoticeClear = () => {
		if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
		noticeTimerRef.current = setTimeout(() => {
			setStatusNotice(null);
			noticeTimerRef.current = null;
		}, 3500);
	};

	const handleStatusUpdate = (
		candidateId: string,
		newStatus: RecallContactStatus,
		channel?: "whatsapp" | "telegram" | "sms" | "phone",
		note?: string,
	) => {
		const matchedCandidate = candidates?.find(
			(c) => c.id === candidateId || c.patientId === candidateId,
		);
		const targetPatientId = matchedCandidate?.patientId ?? candidateId;
		const previousStatus = matchedCandidate?.status;

		setCandidates((prev) =>
			prev.map((c) =>
				c.id === candidateId || c.patientId === candidateId
					? { ...c, status: newStatus }
					: c,
			),
		);

		void sendRecallCandidateStatusUpdate(
			{
				patientId: targetPatientId,
				status: newStatus,
				channel,
				note,
			},
			authHeaders,
		).catch((err) => {
			clientLogger.error("[RecallActions] Status persist error:", err);
			if (previousStatus !== undefined) {
				setCandidates((prev) =>
					prev.map((c) =>
						c.id === candidateId || c.patientId === candidateId
							? { ...c, status: previousStatus }
							: c,
					),
				);
			}
			showToast("Не удалось сохранить статус осмотра на сервере", "error");
		});

		if (onStatusChange) onStatusChange(candidateId, newStatus);
	};

	const handleWhatsApp = async (candidate: PatientRecallRecord) => {
		const message = generatePdnProtectedRecallMessage(candidate, { clinicName });
		if (!candidate.phone?.trim()) {
			showToast("У пациента не указан номер телефона. Заполните номер в карте или скопируйте текст.", "warning");
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
		scheduleNoticeClear();
	};

	const handleTelegram = async (candidate: PatientRecallRecord) => {
		const message = generatePdnProtectedRecallMessage(candidate, { clinicName });
		if (!candidate.phone?.trim()) {
			showToast("У пациента не указан номер телефона. Заполните номер в карте или скопируйте текст.", "warning");
			return;
		}
		if (onSendTelegram) {
			await onSendTelegram(candidate, message);
		} else {
			window.open(buildTelegramUrl(candidate.phone, message), "_blank", "noopener,noreferrer");
		}
		handleStatusUpdate(candidate.id, "invited", "telegram");
		try {
			const res = await sendRecallCandidateInvite(
				{ patientId: candidate.patientId, channel: "telegram", body: message },
				authHeaders,
			);
			setStatusNotice(res.message);
		} catch (err) {
			setStatusNotice(`Telegram открыт. ${err instanceof Error ? err.message : String(err)}`);
		}
		scheduleNoticeClear();
	};

	const handleCopySms = async (candidate: PatientRecallRecord) => {
		const smsText = generatePdnProtectedRecallMessage(candidate, { clinicName });
		try {
			await navigator.clipboard.writeText(smsText);
			showToast("Текст приглашения скопирован в буфер обмена", "info");
		} catch (err) {
			clientLogger.error("[RecallActions] Clipboard error:", err);
			showToast("Не удалось скопировать текст в буфер обмена", "error");
		}
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
