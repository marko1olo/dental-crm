import { useMemo } from "react";
import {
	calculateCabinetSummary,
	calculateDentalHealthIndex,
	calculatePatientTaxDeduction,
	generatePatientDentalPassport,
	type DentalHealthIndexResult,
	type PatientCabinetSummary,
	type PatientDentalPassport,
	type PatientPersonalCabinetData,
	type PatientTaxDeductionCalculation,
} from "../../patientCabinetEngine.js";
import {
	generateCareMemo,
	detectInterventionTypeFromProcedure,
	type PatientCareMemo,
} from "../../patientCareInstructionsEngine.js";
import {
	resolveTaxDeductionCategoryShared,
	type TaxDeductionPaymentItem,
} from "../../../../finance/taxDeductionEngine.js";

export function useCabinetCalculatedViews(data: PatientPersonalCabinetData, selectedTaxYear: number) {
	const summary: PatientCabinetSummary = useMemo(() => calculateCabinetSummary(data), [data]);
	const healthIndex: DentalHealthIndexResult = useMemo(
		() => calculateDentalHealthIndex(data.teeth || []),
		[data.teeth],
	);
	const dentalPassport: PatientDentalPassport = useMemo(
		() => generatePatientDentalPassport(data),
		[data],
	);
	const nextApptCountdown = useMemo(() => {
		if (!summary.nextAppointment) return null;
		const apptDate = new Date(`${summary.nextAppointment.dateIso}T${summary.nextAppointment.timeRu || "10:00"}`);
		const diffMs = apptDate.getTime() - Date.now();
		if (diffMs <= 0) return "Прием сейчас";
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffHours < 24) return `${diffHours} ч.`;
		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays} дн.`;
	}, [summary.nextAppointment]);

	const taxDeduction: PatientTaxDeductionCalculation = useMemo(
		() => calculatePatientTaxDeduction(data.invoices || [], selectedTaxYear),
		[data.invoices, selectedTaxYear],
	);

	const careMemo: PatientCareMemo = useMemo(() => {
		const nextAppt = data.appointments[0];
		const interventionType = nextAppt ? detectInterventionTypeFromProcedure(nextAppt.titleRu) : "caries";

		// Извлекаем реальный номер зуба из протокола/названия приёма или одонтограммы
		const titleMatch = nextAppt?.titleRu?.match(/(?:зуб[а-я]*|fdi|№|\s)([1-4][1-8]|[5-8][1-5])\b/i);
		let resolvedToothFdi = titleMatch ? titleMatch[1] : undefined;

		if (!resolvedToothFdi && Array.isArray(data.teeth)) {
			const treatedTooth = data.teeth.find(
				(t) => t.status && t.status !== "healthy",
			);
			if (treatedTooth?.fdiCode) {
				resolvedToothFdi = String(treatedTooth.fdiCode);
			}
		}

		if (!resolvedToothFdi && data.teeth?.[0]?.fdiCode) {
			resolvedToothFdi = String(data.teeth[0].fdiCode);
		}

		return generateCareMemo({
			patientName: data.fullName,
			patientPhone: data.phone,
			toothFdi: resolvedToothFdi,
			procedureName: nextAppt?.titleRu,
			interventionType,
			doctorName: nextAppt?.doctorName || data.curatingDoctor,
			clinicName: nextAppt?.clinicName || "Стоматологическая клиника ДЕНТЕ",
		});
	}, [data]);

	const taxDeductionPayments: TaxDeductionPaymentItem[] = useMemo(() => {
		return data.invoices
			.filter((inv) => inv.status === "paid")
			.map((inv) => ({
				id: inv.id,
				receiptNumber: inv.invoiceNumber,
				fiscalDocumentNumber: inv.fiscalReceiptNumber || "",
				fiscalSign: "",
				serviceName: inv.titleRu,
				dateIso: (inv.dateIso as string) || (inv.issueDateIso as string) || new Date().toISOString().slice(0, 10),
				amountRub: inv.totalAmountRub,
				taxCode: resolveTaxDeductionCategoryShared(inv.titleRu),
			}));
	}, [data.invoices]);

	return { summary, healthIndex, dentalPassport, nextApptCountdown, taxDeduction, careMemo, taxDeductionPayments };
}
