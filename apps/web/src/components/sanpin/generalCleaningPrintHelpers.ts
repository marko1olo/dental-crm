import {
	type GeneralCleaningJournalRecord,
	type GeneralCleaningLog,
	generateGeneralCleaningJournalPrintHtml,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

export function printGeneralCleaningJournal(logs: GeneralCleaningLog[], appLogic?: any): void {
	const mappedRecords: GeneralCleaningJournalRecord[] = logs.map((log) => ({
		id: log.id,
		roomType: "surgical",
		roomName: log.roomName,
		scheduledDate: log.scheduledDate,
		actualDateTime: log.actualDateTime,
		treatedAreaM2: Number(log.treatedAreaM2) || 30,
		disinfectantName: log.disinfectantName,
		activeIngredient: log.activeIngredient || "ЧАС + Альдегиды",
		solutionConcentrationPercent: Number(log.solutionConcentrationPercent) || 1.5,
		applicationMethodRu: log.applicationMethod === "spraying" ? "Орошение" : "Двукратное протирание",
		exposureTimeMinutes: Number(log.exposureTimeMinutes) || 60,
		uvIrradiationMinutes: Number(log.uvIrradiationMinutes) || 60,
		ventilationMinutes: Number(log.ventilationMinutes) || 15,
		operatorStaffFullName:
			log.operatorName ||
			appLogic?.activeDoctor?.fullName ||
			appLogic?.activeDoctor?.name ||
			"Ассистент стоматолога",
		inspectorStaffFullName: log.inspectorName || undefined,
		isInspectorVerified: Boolean(log.inspectorName || log.status === "verified_by_inspector"),
		status: (log.status as any) || "completed",
		notes: log.notes || undefined,
	}));

	const html = generateGeneralCleaningJournalPrintHtml({
		records: mappedRecords,
		clinicInfo: {
			name: appLogic?.clinicName || "Стоматологическая клиника",
			inn: appLogic?.clinic?.inn || "",
			ogrn: appLogic?.clinic?.ogrn || "",
			address: appLogic?.clinic?.address || "",
			licenseNumber: appLogic?.clinic?.licenseNumber || "",
			chiefDoctor: "Главный врач",
			headNurse: "Главная медсестра",
		},
	});

	const printWindow = window.open("", "_blank");
	if (printWindow) {
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
		}, 250);
	} else {
		const iframe = document.createElement("iframe");
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "none";
		document.body.appendChild(iframe);
		const doc = iframe.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
			iframe.contentWindow?.focus();
			setTimeout(() => {
				iframe.contentWindow?.print();
				setTimeout(() => document.body.removeChild(iframe), 1000);
			}, 300);
		}
	}
}

export function exportGeneralCleaningLogsCsv(logs: GeneralCleaningLog[]): void {
	if (!logs || logs.length === 0) {
		showToast("Нет записей для экспорта", "error");
		return;
	}
	const headers = [
		"Дата плана",
		"Дата факта",
		"Кабинет",
		"Тип уборки",
		"Дезсредство",
		"Концентрация %",
		"Экспозиция мин",
		"Облучение мин",
		"Исполнитель",
	];
	const rows = logs.map((l) => [
		l.scheduledDate || "",
		l.actualDateTime || "",
		l.roomName || "",
		l.cleaningType === "general" ? "Генеральная" : "Текущая",
		l.disinfectantName || "",
		l.solutionConcentrationPercent ?? "",
		l.exposureTimeMinutes ?? "",
		l.uvIrradiationMinutes ?? "",
		l.operatorName || "",
	]);
	const csvContent = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))].join("\r\n");
	const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `General_Cleaning_Journal_${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
	showToast("Журнал генеральных уборок выгружен в CSV", "success");
}
