import { INTERCOM_PRESETS, type IntercomPresetKey } from "@dental/shared";
import { useState } from "react";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { playIntercomChime } from "../../lib/intercomSound";
import { showToast } from "../GlobalToast";

export function useChairsideIntercomPing(
	cabinetNumber: string,
	patientId?: string,
	patientName?: string,
) {
	const [isSending, setIsSending] = useState(false);
	const [showReasonsDropdown, setShowReasonsDropdown] = useState(false);
	const [activePingKey, setActivePingKey] = useState<string | null>(null);

	const handlePing = async (
		presetKey: IntercomPresetKey,
		reason?: string,
		customNote?: string,
	) => {
		try {
			setIsSending(true);
			setActivePingKey(presetKey);
			const headers = getDenteAuthHeaders({ "Content-Type": "application/json" });
			const res = await fetch("/api/staff-chat/intercom-ping", {
				method: "POST", headers,
				body: JSON.stringify({ presetKey, cabinetNumber, reason, patientId, patientName, customNote }),
			});
			if (res.ok) {
				const preset = INTERCOM_PRESETS[presetKey];
				playIntercomChime(presetKey === "urgent_doctor_call" ? "critical" : "urgent");
				showToast(`Интерком: ${preset?.label || "Сигнал"} отправлен!`, "success");
			} else {
				showToast("Ошибка отправки сигнала интеркома", "warning");
			}
		} catch (e) {
			console.error("Сбой интеркома у кресла:", e);
			showToast("Сетевая ошибка вызова интеркома", "error");
		} finally {
			setIsSending(false);
			setShowReasonsDropdown(false);
			setActivePingKey(null);
		}
	};

	return {
		isSending, showReasonsDropdown, setShowReasonsDropdown,
		activePingKey, handlePing,
	};
}
