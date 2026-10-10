/**
 * DENTE Dental CRM — Pure Calculation & Mapping Helpers for Invoices (Feature #41).
 *
 * Preserves 100% verbatim price lock, discount mode, OMS Decree 659, and kopeck math.
 */

import type {
	CatalogServiceLookup,
	PlanItemForValidation,
	PlanToInvoiceValidationPayload,
	PriceLockResolutionPolicy,
	validatePlanToInvoice,
} from "@dental/shared";
import type {
	CatalogRow,
	GenerateInvoiceFromPlanBody,
	GenerateInvoiceItemInput,
	PatientRow,
	PriceFreezeTokenResult,
	TreatmentPlanItemRow,
	TreatmentPlanRow,
	ValidatePlanBody,
} from "./types.js";

export function mapCatalogRowsToLookup(catalogRows: CatalogRow[]): CatalogServiceLookup[] {
	return catalogRows.map((c) => ({
		id: c.id,
		code804n: c.code,
		title: c.title,
		category: c.category,
		basePriceKopecks: Math.round(Number(c.basePriceRub || 0) * 100),
		active: c.active !== false,
		isArchived: c.active === false,
		decree458Expensive: false,
		uetAdult: 1.0,
	}));
}

export function buildValidatePlanPayload(
	parsedData: ValidatePlanBody,
	catalogLookup: CatalogServiceLookup[],
	freezeTokenForValidation: PriceFreezeTokenResult,
): PlanToInvoiceValidationPayload {
	return {
		planId: parsedData.planId,
		planNumber: parsedData.planNumber,
		planTitle: parsedData.planTitle,
		patientId: parsedData.patientId,
		patientName: parsedData.patientName,
		doctorId: parsedData.doctorId,
		doctorFullName: parsedData.doctorFullName,
		planCreatedAtIso: parsedData.planCreatedAtIso,
		approvedAtIso: parsedData.approvedAtIso,
		isSignedWithPatient: parsedData.isSignedWithPatient,
		isPriceLocked: freezeTokenForValidation
			? freezeTokenForValidation.isPriceLocked
			: undefined,
		isPlanExpired: freezeTokenForValidation?.isExpired,
		validityDaysLimit: parsedData.validityDaysLimit ?? freezeTokenForValidation?.daysRemaining,
		inflationThresholdPercent:
			parsedData.inflationThresholdPercent ?? freezeTokenForValidation?.inflationThresholdPercent,
		items: parsedData.items.map((it) => ({
			itemId: it.itemId,
			code804n: it.code804n,
			nameRu: it.nameRu,
			categoryRu: it.categoryRu || "Терапия",
			quantity: it.quantity,
			planUnitPriceKopecks: it.planUnitPriceKopecks,
			planDiscountKopecks: it.planDiscountKopecks || 0,
			toothNumber:
				it.toothNumber !== undefined && it.toothNumber !== null
					? Number(it.toothNumber) || null
					: it.tooth_number !== undefined && it.tooth_number !== null
						? Number(it.tooth_number) || null
						: null,
			surfaces: it.surfaces || [],
			...(it.serviceId !== undefined ? { serviceId: it.serviceId } : {}),
			...(it.stageId !== undefined ? { stageId: it.stageId } : {}),
			...(it.stageTitleRu !== undefined ? { stageTitleRu: it.stageTitleRu } : {}),
		})),
		catalog: catalogLookup,
		itemResolutionOverrides: parsedData.itemResolutionOverrides as
			| Record<string, PriceLockResolutionPolicy>
			| undefined,
		itemAnalogueSelections: parsedData.itemAnalogueSelections,
		adminOverrideAuthorized: parsedData.adminOverrideAuthorized,
		adminOverrideStaffName: parsedData.adminOverrideStaffName,
		adminOverrideReason: parsedData.adminOverrideReason,
	};
}

export function evaluateOmsCompliance(
	data: GenerateInvoiceFromPlanBody,
	patient: PatientRow,
): { isOmsInvoice: boolean; isAnonPatient: boolean; hasValidOmsIdentity: boolean } {
	const isOmsInvoice =
		data.items.some(
			(it) =>
				(it.categoryRu &&
					(it.categoryRu.toLowerCase().includes("омс") ||
						it.categoryRu.toLowerCase().includes("oms"))) ||
				(it.nameRu &&
					(it.nameRu.toLowerCase().includes("омс") ||
						it.nameRu.toLowerCase().includes("oms"))) ||
				(it.code804n &&
					(it.code804n.toLowerCase().includes("омс") ||
						it.code804n.toLowerCase().includes("oms"))),
		) ||
		Boolean(
			data.notes &&
				(data.notes.toLowerCase().includes("омс") ||
					data.notes.toLowerCase().includes("oms")),
		);

	const adminProfile = (patient.administrativeProfile || {}) as Record<string, unknown>;
	const isAnonPatient =
		Boolean((patient as unknown as { isAnonymous?: boolean }).isAnonymous) ||
		Boolean(patient.fullName?.startsWith("UUID_ANON")) ||
		Boolean(patient.fullName?.toLowerCase().includes("аноним")) ||
		adminProfile["isAnonymous"] === true;

	const policyRaw =
		typeof adminProfile["insurancePolicyNumber"] === "string"
			? adminProfile["insurancePolicyNumber"].trim().replace(/\D/g, "")
			: "";
	const hasValidOmsIdentity = Boolean(
		adminProfile["identityDocument"] &&
			adminProfile["snils"] &&
			policyRaw.length === 16,
	);

	return { isOmsInvoice, isAnonPatient, hasValidOmsIdentity };
}

export function isServiceApprovedInPlanItems(
	item: GenerateInvoiceItemInput,
	planItems: Array<{ priceId: string | null }>,
): boolean {
	const itemServiceId = item.serviceId || item.analogueServiceId;
	return planItems.some((pi) => {
		if (!pi.priceId) return false;
		if (
			itemServiceId &&
			(pi.priceId === itemServiceId ||
				pi.priceId.startsWith(`${itemServiceId}::`))
		)
			return true;
		if (item.nameRu && pi.priceId.includes(item.nameRu)) return true;
		return false;
	});
}

export function findDiscountLimitViolation(
	items: GenerateInvoiceItemInput[],
	catalogRows: CatalogRow[],
	targetPlanDbItems: TreatmentPlanItemRow[],
): { nameRu: string; discountRub: number; lineGrossRub: number } | null {
	for (const it of items) {
		const matchingCatalog = catalogRows.find(
			(c) =>
				(it.serviceId && c.id === it.serviceId) ||
				(it.code804n && c.code === it.code804n) ||
				c.title.toLowerCase() === it.nameRu.toLowerCase(),
		);
		const matchingDbPlanItem = targetPlanDbItems.find(
			(pi) => pi.id === it.itemId || pi.priceId === it.serviceId,
		);
		const effectivePriceRub =
			it.effectiveUnitPriceRub ??
			it.planUnitPriceRub ??
			(matchingDbPlanItem ? Number(matchingDbPlanItem.price || 0) : undefined) ??
			it.unitPriceRub ??
			Number(matchingCatalog?.basePriceRub ?? 0);
		const lineGrossRub = Number((effectivePriceRub * it.quantity).toFixed(2));
		if (it.discountRub !== undefined && it.discountRub > lineGrossRub) {
			return {
				nameRu: it.nameRu,
				discountRub: it.discountRub,
				lineGrossRub,
			};
		}
	}
	return null;
}

export function buildPlanItemsForValidation(params: {
	items: GenerateInvoiceItemInput[];
	catalogRows: CatalogRow[];
	freezeToken: PriceFreezeTokenResult;
	targetPlanDbItems: TreatmentPlanItemRow[];
	targetPlan: TreatmentPlanRow | null;
	isPriceLockedFinal: boolean;
	isAdminOverrideVerified: boolean;
}): PlanItemForValidation[] {
	const {
		items,
		catalogRows,
		freezeToken,
		targetPlanDbItems,
		targetPlan,
		isPriceLockedFinal,
		isAdminOverrideVerified,
	} = params;

	return items.map((it, idx) => {
		const matchingCatalog = catalogRows.find(
			(c) =>
				(it.serviceId && c.id === it.serviceId) ||
				(it.code804n && c.code === it.code804n),
		);

		const itemServiceId = it.serviceId || it.analogueServiceId;
		const frozenItem = freezeToken?.frozenPrices?.find((fp) => {
			if (itemServiceId && fp.serviceId === itemServiceId) return true;
			if (it.nameRu && fp.title === it.nameRu) return true;
			if (it.code804n && fp.code804n === it.code804n) return true;
			return false;
		});

		const resolvedToothNumber =
			it.toothNumber !== undefined && it.toothNumber !== null
				? Number(it.toothNumber) || null
				: it.tooth_number !== undefined && it.tooth_number !== null
					? Number(it.tooth_number) || null
					: null;

		const matchingDbPlanItem = targetPlanDbItems.find((pi) => {
			if (it.serviceId && pi.priceId?.startsWith(it.serviceId)) return true;
			if (it.nameRu && pi.priceId?.includes(it.nameRu)) return true;
			if (resolvedToothNumber !== null && pi.toothNumber === resolvedToothNumber) return true;
			return false;
		});

		// Если действует активный токен фиксации цен (Price Freeze Token) или утвержденная твердая смета:
		// гарантируется договорная цена сметы (поглощение дельты клиникой)
		let planPriceRub: number;
		let effectivePriceRub: number;

		if (freezeToken?.isPriceLocked && frozenItem) {
			planPriceRub = frozenItem.lockedUnitPriceRub;
			effectivePriceRub = frozenItem.lockedUnitPriceRub;
		} else if (isPriceLockedFinal && matchingDbPlanItem) {
			// Твердая смета утвержденного плана: фиксируем цену из плана
			const planItemPrice = Number(matchingDbPlanItem.price || 0);
			const planQty = Number(matchingDbPlanItem.quantity || 1);

			// Если передан явный оверрайд цены (например, обнуление цены 0.00 ₽)
			if (
				(it.effectiveUnitPriceRub !== undefined && it.effectiveUnitPriceRub === 0) ||
				(it.planUnitPriceRub !== undefined && it.planUnitPriceRub === 0)
			) {
				planPriceRub = 0;
				effectivePriceRub = 0;
			} else if (it.quantity > planQty && !isAdminOverrideVerified) {
				planPriceRub = Number(((planItemPrice * planQty) / it.quantity).toFixed(2));
				effectivePriceRub = planPriceRub;
			} else {
				planPriceRub = planItemPrice;
				effectivePriceRub = planPriceRub;
			}
		} else {
			planPriceRub =
				it.planUnitPriceRub ??
				(matchingDbPlanItem ? Number(matchingDbPlanItem.price || 0) : undefined) ??
				it.unitPriceRub ??
				Number(matchingCatalog?.basePriceRub ?? 0);
			effectivePriceRub =
				it.effectiveUnitPriceRub ??
				it.planUnitPriceRub ??
				it.unitPriceRub ??
				Number(matchingCatalog?.basePriceRub ?? 0);
		}

		// Расчет скидки согласно режиму скидок плана (none | plan_fixed | on_selection)
		let discountRub = it.discountRub ?? 0;
		const discountMode = targetPlan?.discountMode ?? "plan_fixed";
		if (discountMode === "none") {
			// Скидки не действуют (IDENT parity)
			discountRub = 0;
		} else if (discountMode === "plan_fixed") {
			if (it.discountRub !== undefined && it.discountRub > 0) {
				discountRub = it.discountRub;
			} else if (frozenItem && frozenItem.lockedDiscountRub > 0) {
				// lockedDiscountRub хранится за единицу услуги -> умножаем на количество
				discountRub = Number((frozenItem.lockedDiscountRub * it.quantity).toFixed(2));
			} else if (matchingDbPlanItem && Number(matchingDbPlanItem.discount || 0) > 0) {
				// discount в treatmentPlanItemsNew хранится за единицу услуги -> умножаем на количество
				discountRub = Number((Number(matchingDbPlanItem.discount) * it.quantity).toFixed(2));
			} else if (Number(targetPlan?.planDiscountPercent ?? 0) > 0) {
				const lineGross = effectivePriceRub * it.quantity;
				discountRub = Number(
					((lineGross * Number(targetPlan?.planDiscountPercent)) / 100).toFixed(2),
				);
			}
		} else if (discountMode === "on_selection") {
			// Скидка при выборе в наряд
			const patientDiscountPercent = Number(
				targetPlan?.planDiscountPercent ?? 0,
			);
			if (patientDiscountPercent > 0) {
				const lineGross = effectivePriceRub * it.quantity;
				discountRub = Number(
					((lineGross * patientDiscountPercent) / 100).toFixed(2),
				);
			}
		}

		return {
			itemId: it.itemId || it.serviceId || `item-${idx + 1}`,
			toothNumber: resolvedToothNumber,
			surfaces: it.surfaces || [],
			code804n: it.code804n || matchingCatalog?.code || "A16.07.001",
			nameRu: it.nameRu,
			categoryRu:
				it.categoryRu || matchingCatalog?.category || "Терапия",
			quantity: it.quantity,
			planUnitPriceKopecks: Math.round(planPriceRub * 100),
			planDiscountKopecks: Math.round(discountRub * 100),
			...(it.analogueServiceId || it.serviceId
				? { serviceId: it.analogueServiceId || it.serviceId }
				: {}),
		};
	});
}

export function buildEffectiveItemResolutionOverrides(
	items: GenerateInvoiceItemInput[],
): Record<string, PriceLockResolutionPolicy> {
	const effectiveItemResolutionOverrides: Record<string, PriceLockResolutionPolicy> = {};
	items.forEach((it, idx) => {
		const itId = it.itemId || it.serviceId || `item-${idx + 1}`;
		if (it.resolutionPolicy) {
			effectiveItemResolutionOverrides[itId] = it.resolutionPolicy as PriceLockResolutionPolicy;
		}
	});
	return effectiveItemResolutionOverrides;
}

export function formatInvoiceNumber(
	documentType: GenerateInvoiceFromPlanBody["documentType"],
	patientId: string,
): string {
	const timestamp = Date.now().toString().slice(-6);
	const prefix =
		documentType === "work_order"
			? "НРД"
			: documentType === "completed_act"
				? "АКТ"
				: "СЧТ";
	return `${prefix}-${patientId.slice(0, 4).toUpperCase()}-${timestamp}`;
}

export function buildTreatmentItemsToInsert(params: {
	validationReportItems: ReturnType<typeof validatePlanToInvoice>["items"];
	reqItems: GenerateInvoiceItemInput[];
	catalogRows: CatalogRow[];
	targetPlanDbItems: TreatmentPlanItemRow[];
	orgId: string;
	patientId: string;
	doctorUserId: string | undefined;
	invoiceNumber: string;
}) {
	const {
		validationReportItems,
		reqItems,
		catalogRows,
		targetPlanDbItems,
		orgId,
		patientId,
		doctorUserId,
		invoiceNumber,
	} = params;

	return validationReportItems.map((it, idx) => {
		const matchingCatalog = catalogRows.find(
			(c) => c.code === it.code804n || c.id === it.suggested804nAnalogue?.serviceId,
		);
		const reqItem = reqItems[idx];
		const matchingDbPlanItem = targetPlanDbItems.find((pi) => {
			if (reqItem?.serviceId && pi.priceId?.startsWith(reqItem.serviceId)) return true;
			if (it.nameRu && pi.priceId?.includes(it.nameRu)) return true;
			if (
				it.toothNumber !== null &&
				it.toothNumber !== undefined &&
				pi.toothNumber === it.toothNumber
			)
				return true;
			return false;
		});
		const plannedDoctor =
			reqItem?.doctorId || matchingDbPlanItem?.doctorId || doctorUserId || null;
		return {
			organizationId: orgId,
			patientId,
			serviceId: matchingCatalog?.id ?? null,
			toothCode: it.toothNumber ? String(it.toothNumber) : null,
			title: it.nameRu,
			quantity: String(it.quantity),
			unitPriceRub: Number((it.effectiveUnitPriceKopecks / 100).toFixed(2)),
			priceRub: Number((it.effectiveLineNetKopecks / 100).toFixed(2)),
			discountRub: Number((it.effectiveDiscountKopecks / 100).toFixed(2)),
			status: "proposed" as const,
			plannedDoctorUserId: plannedDoctor,
			notes: `Наряд ${invoiceNumber}. Политика: ${it.selectedResolution}${
				it.clinicAbsorptionKopecks > 0
					? ` (Абсорбция клиники: ${(it.clinicAbsorptionKopecks / 100).toFixed(2)} ₽)`
					: ""
			}`,
		};
	});
}
