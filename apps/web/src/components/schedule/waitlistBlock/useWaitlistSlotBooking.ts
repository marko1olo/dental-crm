/**
 * Хук посадки кандидата из листа ожидания в освободившееся окно.
 */
import { useState } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { WaitlistMatchRow } from "./waitlistTypes";

export function useWaitlistSlotBooking(appointmentId: string, onSlotBooked: () => void) {
	const appLogic = useOptionalAppLogicContext();
	const [bookingId, setBookingId] = useState<string | null>(null);

	const handleTakeSlot = async (match: WaitlistMatchRow) => {
		if (bookingId) return;
		setBookingId(match.entryId);
		try {
			const patchRes = await fetch(`/api/appointments/${encodeURIComponent(appointmentId)}`, {
				method: "PATCH",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					patientId: match.patientId,
					status: "planned",
					expectedCurrentStatus: ["cancelled", "no_show"],
					reason: match.reason || "Запись из листа ожидания (посадка в окно)",
					comment: `Занято из листа ожидания: пациент ${match.patientName}`,
					assistantUserId: "",
				}),
			});
			if (!patchRes.ok) {
				const err = await patchRes.json().catch(() => null);
				showToast(err?.message || "Не удалось занять окно расписания", "error");
				return;
			}
			await fetch(`/api/waitlist/${encodeURIComponent(match.entryId)}`, {
				method: "PUT",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ status: "fulfilled" }),
			}).catch((err) => logger.warn("Failed to fulfill waitlist entry:", err));

			showToast(`Пациент «${match.patientName}» успешно записан в окно!`, "success", 5000);
			if (appLogic?.loadDashboard) void appLogic.loadDashboard();
			onSlotBooked();
		} catch (err) {
			logger.error("Error booking slot for waitlist match:", err);
			showToast("Ошибка при записи пациента в свободное окно", "error");
		} finally {
			setBookingId(null);
		}
	};

	return { bookingId, handleTakeSlot };
}
