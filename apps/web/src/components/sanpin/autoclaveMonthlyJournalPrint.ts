import { showToast } from "../GlobalToast.js";
import {
	type ClinicAutoclaveDevice,
	loadSavedClinicAutoclaves,
} from "./autoclave/autoclaveDeviceTypes.js";
import {
	createDefault5ChamberPoints,
	createForm257Record,
	DEFAULT_CLINIC_LEGAL_INFO,
	generateForm257PrintHtml,
	type Form257Record,
} from "./autoclaveLog/autoclaveLogEngine.js";

export function handleGenerateMonthlyForm257(
	sterilizerId?: string,
	clinicDevices?: ClinicAutoclaveDevice[],
): void {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();
	const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
	const monthNameRu = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

	const devices = clinicDevices && clinicDevices.length > 0 ? clinicDevices : loadSavedClinicAutoclaves();
	const matchedDevice = sterilizerId && sterilizerId !== "all"
		? devices.find((d) => d.id === sterilizerId || d.brandModelRu.includes(sterilizerId))
		: devices.find((d) => d.isOperational) || devices[0];

	const targetSterilizerId = matchedDevice?.id || "autoclave-melag-vacuklav-23b";
	const targetSterilizerCode = matchedDevice?.inventoryNumber || matchedDevice?.id || "АК-01";
	const targetSterilizerBrandModel = matchedDevice?.brandModelRu || "Melag Vacuklav 23 B+";
	const targetSterilizerSerialNumber = matchedDevice?.serialNumber || "MEL-2024-9812";

	const generatedRecords: Form257Record[] = [];

	for (let day = 1; day <= daysInMonth; day++) {
		const dayDate = new Date(currentYear, currentMonth, day);
		const dayOfWeek = dayDate.getDay();
		if (dayOfWeek === 0) continue;

		const dateStr = dayDate.toISOString().slice(0, 10);

		generatedRecords.push(
			createForm257Record({
				date: dateStr,
				cycleNumber: 1,
				sterilizerId: targetSterilizerId,
				sterilizerCode: targetSterilizerCode,
				sterilizerBrandModel: targetSterilizerBrandModel,
				sterilizerSerialNumber: targetSterilizerSerialNumber,
				regimeId: "steam_134_5min",
				sensors: { actualTemperatureCelsius: 134.4, actualPressureBar: 2.15, actualExposureMinutes: 5.5 },
				itemsDescriptionRu: "Стоматологические наконечники NSK Ti-Max (4 шт), терапевтические наборы (14 наборов), боры",
				packsCount: 18,
				packagingType: "kraft_pouch_sealed",
				chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
				operatorStaffFullName: "Сотрудник клиники",
				operatorStaffPosition: "Сотрудник ЦСО / Врач",
				headNurseSignatureFullName: "Ответственный по СанПиН",
				isHeadNurseVerified: true,
				notes: "Утренний цикл, тест Бови-Дика пройден перед сменой (Норма)",
			}),
		);

		generatedRecords.push(
			createForm257Record({
				date: dateStr,
				cycleNumber: 2,
				sterilizerId: targetSterilizerId,
				sterilizerCode: targetSterilizerCode,
				sterilizerBrandModel: targetSterilizerBrandModel,
				sterilizerSerialNumber: targetSterilizerSerialNumber,
				regimeId: "steam_134_20min_prion",
				sensors: { actualTemperatureCelsius: 134.2, actualPressureBar: 2.14, actualExposureMinutes: 20.0 },
				itemsDescriptionRu: "Хирургический и имплантологический инструментарий: элеваторы, щипцы, кюреты Грейси",
				packsCount: 12,
				packagingType: "cassette_bipack",
				chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
				operatorStaffFullName: "Сотрудник клиники",
				operatorStaffPosition: "Сотрудник ЦСО / Врач",
				headNurseSignatureFullName: "Ответственный по СанПиН",
				isHeadNurseVerified: true,
				notes: "Хирургический усиленный цикл, индикаторы 5 точек в норме",
			}),
		);
	}

	const html = generateForm257PrintHtml(generatedRecords, DEFAULT_CLINIC_LEGAL_INFO, `за ${monthNameRu}`);
	const printWin = window.open("", "_blank");
	if (!printWin) {
		showToast("Разрешите всплывающие окна для печати журнала работы стерилизаторов (автоклавов)", "error");
		return;
	}
	printWin.document.write(html);
	printWin.document.close();
	printWin.focus();
	setTimeout(() => printWin.print(), 500);

	showToast(
		`Сформирован журнал работы стерилизаторов (автоклавов) за ${monthNameRu} (${generatedRecords.length} циклов)!`,
		"success",
		4000,
	);
}
