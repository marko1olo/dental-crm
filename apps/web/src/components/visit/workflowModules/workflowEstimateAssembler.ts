import { roundToKopecks } from "../completedServicesPlan";
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
	const totalNetKop = Math.round(totalNet * 100);

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
	const year = now.getFullYear();
	const visitSeed = Math.abs(
		(input.visitId || input.patientId || "VISIT").split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
	);
	const randNum = 10000 + (visitSeed % 90000);
	const receiptNumber = `ЧЕК-${year}-${randNum}`;
	const invoiceId = `INV-${year}-${randNum}`;

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

	const sbpQrUrl =
		isAborted && totalNet === 0
			? ""
			: `https://qr.nspk.ru/AD1000${randNum}?type=02&bank=100000000007&sum=${totalNetKop}&cur=RUB&crc=8192`;

	return {
		visitId: input.visitId || input.appointmentId || "visit-default",
		invoiceId,
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
		sbpQrUrl,
		sbpQrPayload: sbpQrUrl,
		form043uSaved: true,
		completedAtIso: now.toISOString(),
		isAbortedOrRescheduled: isAborted || undefined,
		interruptionReason: input.interruptionReason,
		rescheduledDateIso: input.rescheduledDateIso,
	};
}
