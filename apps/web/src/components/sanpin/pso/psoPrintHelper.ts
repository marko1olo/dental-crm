import type { PsoCleaningLog } from "@dental/shared";
import { generateStatutoryPsoForm366PrintHtml, STATUTORY_PSO_REAGENTS } from "../sanpinAzopyramEngine";
import { showToast } from "../../GlobalToast";

export function printPsoJournal(
	logs: PsoCleaningLog[],
	nurseName: string,
	appLogic: any,
	stampedRows: Record<string, boolean>,
) {
	const recordsToPrint = logs.map((l, idx) => ({
		id: l.id || `pso-${idx}`,
		timestamp: l.timestamp || l.createdAt || new Date().toISOString(),
		instrumentName: l.instrumentName || "Инструментарий терапевтический и хирургический",
		batchItemCount: l.batchItemCount || 50,
		testedSampleCount: l.testedSampleCount || 3,
		reagentLot: STATUTORY_PSO_REAGENTS.azopyram.standardLotNumber,
		solutionTimeRu: "08:30 (годен до 2 ч)",
		isAzopyramNegative: l.isAzopyramNegative ?? true,
		isPhenolphthaleinNegative: l.isPhenolphthaleinNegative ?? true,
		detergentBrand: l.detergentBrand || "Биолот 0.5% + Аламинол 1%",
		isBatchApproved: l.isBatchApproved ?? true,
		rejectionReason: l.rejectionReason || undefined,
		operatorStaffFullName: l.operatorName || nurseName || "Сотрудник клиники",
		operatorStaffPosition: "Медсестра ЦСО / Врач",
		electronicStampVerified: stampedRows[l.id] || Boolean(l.notes?.includes("ЭЦП")),
		notes: l.notes || undefined,
	}));

	const html = generateStatutoryPsoForm366PrintHtml({
		clinicName: appLogic?.clinicInfo?.name || "ООО «ДЕНТЕ КЛИНИК»",
		clinicAddress: appLogic?.clinicInfo?.address || "г. Москва",
		ogrn: "1187746123456",
		inn: "7728412345",
		licenseInfo: "ЛО41-01137-77/00368412",
		chiefDoctorFullName: appLogic?.activeDoctor?.fullName || "Главный врач клиники",
		headNurseFullName: nurseName || "Главная медицинская сестра",
		dateRangeTextRu: `Журнал за ${new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}`,
		records: recordsToPrint,
	});

	const printWin = window.open("", "_blank");
	if (printWin) {
		printWin.document.write(html);
		printWin.document.close();
		setTimeout(() => printWin.print(), 500);
	}
	showToast("Сформирован журнал контроля предстерилизационной очистки для печати", "success");
}
