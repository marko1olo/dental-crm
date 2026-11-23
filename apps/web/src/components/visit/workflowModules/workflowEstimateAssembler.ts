import { roundToKopecks } from "../completedServicesPlan";
import { calculatePercentDiscountKopecks, kopecksToRub, rublesToKopecks } from "@dental/shared";
import { isDemoShowcaseMode, isDemoPatientId } from "../../../lib/demoMode.js";
import type {
	ClinicalVisitCompletionInput,
	ClinicalVisitCompletionResult,
} from "./clinicalWorkflowTypes";
import { buildWorkflowStatusAndBanner } from "./workflowStatusBanner";
import { collectWorkflowEstimateItems } from "./collectWorkflowEstimateItems";

export { collectWorkflowEstimateItems };

export function assembleClinicalVisitEstimate(
	input: ClinicalVisitCompletionInput,
): ClinicalVisitCompletionResult {
	const allItems = collectWorkflowEstimateItems(input);
	const totalGross = roundToKopecks(
		allItems.reduce((sum, item) => sum + (item.totalRub ?? item.priceRub * item.quantity), 0),
	);
	const discountPercent = Math.min(100, Math.max(0, input.discountPercent ?? 0));
	const totalGrossKop = rublesToKopecks(totalGross);
	const totalDiscountKop = calculatePercentDiscountKopecks(totalGrossKop, discountPercent);
	const totalDiscount = kopecksToRub(totalDiscountKop);
	const totalNetKop = Math.max(0, totalGrossKop - totalDiscountKop);
	const totalNet = kopecksToRub(totalNetKop);

	const itemsWithDiscount = allItems.map((item) => {
		const itemGrossRub = item.totalRub ?? item.priceRub * item.quantity;
		const itemGrossKop = rublesToKopecks(itemGrossRub);
		const itemDiscountKop =
			discountPercent > 0
				? calculatePercentDiscountKopecks(itemGrossKop, discountPercent)
				: rublesToKopecks(item.discountRub ?? 0);
		const itemDiscountRub = kopecksToRub(itemDiscountKop);
		return {
			...item,
			discountRub: itemDiscountRub,
			totalRub: Math.max(0, kopecksToRub(itemGrossKop - itemDiscountKop)),
		};
	});

	const now = new Date();

	const isAborted =
		input.completionMode === "aborted" ||
		input.completionMode === "rescheduled" ||
		input.completionMode === "emergency_interrupted";

	const { status, statusBannerText } = buildWorkflowStatusAndBanner(
		input.completionMode,
		totalNet,
		input.interruptionReason,
		input.rescheduledDateIso,
	);

	// Мандаты 8e, 8n, 8z: Ноль синтетических инвойсов INV-2026-XXXXX и муляжных QR СБП.
	// Номер счёта присваивается реальным Fastify API в PostgreSQL 18,
	// а платежный QR предоставляется реальным эквайрингом/кассой.
	const isDemo = isDemoShowcaseMode() || isDemoPatientId(input.patientId);
	const receiptNumber =
		input.receiptNumber ||
		(isDemo
			? `ЧЕК-${now.getFullYear()}-${(input.visitId || "00001").replace(/-/g, "").slice(-5)}`
			: input.visitId
				? `СМЕТА-${input.visitId}`
				: "СМЕТА");

	const isDiaryFilled = Boolean(
		input.diary &&
			((typeof input.diary === "object" && "anamnesis" in input.diary && input.diary.anamnesis) ||
				("statusLocalis" in input.diary && input.diary.statusLocalis) ||
				("treatmentDescription" in input.diary && input.diary.treatmentDescription) ||
				("diagnosisIcd10" in input.diary && input.diary.diagnosisIcd10)),
	);

	return {
		visitId: input.visitId || input.appointmentId || "visit-default",
		invoiceId: input.invoiceId || "",
		receiptNumber,
		patientId: input.patientId,
		patientName: input.patientName || "Пациент",
		doctorName: input.doctorName || "Лечащий врач",
		totalGrossRub: totalGross,
		totalDiscountRub: totalDiscount,
		totalNetRub: totalNet,
		totalNetKop,
		items: itemsWithDiscount,
		status,
		statusBannerText,
		sbpQrUrl: "",
		sbpQrPayload: "",
		form043uSaved: input.form043uSaved ?? false,
		emkSaved: input.emkSaved ?? false,
		medicalCardSaved: input.medicalCardSaved ?? false,
		completedAtIso: now.toISOString(),
		isAbortedOrRescheduled: isAborted || undefined,
		interruptionReason: input.interruptionReason,
		rescheduledDateIso: input.rescheduledDateIso,
	};
}
