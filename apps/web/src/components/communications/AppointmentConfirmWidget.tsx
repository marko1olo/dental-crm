import { useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { useSettingsStore } from "../../store/settingsStore";

export function AppointmentConfirmWidget({
	appointmentId,
	startsAt,
	formatDateTime,
	disabled,
}: {
	appointmentId: string;
	startsAt: string;
	formatDateTime: (val: string) => string;
	disabled: boolean;
}) {
	const [apptActionLoading, setApptActionLoading] = useState(false);
	const [apptActionDone, setApptActionDone] = useState<"confirmed" | "cancelled" | null>(null);
	const [apptActionError, setApptActionError] = useState<string | null>(null);

	const scheduleAdminSecretSession = useSettingsStore((state) => state.scheduleAdminSecretSession);

	async function handleConfirmAppointment(status: "confirmed" | "cancelled") {
		setApptActionLoading(true);
		setApptActionError(null);
		try {
			const res = await fetch(`/api/appointments/${appointmentId}`, {
				method: "PATCH",
				credentials: "include",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }, scheduleAdminSecretSession),
				body: JSON.stringify({ status }),
			});
			if (!res.ok) {
				setApptActionError(
					res.status === 403
						? "Нет доступа к изменению расписания: введите секрет расписания в настройках"
						: `Ошибка обновления приёма (${res.status})`,
				);
			} else {
				setApptActionDone(status);
			}
		} catch {
			setApptActionError("Ошибка сети при обновлении приёма");
		} finally {
			setApptActionLoading(false);
		}
	}

	return (
		<div className="appointment-confirm-widget" style={{ borderLeft: "3px solid var(--teal)", paddingLeft: "10px", marginBottom: "8px" }}>
			<p style={{ margin: "0 0 6px", fontSize: "12px", color: "var(--muted)" }}>
				Приём: <strong>{formatDateTime(startsAt)}</strong>
			</p>
			{apptActionDone ? (
				<span className={`status-pill status-${apptActionDone}`}>
					Приём {apptActionDone === "confirmed" ? "подтверждён" : "отменён"}
				</span>
			) : (
				<button
					type="button" className="secondary-button" onClick={() => void handleConfirmAppointment("confirmed")}
					disabled={apptActionLoading || disabled} aria-label="Подтвердить приём" style={{ minHeight: "36px" }}
				>
					Подтвердить приём
				</button>
			)}
			{apptActionError && (
				<p role="alert" style={{ color: "var(--bad-fg, #b42318)", fontSize: "12px", marginTop: "4px" }}>
					{apptActionError}
				</p>
			)}
		</div>
	);
}
