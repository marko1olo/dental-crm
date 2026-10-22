import { generateDigitalStampHash } from "../calculations.js";
import type { ClinicRequisites, DailyShiftSanpinLogBundle } from "../types.js";
import { createDailyShiftCycles } from "./dailyShiftCycles.js";
import { createDailyShiftKraftPackages } from "./dailyShiftKraft.js";
import { createDailyShiftPsoRecords } from "./dailyShiftPso.js";

export function generateDailyShiftSanpinLog(params: {
	date?: string;
	operatorFullName?: string;
	shiftNumber?: number;
	clinicInfo?: ClinicRequisites;
}): DailyShiftSanpinLogBundle {
	const now = new Date();
	const pad2 = (n: number) => String(n).padStart(2, "0");
	const dateStr = params.date || `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
	const operatorName = params.operatorFullName || "Медсестра ЦСО";
	const shiftNum = params.shiftNumber || 1;

	const cycles = createDailyShiftCycles(dateStr, operatorName);
	const psoRecords = createDailyShiftPsoRecords(dateStr, operatorName);
	const kraftPackages = createDailyShiftKraftPackages(dateStr, operatorName);

	const summaryTextRu = `Смена № ${shiftNum} за ${dateStr} успешно зафиксирована. Проведено 3 цикла автоклавирования (38 упаковок), 3 серии ПСО (100% норма), сгенерировано ${kraftPackages.length} маркированных крафт-пакетов. Подпись: ${operatorName}`;

	return {
		date: dateStr,
		shiftNumber: shiftNum,
		operatorFullName: operatorName,
		operatorPosition: "Медсестра ЦСО",
		electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: shiftNum, operatorFullName: operatorName }),
		cycles,
		psoRecords,
		kraftPackages,
		summaryTextRu,
	};
}
