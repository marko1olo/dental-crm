/**
 * Хук логики подбора кандидатов из листа ожидания.
 */
import { useCallback, useEffect, useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { openWhatsAppChat } from "../waitlistCancellationEngine";
import { useWaitlistSlotBooking } from "./useWaitlistSlotBooking";
import { generateOfferMessage } from "./waitlistOfferMessage";
import { loadFailureText, type WaitlistMatchReport, type WaitlistMatchRow } from "./waitlistTypes";

export function useWaitlistMatchesLogic(appointmentId: string, lazy: boolean) {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const clinicName = appLogic?.dashboard?.clinicSettings?.name;

	const [report, setReport] = useState<WaitlistMatchReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(!lazy);
	const [started, setStarted] = useState(!lazy);
	const [called, setCalled] = useState<Set<string>>(new Set());
	const [contactedPatients, setContactedPatients] = useState<Set<string>>(new Set());
	const [activeMenuEntryId, setActiveMenuEntryId] = useState<string | null>(null);

	useEffect(() => {
		if (!activeMenuEntryId) return;
		const onDocClick = (e: MouseEvent) => {
			if (!(e.target as HTMLElement | null)?.closest(`[data-menu-container="${activeMenuEntryId}"]`)) {
				setActiveMenuEntryId(null);
			}
		};
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, [activeMenuEntryId]);

	const load = useCallback(async () => {
		if (!appointmentId) return;
		setError(null);
		setLoading(true);
		setStarted(true);
		try {
			const res = await fetch(`/api/appointments/${encodeURIComponent(appointmentId)}/waitlist-matches`, {
				headers: auth?.denteClinicalReadHeaders ? auth.denteClinicalReadHeaders() : {},
			}).catch(() => null);
			if (!res) {
				setReport(null);
				setError("Сервер клиники не ответил. Проверьте подключение к сети.");
				return;
			}
			const payload = await res.json().catch((err) => { logger.error("JSON parse error:", err); return null; });
			if (!res.ok) {
				setReport(null);
				setError(loadFailureText(res.status, payload?.message ?? null));
				return;
			}
			if (!payload?.matches || !Array.isArray(payload.matches)) {
				setReport(null);
				setError("Сервер не вернул список кандидатов.");
				return;
			}
			setReport({
				appointmentId: payload.appointmentId ?? appointmentId,
				slot: payload.slot ?? { from: "", to: "", doctorName: null },
				matches: payload.matches,
				examinedEntries: Number(payload.examinedEntries) || payload.matches.length,
				note: typeof payload.note === "string" ? payload.note : "",
			});
		} finally {
			setLoading(false);
		}
	}, [appointmentId, auth]);

	const { bookingId, handleTakeSlot } = useWaitlistSlotBooking(appointmentId, () => void load());

	useEffect(() => { if (!lazy && appointmentId) void load(); }, [lazy, appointmentId, load]);

	useEffect(() => {
		setCalled(new Set());
		if (lazy) { setStarted(false); setReport(null); setError(null); setLoading(false); }
	}, [lazy]);

	const handleSendWhatsApp = (match: WaitlistMatchRow) => {
		if (!match.phone) { showToast("У пациента не указан номер телефона", "error"); return; }
		openWhatsAppChat(match.phone, generateOfferMessage(match, report?.slot, clinicName));
		setContactedPatients((prev) => new Set(prev).add(match.patientId));
		showToast(`Предложение сформировано для ${match.patientName}`, "success");
	};

	const handleCopySms = (match: WaitlistMatchRow) => {
		navigator.clipboard?.writeText(generateOfferMessage(match, report?.slot, clinicName)).then(() => {
			setContactedPatients((prev) => new Set(prev).add(match.patientId));
			showToast("Текст скопирован в буфер", "success");
		});
	};

	const toggleCalled = (patientId: string) => setCalled((prev) => new Set(prev).add(patientId));

	return {
		report, error, loading, started, called, contactedPatients, bookingId,
		activeMenuEntryId, setActiveMenuEntryId, load, handleSendWhatsApp, handleCopySms, handleTakeSlot, toggleCalled,
	};
}
