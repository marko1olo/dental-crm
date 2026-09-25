/**
 * ============================================================================
 * BACTERICIDAL SHIFT HELPERS (SanPiN 3.3686-21 / R 3.5.1904-04)
 * Вспомогательные функции автоматического ведения смен и печати журнала
 * ============================================================================
 */

import { generateBactericidalJournalPrintHtml } from "@dental/shared";
import { showToast } from "../GlobalToast";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";

export async function executeShiftAutopilot(
	durationHours: number,
	currentEquips: any[],
	fetchAll: () => Promise<void>,
): Promise<void> {
	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	const durationMinutes = durationHours * 60;

	const res = await fetch("/api/registers/bactericidal/shift-autopilot", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
			...(staffToken ? { "X-Staff-Token": staffToken } : {}),
		},
		body: JSON.stringify({
			durationMinutes,
			date: new Date().toISOString().slice(0, 10),
			operatingMode: "continuous_presence",
		}),
	});

	if (res.ok) {
		const data = await res.json();
		showToast(
			`Автоматический учет смены (${durationHours} ч) выполнен для всех ${data.results?.length ?? currentEquips.length} аппаратов!`,
			"success",
		);
		await fetchAll();
	} else {
		let updatedCount = 0;
		for (const eq of currentEquips) {
			const fRes = await fetch("/api/registers/bactericidal/logs", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({
					equipmentId: eq.id,
					date: new Date().toISOString().slice(0, 10),
					sessionStartTime: "08:00",
					sessionEndTime: `${String(8 + durationHours).padStart(2, "0")}:00`,
					durationMinutes,
					operatingMode: "continuous_presence",
					notes: `Авто-учет смены (${durationHours} ч) по Р 3.5.1904-04`,
				}),
			});
			if (fRes.ok) updatedCount++;
		}
		showToast(`Наработка ламп обновлена (+${durationHours} ч) для ${updatedCount} аппаратов`, "success");
		await fetchAll();
	}
}

export async function executePreShift30Min(
	equipmentId: string | undefined,
	currentEquips: any[],
	fetchAll: () => Promise<void>,
): Promise<void> {
	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	const durationMinutes = 30;

	const res = await fetch("/api/registers/bactericidal/shift-autopilot", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
			...(staffToken ? { "X-Staff-Token": staffToken } : {}),
		},
		body: JSON.stringify({
			equipmentId,
			durationMinutes,
			date: new Date().toISOString().slice(0, 10),
			operatingMode: "pre_op_preparation",
			notes: "Включение баклампы перед сменой (30 мин) — предоперационная подготовка по СанПиН 3.3686-21",
		}),
	});

	if (res.ok) {
		const data = await res.json();
		showToast(
			equipmentId
				? "Включение баклампы на 30 мин перед сменой зафиксировано!"
				: `Включение всех бакламп на 30 мин перед сменой зафиксировано (${data.results?.length ?? currentEquips.length} аппаратов)!`,
			"success",
		);
		await fetchAll();
	} else {
		const targetEqs = equipmentId ? currentEquips.filter((e) => e.id === equipmentId) : currentEquips;
		let updatedCount = 0;
		for (const eq of targetEqs) {
			const fRes = await fetch("/api/registers/bactericidal/logs", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify({
					equipmentId: eq.id,
					date: new Date().toISOString().slice(0, 10),
					sessionStartTime: "07:30",
					sessionEndTime: "08:00",
					durationMinutes: 30,
					operatingMode: "pre_op_preparation",
					notes: "Включение баклампы перед сменой (30 мин) по СанПиН 3.3686-21",
				}),
			});
			if (fRes.ok) updatedCount++;
		}
		showToast(`Сеанс 30 мин перед сменой зафиксирован для ${updatedCount} аппаратов`, "success");
		await fetchAll();
	}
}

export function handlePrintBactericidalJournal({
	equipments,
	selectedEquipId,
	logs,
	operatorStaffFullName,
}: {
	equipments: any[];
	selectedEquipId: string;
	logs: any[];
	operatorStaffFullName: string;
}): void {
	if (equipments.length === 0) {
		showToast("Нет активных облучателей для формирования журнала", "warning");
		return;
	}

	const targetEquips = selectedEquipId === "all" ? equipments : equipments.filter((e) => e.id === selectedEquipId);
	const targetEquip = targetEquips[0] || equipments[0];
	const equipSessions = logs
		.filter((l) => selectedEquipId === "all" || l.equipmentId === targetEquip.id)
		.map((l) => {
			const sStart = l.sessionStartTime ? new Date(l.sessionStartTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "08:00";
			const sEnd = l.sessionEndTime ? new Date(l.sessionEndTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "08:30";
			const dur = Number(l.durationMinutes) || 30;
			return {
				id: l.id,
				equipmentId: targetEquip.id,
				roomName: targetEquip.roomName,
				deviceBrand: targetEquip.deviceBrand,
				date: l.date || new Date().toISOString().slice(0, 10),
				sessionStartTime: sStart,
				sessionEndTime: sEnd,
				durationMinutes: dur,
				durationHours: Number((dur / 60).toFixed(2)),
				operatingMode: (l.operatingMode as "continuous_presence" | "pre_op_preparation" | "post_cleaning" | "intermittent") || "continuous_presence",
				cumulativeHoursAfterSession: Number(l.cumulativeHoursAfterSession) || 0,
				operatorStaffFullName: l.operatorName || operatorStaffFullName,
				notes: l.notes || "",
			};
		});

	const html = generateBactericidalJournalPrintHtml({
		equipment: {
			id: targetEquip.id,
			roomName: targetEquip.roomName,
			roomVolumeM3: Number(targetEquip.roomVolumeM3) || 45,
			deviceBrand: targetEquip.deviceBrand,
			serialNumber: targetEquip.serialNumber,
			deviceType: (targetEquip.deviceType as "recirculator_closed" | "irradiator_open" | "combined") || "recirculator_closed",
			lampType: targetEquip.lampType || "TUV 30W",
			lampCount: Number(targetEquip.lampCount) || 2,
			totalOperatingHours: Number(targetEquip.totalOperatingHours) || 0,
			maxLampHours: Number(targetEquip.maxLampHours) || 8000,
			remainingLampHours: Number(targetEquip.remainingLampHours) || (Number(targetEquip.maxLampHours || 8000) - Number(targetEquip.totalOperatingHours || 0)),
			remainingLampPercent: Number(targetEquip.remainingLampPercent) || 100,
			lampStatus: (targetEquip.lampStatus as "normal" | "warning_replace_soon" | "expired_replace_now") || "normal",
			isLampCritical: Boolean(targetEquip.isLampCritical),
		},
		sessions: equipSessions,
	});

	const printWin = window.open("", "_blank");
	if (!printWin) {
		showToast("Разрешите всплывающие окна для печати журнала", "error");
		return;
	}
	printWin.document.write(html);
	printWin.document.close();
	printWin.focus();
	setTimeout(() => printWin.print(), 500);
	showToast("Журнал бактерицидной установки сформирован с нормативными штампами!", "success");
}
