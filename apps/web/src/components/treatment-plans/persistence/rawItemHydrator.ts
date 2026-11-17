import { type Kopecks, kopecksToRubles } from "@dental/shared";
import type { TreatmentPlanItem } from "../types/index.js";
import { type CatalogServiceLookupItem, planLineTotalKopecks } from "../treatmentPlanPricingEngine.js";
import { classifyPlanItemCategoryAndStageKind } from "./stageKindClassifier.js";

export interface RawTreatmentPlanItemDto {
	readonly id?: string | number | undefined;
	readonly toothNumber?: number | string | null | undefined;
	readonly priceId?: string | null | undefined;
	readonly serviceCode?: string | null | undefined;
	readonly code804n?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly quantity?: number | string | undefined;
	readonly price?: number | string | undefined;
	readonly unitPriceRub?: number | string | undefined;
	readonly discount?: number | string | undefined;
	readonly discountRub?: number | string | undefined;
	readonly phase?: number | string | undefined;
	readonly isAuto?: boolean | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly status?: string | undefined;
	readonly planStatus?: string | undefined;
	readonly isCompleted?: boolean | undefined;
	readonly visitId?: string | null | undefined;
	readonly completedAtIso?: string | null | undefined;
	readonly updatedAt?: string | null | undefined;
}

export function hydrateRawPlanItem(
	raw: RawTreatmentPlanItemDto,
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
	const netRub = kopecksToRubles(netKopecks);

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
