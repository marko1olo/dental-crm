import { generateBactericidalJournalPrintHtml } from "@dental/shared";
import { showToast } from "../../GlobalToast";

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
}
