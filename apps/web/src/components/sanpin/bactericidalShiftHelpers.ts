/**
 * BACTERICIDAL SHIFT HELPERS (SanPiN 3.3686-21 / R 3.5.1904-04)
 */

import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export { handlePrintBactericidalJournal } from "./bactericidal/bactericidalPrintHelper";

function getAuthHeaders(): HeadersInit {
	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	return {
		"Content-Type": "application/json",
		...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
		...(staffToken ? { "X-Staff-Token": staffToken } : {}),
	};
}

export async function executeShiftAutopilot(
	durationHours: number,
	currentEquips: any[],
	fetchAll: () => Promise<void>,
): Promise<void> {
	const durationMinutes = durationHours * 60;
	const date = new Date().toISOString().slice(0, 10);
	const headers = getAuthHeaders();

	const res = await fetch("/api/registers/bactericidal/shift-autopilot", {
		method: "POST",
		headers,
		body: JSON.stringify({ durationMinutes, date, operatingMode: "continuous_presence" }),
	});

	if (res.ok) {
		const data = await res.json();
		showToast(`Автоматический учет смены (${durationHours} ч) выполнен для всех ${data.results?.length ?? currentEquips.length} аппаратов!`, "success");
		await fetchAll();
		return;
	}

	let updatedCount = 0;
	for (const eq of currentEquips) {
		const fRes = await fetch("/api/registers/bactericidal/logs", {
			method: "POST",
			headers,
			body: JSON.stringify({
				equipmentId: eq.id, date, sessionStartTime: "08:00",
				sessionEndTime: `${String(8 + durationHours).padStart(2, "0")}:00`,
				durationMinutes, operatingMode: "continuous_presence",
				notes: `Авто-учет смены (${durationHours} ч) по Р 3.5.1904-04`,
			}),
		});
		if (fRes.ok) updatedCount++;
	}
	showToast(`Наработка ламп обновлена (+${durationHours} ч) для ${updatedCount} аппаратов`, "success");
	await fetchAll();
}

export async function executePreShift30Min(
	equipmentId: string | undefined,
	currentEquips: any[],
	fetchAll: () => Promise<void>,
): Promise<void> {
	const durationMinutes = 30;
	const date = new Date().toISOString().slice(0, 10);
	const headers = getAuthHeaders();

	const res = await fetch("/api/registers/bactericidal/shift-autopilot", {
		method: "POST",
		headers,
		body: JSON.stringify({
			equipmentId, durationMinutes, date, operatingMode: "pre_op_preparation",
			notes: "Обеззараживание воздуха перед сменой (30 мин) — санитарный режим",
		}),
	});

	if (res.ok) {
		const data = await res.json();
		showToast(equipmentId ? "Включение УФ-облучателя на 30 мин перед сменой зафиксировано!" : `Включение всех УФ-облучателей на 30 мин перед сменой зафиксировано (${data.results?.length ?? currentEquips.length} аппаратов)!`, "success");
		await fetchAll();
		return;
	}

	const targetEqs = equipmentId ? currentEquips.filter((e) => e.id === equipmentId) : currentEquips;
	let updatedCount = 0;
	for (const eq of targetEqs) {
		const fRes = await fetch("/api/registers/bactericidal/logs", {
			method: "POST",
			headers,
			body: JSON.stringify({
				equipmentId: eq.id, date, sessionStartTime: "07:30", sessionEndTime: "08:00",
				durationMinutes: 30, operatingMode: "pre_op_preparation",
				notes: "Обеззараживание воздуха перед сменой (30 мин) — санитарный режим",
			}),
		});
		if (fRes.ok) updatedCount++;
	}
	showToast(`Сеанс 30 мин перед сменой зафиксирован для ${updatedCount} аппаратов`, "success");
	await fetchAll();
}
