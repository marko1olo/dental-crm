/**
 * labOrderProtocolExporter.ts — Копирование протокола ЗТЛ-1 и выжимки для мессенджеров (Telegram/WhatsApp).
 *
 * Инварианты:
 * 1. Формирование официального протокола формы ЗТЛ-1 (А4) по ГОСТ.
 * 2. Копирование выжимки для курьера и зубного техника в мессенджер без лишнего шума.
 */

import { rublesToKopecks, formatLabOrderFormZtl1A4Protocol } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { type JawScope } from "../labMath";
import { buildLabOrderMessengerSummary } from "../dentalLabModalPresets";

export function formatDisplayDate(dStr?: string | null): string {
	if (!dStr) return "";
	try {
		const parsed = new Date(dStr);
		if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString("ru-RU");
	} catch (err: unknown) {
		console.warn("[DentalLabOrderModal] Failed to format date:", dStr, err);
	}
	return dStr;
}

export function copyLabOrderZtl1Protocol(input: {
	gostOrderNumber: string;
	formPatientName: string;
	patientId?: string | null | undefined;
	formDoctorName: string;
	doctorId?: string | null | undefined;
	constructionType: string;
	material: string;
	shadeClassical: string;
	shade3dMaster: string;
	shadeBleach: string;
	selectedTeeth: number[];
	impressionType: string;
	dueDate: string;
	currentStage: string;
	totalLabPriceRub: number;
	clinicalNotes: string;
}): void {
	try {
		const synthOrder = {
			id: input.gostOrderNumber,
			clinicId: "clinic-default",
			patientId: input.patientId || "pat-default",
			patientFullName: input.formPatientName || "Пациент",
			doctorId: input.doctorId || "doc-default",
			doctorFullName: input.formDoctorName || "Лечащий врач-ортопед",
			labId: "lab-primary",
			labName: "Зуботехническая лаборатория DENTE",
			workType: (input.constructionType as any) || "single_crown",
			material: (input.material as any) || "zirconia_multilayer",
			shade: (input.shadeClassical || input.shade3dMaster || input.shadeBleach || "A2") as any,
			toothNumbers: input.selectedTeeth?.length > 0 ? input.selectedTeeth : [11],
			antagonistInfo: "В центральной окклюзии",
			impressionType: (input.impressionType as any) || "digital_intraoral_scan",
			sentDate: new Date().toISOString().split("T")[0]!,
			expectedDate: input.dueDate || new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0]!,
			status: (input.currentStage as any) || "sent_to_lab",
			stages: [],
			labCostKopecks: rublesToKopecks(input.totalLabPriceRub || 0),
			isWarrantyRework: input.currentStage === "correction_remake",
			warrantyMonths: 12,
			notes: input.clinicalNotes || undefined,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		const protocolText = formatLabOrderFormZtl1A4Protocol(synthOrder, "Стоматологическая клиника DENTE");
		navigator.clipboard.writeText(protocolText);
		showToast("Протокол наряда скопирован в буфер", "success");
	} catch {
		showToast("Не удалось скопировать протокол наряда", "error");
	}
}

export async function copyLabOrderMessengerSummary(input: {
	clinicName: string;
	clinicPhone: string;
	gostOrderNumber: string;
	formPatientName: string;
	formDoctorName: string;
	jawScope: JawScope | null;
	selectedTeeth: number[];
	constructionType: string;
	material: string;
	finalShade: string;
	dueDate: string;
	frameworkTrialDate: string;
	ceramicTrialDate: string;
	clinicalNotes: string;
}): Promise<void> {
	const text = buildLabOrderMessengerSummary({
		clinicName: input.clinicName || "Денте",
		clinicPhone: input.clinicPhone || "",
		gostOrderNumber: input.gostOrderNumber,
		patientName: input.formPatientName,
		doctorName: input.formDoctorName,
		teethOrJaw: input.selectedTeeth.length > 0 ? input.selectedTeeth.join(", ") : "Общий наряд",
		constructionTypeTitle: input.constructionType,
		materialTitle: input.material,
		shade: input.finalShade,
		dueDate: input.dueDate ? formatDisplayDate(input.dueDate) : "Не указан",
		frameworkTrialDate: input.frameworkTrialDate ? formatDisplayDate(input.frameworkTrialDate) : undefined,
		ceramicTrialDate: input.ceramicTrialDate ? formatDisplayDate(input.ceramicTrialDate) : undefined,
		clinicalNotes: input.clinicalNotes.trim() || undefined,
	});

	try {
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
		}
		showToast("Выжимка наряда скопирована для мессенджера", "success");
	} catch {
		showToast("Не удалось скопировать выжимку наряда в буфер", "error");
	}
}
