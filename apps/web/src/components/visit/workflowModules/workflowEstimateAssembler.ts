import { roundToKopecks } from "../completedServicesPlan";
import { rublesToKopecks } from "@dental/shared";
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
	const totalDiscount = roundToKopecks(totalGross * (discountPercent / 100));
	const totalNet = Math.max(0, roundToKopecks(totalGross - totalDiscount));
	const totalNetKop = rublesToKopecks(totalNet);

	const itemsWithDiscount = allItems.map((item) => {
		const itemGross = item.totalRub ?? item.priceRub * item.quantity;
		const itemDiscount = discountPercent > 0 ? roundToKopecks(itemGross * (discountPercent / 100)) : (item.discountRub ?? 0);
		return {
			...item,
			discountRub: itemDiscount,
			totalRub: Math.max(0, roundToKopecks(itemGross - itemDiscount)),
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
	const receiptNumber = input.receiptNumber || (input.visitId ? `СМЕТА-${input.visitId}` : "СМЕТА");

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
