import type { Kopecks } from "@dental/shared";
import type { TreatmentPlanItem } from "../types.js";
import { type CatalogServiceLookupItem, planLineTotalKopecks } from "../treatmentPlanPricingEngine.js";
import { classifyPlanItemCategoryAndStageKind } from "./stageKindClassifier.js";

export function hydrateRawPlanItem(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	raw: any,
	idx: number,
	phaseNumber: number,
	catalog?: readonly CatalogServiceLookupItem[],
): TreatmentPlanItem {
	const rawPriceId = String(raw.priceId || raw.serviceCode || raw.code804n || "");
	const [cleanCode, explicitName] = rawPriceId.includes("::")
		? rawPriceId.split("::")
		: [rawPriceId, raw.name || ""];

	const serviceCode = raw.serviceCode || cleanCode || raw.code804n || "A16.07.001";
	const code804n = serviceCode;
	const name =
		raw.name ||
		explicitName ||
		catalog?.find((c) => c.id === raw.priceId || c.order804nCode === code804n)?.title ||
		"Медицинская услуга";

	const unitPriceRub = Number(raw.price ?? raw.unitPriceRub ?? 0);
	const quantity = Math.max(1, Number(raw.quantity) || 1);
	const discountRub = Number(raw.discount ?? raw.discountRub ?? 0);
	const toothNumber = raw.toothNumber ? Number(raw.toothNumber) : undefined;

	const { category, stageKind } = classifyPlanItemCategoryAndStageKind(name, code804n, phaseNumber);

	const netKopecks =
		planLineTotalKopecks({
			price: unitPriceRub,
			quantity,
			discount: discountRub,
		}) ?? (0 as Kopecks);
	const netRub = netKopecks / 100;

	const isCompleted = Boolean(
		raw.isCompleted || raw.status === "completed" || raw.planStatus === "completed",
	);

	return {
		id: String(raw.id || `item_${phaseNumber}_${idx}_${Date.now()}`),
		toothNumber,
		serviceCode,
		code804n,
		name,
		category,
		priceRub: netRub,
		unitPriceRub,
		discountRub,
		quantity,
		phase: phaseNumber,
		stageKind,
		priceId: cleanCode,
		fromCatalog: true,
		isAuto: Boolean(raw.isAuto),
		doctorId: raw.doctorId ?? null,
		doctorName: raw.doctorName ?? null,
		doctorSpecialty: raw.doctorSpecialty ?? null,
		isCompleted,
		status: isCompleted ? "completed" : (raw.status || "planned"),
		visitId: raw.visitId ?? null,
		completedAtIso: raw.completedAtIso ?? raw.updatedAt ?? null,
	};
}
