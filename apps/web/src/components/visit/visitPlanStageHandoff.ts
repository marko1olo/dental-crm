/**
 * apps/web/src/components/visit/visitPlanStageHandoff.ts
 *
 * DENTE Dental CRM — Targeted Treatment Plan Stage Handoff Engine.
 *
 * Handles extracting stage targeting from activeAppointment (stageNumber, stageId,
 * stageTitle, services, comment tags) and filtering loadedTreatmentPlan items
 * so that only the designated stage procedures are transferred into the active visit
 * invoice and medical diary (Mandates 8e, 8i, 8n).
 */

import { kopecksToRubles, rublesToKopecks } from "@dental/shared";

export interface PlanStageItem {
	id?: string | undefined;
	toothNumber?: number | string | null | undefined;
	toothCode?: string | number | null | undefined;
	name?: string | undefined;
	title?: string | undefined;
	nameRu?: string | undefined;
	medicalTitleRu?: string | undefined;
	patientFriendlyTitleRu?: string | undefined;
	code804n?: string | undefined;
	priceId?: string | undefined;
	serviceCode?: string | undefined;
	quantity?: number | undefined;
	unitPriceRub?: number | undefined;
	unitPriceKopecks?: number | undefined;
	price?: number | undefined;
	priceRub?: number | undefined;
	priceKopecks?: number | undefined;
	discountRub?: number | undefined;
	discountKopecks?: number | undefined;
	discount?: number | undefined;
	discountPercent?: number | undefined;
	phase?: number | undefined;
	stageNumber?: number | undefined;
	stageTitle?: string | undefined;
	status?: string | undefined;
	planStatus?: string | undefined;
	isCompleted?: boolean | undefined;
	[key: string]: unknown;
}

export interface AppointmentStageTargeting {
	treatmentPlanId: string | null;
	stageId: string | null;
	stageNumber: number | null;
	stageTitle: string | null;
	services: PlanStageItem[];
	durationMinutes: number | null;
}

export interface PlanStageOption {
	stageNumber: number;
	stageId?: string | undefined;
	title: string;
	subtitle?: string | undefined;
	items: PlanStageItem[];
	totalPriceKopecks: number;
	totalPriceRub: number;
	servicesCount: number;
	isCurrentTarget?: boolean | undefined;
	status?: "planned" | "in_progress" | "completed" | undefined;
	isCompleted?: boolean | undefined;
}

export interface TreatmentPlanStageLike {
	stageNumber?: number | undefined;
	title?: string | undefined;
	titleRu?: string | undefined;
	name?: string | undefined;
	items?: readonly PlanStageItem[] | PlanStageItem[] | undefined;
	[key: string]: unknown;
}

export interface TreatmentPlanLike {
	id?: string | undefined;
	name?: string | undefined;
	title?: string | undefined;
	status?: string | undefined;
	items?: readonly PlanStageItem[] | PlanStageItem[] | undefined;
	stages?: readonly TreatmentPlanStageLike[] | TreatmentPlanStageLike[] | undefined;
	[key: string]: unknown;
}

export interface AppointmentStageLike {
	treatmentPlanId?: string | null | undefined;
	planId?: string | null | undefined;
	stageNumber?: number | string | null | undefined;
	stageId?: string | number | null | undefined;
	stageTitle?: string | null | undefined;
	comment?: string | null | undefined;
	services?: PlanStageItem[] | unknown[] | undefined;
	items?: PlanStageItem[] | unknown[] | undefined;
	invoice_items?: PlanStageItem[] | unknown[] | undefined;
	invoiceItems?: PlanStageItem[] | unknown[] | undefined;
	completedServices?: PlanStageItem[] | unknown[] | undefined;
	procedures?: PlanStageItem[] | unknown[] | undefined;
	durationMinutes?: number | null | undefined;
	estimatedDurationMinutes?: number | null | undefined;
	[key: string]: unknown;
}

/**
 * Extracts stage targeting metadata from an appointment object.
 * Checks direct properties, stage id prefixes, and structured comment tags.
 */
export function extractAppointmentStageInfo(appointment: AppointmentStageLike | null | undefined): AppointmentStageTargeting {
	if (!appointment) {
		return {
			treatmentPlanId: null,
			stageId: null,
			stageNumber: null,
			stageTitle: null,
			services: [],
			durationMinutes: null,
		};
	}

	let treatmentPlanId: string | null =
		(typeof appointment.treatmentPlanId === "string" ? appointment.treatmentPlanId : null) ||
		(typeof appointment.planId === "string" ? appointment.planId : null);

	// Extract stageNumber
	let stageNumber: number | null = null;
	if (typeof appointment.stageNumber === "number" && !Number.isNaN(appointment.stageNumber)) {
		stageNumber = appointment.stageNumber;
	} else if (typeof appointment.stageNumber === "string" && /^\d+$/.test(appointment.stageNumber)) {
		stageNumber = Number.parseInt(appointment.stageNumber, 10);
	}

	// Extract stageId
	let stageId: string | null = appointment.stageId ? String(appointment.stageId) : null;
	if (!stageNumber && stageId) {
		const match = stageId.match(/(?:stage_)?(\d+)/i);
		if (match && match[1]) {
			stageNumber = Number.parseInt(match[1], 10);
		}
	}

	// Extract stageTitle
	let stageTitle: string | null = appointment.stageTitle || null;

	// Fallback to structured comments like:
	// "[План лечения: PLAN-101 | Терапевтическая санация] [Этап: stage_2_therapy]"
	// or "[Этап: 2]" or "[Этап 2: Хирургический этап]"
	const comment: string = String(appointment.comment || "");
	if (comment) {
		if (!treatmentPlanId) {
			const planMatch = comment.match(/\[План лечения:\s*([^\]|]+)/i);
			if (planMatch && planMatch[1]) {
				const parsedPlanId = planMatch[1].trim();
				if (parsedPlanId) {
					treatmentPlanId = parsedPlanId;
				}
			}
		}

		if (!stageNumber) {
			const stageNumMatch = comment.match(/\[Этап:?\s*(?:stage_)?(\d+)/i) || comment.match(/\[Этап\s*(\d+)/i);
			if (stageNumMatch && stageNumMatch[1]) {
				stageNumber = Number.parseInt(stageNumMatch[1], 10);
			}
		}

		if (!stageId) {
			const stageIdMatch = comment.match(/\[Этап:\s*([^\]]+)\]/i);
			if (stageIdMatch && stageIdMatch[1]) {
				stageId = stageIdMatch[1].trim();
			}
		}

		if (!stageTitle) {
			const titleMatch = comment.match(/\[План лечения:[^\]|]*\|\s*([^\]]+)\]/i);
			if (titleMatch && titleMatch[1]) {
				stageTitle = titleMatch[1].trim();
			}
		}
	}

	// Extract services attached to appointment
	const rawServices = Array.isArray(appointment.services) && appointment.services.length > 0
		? appointment.services
		: Array.isArray(appointment.items) && appointment.items.length > 0
			? appointment.items
			: Array.isArray(appointment.invoice_items) && appointment.invoice_items.length > 0
				? appointment.invoice_items
				: Array.isArray(appointment.invoiceItems) && appointment.invoiceItems.length > 0
					? appointment.invoiceItems
					: Array.isArray(appointment.completedServices) && appointment.completedServices.length > 0
						? appointment.completedServices
						: Array.isArray(appointment.procedures) && appointment.procedures.length > 0
							? appointment.procedures
							: [];

	const services: PlanStageItem[] = rawServices as PlanStageItem[];

	const durationMinutes: number | null =
		typeof appointment.durationMinutes === "number"
			? appointment.durationMinutes
			: typeof appointment.estimatedDurationMinutes === "number"
				? appointment.estimatedDurationMinutes
				: null;

	return {
		treatmentPlanId,
		stageId,
		stageNumber,
		stageTitle,
		services,
		durationMinutes,
	};
}

/**
 * Standard clinical titles for stages by number if custom name is absent.
 */
export function getStandardStageTitle(stageNumber: number): string {
	switch (stageNumber) {
		case 1:
			return "Неотложная помощь и терапия";
		case 2:
			return "Хирургический этап и санация";
		case 3:
			return "Ортопедический этап";
		case 4:
			return "Ортодонтия и эстетика";
		case 5:
			return "Диспансерный контроль и гигиена";
		default:
			return `Этап ${stageNumber}`;
	}
}

export function resolvePlanStageItemKopecks(it: PlanStageItem): {
	unitPriceKopecks: number;
	discountKopecks: number;
	netTotalKopecks: number;
	quantity: number;
} {
	const quantity = Math.max(1, Math.round(Number(it.quantity || 1)));
	const unitPriceKopecks =
		typeof it.unitPriceKopecks === "number" && Number.isFinite(it.unitPriceKopecks)
			? Math.round(it.unitPriceKopecks)
			: typeof it.priceKopecks === "number" && Number.isFinite(it.priceKopecks)
				? Math.round(it.priceKopecks)
				: rublesToKopecks(Number(it.unitPriceRub ?? it.price ?? it.priceRub ?? 0));
	const discountKopecks =
		typeof it.discountKopecks === "number" && Number.isFinite(it.discountKopecks)
			? Math.round(it.discountKopecks)
			: rublesToKopecks(Number(it.discountRub ?? it.discount ?? 0));
	const netTotalKopecks = Math.max(0, unitPriceKopecks * quantity - discountKopecks);
	return { unitPriceKopecks, discountKopecks, netTotalKopecks, quantity };
}

/**
 * Groups and categorizes treatment plan items by stage.
 * Incorporates target stage information from the active appointment.
 */
export function groupTreatmentPlanByStages(
	loadedPlan: TreatmentPlanLike | null | undefined,
	targetStageInfo?: AppointmentStageTargeting | null,
): {
	stages: PlanStageOption[];
	allPlanItems: PlanStageItem[];
	hasMultipleStages: boolean;
	totalPlanPriceKopecks: number;
	totalPlanPriceRub: number;
} {
	let allPlanItems: PlanStageItem[] = [];
	if (Array.isArray(loadedPlan?.items) && loadedPlan.items.length > 0) {
		allPlanItems = loadedPlan.items;
	} else if (Array.isArray(loadedPlan?.stages)) {
		allPlanItems = loadedPlan.stages.flatMap((st: TreatmentPlanStageLike, sIdx: number) => {
			const sNum = typeof st.stageNumber === "number" ? st.stageNumber : sIdx + 1;
			return (st.items || []).map((it: PlanStageItem) => ({
				...it,
				stageNumber: typeof it.stageNumber === "number" ? it.stageNumber : sNum,
				stageTitle: it.stageTitle || st.title || st.titleRu || st.name,
			}));
		});
	}

	if (!loadedPlan || allPlanItems.length === 0) {
		return {
			stages: [],
			allPlanItems: [],
			hasMultipleStages: false,
			totalPlanPriceKopecks: 0,
			totalPlanPriceRub: 0,
		};
	}
	const totalPlanPriceKopecks = allPlanItems.reduce(
		(sum, it) => sum + resolvePlanStageItemKopecks(it).netTotalKopecks,
		0,
	);
	const totalPlanPriceRub = kopecksToRubles(totalPlanPriceKopecks);

	// Collect unique phase numbers from items
	const phasesSet = new Set<number>();
	for (const it of allPlanItems) {
		const ph = typeof it.phase === "number" && it.phase > 0
			? it.phase
			: typeof it.stageNumber === "number" && it.stageNumber > 0
				? it.stageNumber
				: 1;
		phasesSet.add(ph);
	}

	// Also ensure target stage number from appointment is recognized if set
	if (targetStageInfo?.stageNumber && targetStageInfo.stageNumber > 0) {
		phasesSet.add(targetStageInfo.stageNumber);
	}

	const sortedPhases = Array.from(phasesSet).sort((a, b) => a - b);
	const hasMultipleStages = sortedPhases.length > 1;

	const stages: PlanStageOption[] = sortedPhases.map((phaseNum) => {
		// Filter items for this phase
		let phaseItems = allPlanItems.filter((it) => {
			const ph = typeof it.phase === "number" && it.phase > 0
				? it.phase
				: typeof it.stageNumber === "number" && it.stageNumber > 0
					? it.stageNumber
					: 1;
			return ph === phaseNum;
		});

		// If no items in plan for this phase, but appointment specifically brought services
		if (phaseItems.length === 0 && targetStageInfo?.stageNumber === phaseNum && targetStageInfo.services.length > 0) {
			phaseItems = targetStageInfo.services;
		}

		// Calculate total for phase in integer kopecks
		const totalPriceKopecks = phaseItems.reduce(
			(sum, it) => sum + resolvePlanStageItemKopecks(it).netTotalKopecks,
			0,
		);
		const totalPriceRub = kopecksToRubles(totalPriceKopecks);

		const isCurrentTarget = Boolean(targetStageInfo?.stageNumber === phaseNum);

		const isCompleted =
			phaseItems.length > 0 &&
			phaseItems.every((it) => Boolean(it.isCompleted || it.status === "completed" || it.planStatus === "completed"));
		const isInProgress =
			!isCompleted &&
			phaseItems.some((it) => Boolean(it.isCompleted || it.status === "completed" || it.status === "in_progress"));
		const stageStatus: "planned" | "in_progress" | "completed" = isCompleted
			? "completed"
			: isInProgress
				? "in_progress"
				: "planned";

		let title = "";
		if (isCurrentTarget && targetStageInfo?.stageTitle) {
			title = targetStageInfo.stageTitle;
		} else {
			// Try to find stage name in loadedPlan.stages if present
			const planStageObj = Array.isArray(loadedPlan.stages)
				? loadedPlan.stages.find((s: TreatmentPlanStageLike) => s.stageNumber === phaseNum)
				: null;
			const foundTitle = planStageObj?.titleRu || planStageObj?.title || planStageObj?.name;
			title = typeof foundTitle === "string" ? foundTitle : getStandardStageTitle(phaseNum);
		}

		return {
			stageNumber: phaseNum,
			title,
			items: phaseItems,
			totalPriceKopecks,
			totalPriceRub,
			servicesCount: phaseItems.length,
			isCurrentTarget,
			status: stageStatus,
			isCompleted,
		};
	});

	return {
		stages,
		allPlanItems,
		hasMultipleStages,
		totalPlanPriceKopecks,
		totalPlanPriceRub,
	};
}

export interface FormattedStageBillingItem {
	code804n: string;
	title: string;
	toothNumber?: number | undefined;
	toothCode?: string | undefined;
	quantity: number;
	unitPriceKopecks: number;
	unitPriceRub: number;
	discountKopecks: number;
	discountRub: number;
	discountPercent?: number | undefined;
}

/**
 * Transforms stage item to canonical billing item detail
 */
export function formatStageItemForBilling(it: PlanStageItem): FormattedStageBillingItem {
	const toothNum =
		typeof it.toothNumber === "number" && !Number.isNaN(it.toothNumber)
			? it.toothNumber
			: typeof it.toothNumber === "string" && /^\d+$/.test(it.toothNumber)
				? Number.parseInt(it.toothNumber, 10)
				: typeof it.toothCode === "string" && /^\d+$/.test(it.toothCode)
					? Number.parseInt(it.toothCode, 10)
					: undefined;
	const toothCandidate = toothNum !== undefined ? String(toothNum) : (it.toothCode ? String(it.toothCode) : undefined);
	const { unitPriceKopecks, discountKopecks, quantity } = resolvePlanStageItemKopecks(it);
	const priceVal = kopecksToRubles(unitPriceKopecks);
	const discountVal = kopecksToRubles(discountKopecks);
	const discountPercent = Number(
		it.discountPercent ??
			(unitPriceKopecks > 0 && discountKopecks > 0
				? Math.round((discountKopecks / (unitPriceKopecks * quantity)) * 100)
				: 0),
	);

	const codeCandidate = it.code804n || it.priceId || it.serviceCode;
	const titleCandidate = it.name || it.title || it.nameRu || it.medicalTitleRu || it.patientFriendlyTitleRu;

	return {
		code804n: typeof codeCandidate === "string" ? codeCandidate : "A16.07.001",
		title: typeof titleCandidate === "string" ? titleCandidate : "Услуга плана лечения",
		...(toothNum !== undefined ? { toothNumber: toothNum } : {}),
		...(toothCandidate ? { toothCode: toothCandidate } : {}),
		quantity,
		unitPriceKopecks,
		unitPriceRub: priceVal,
		discountKopecks,
		discountRub: discountVal,
		...(discountPercent > 0 ? { discountPercent } : {}),
	};
}

/**
 * Builds structured medical diary text from stage items
 */
export function buildStageMedicalDiaryText(stageTitle: string, stageItems: readonly PlanStageItem[]): string {
	const descriptions = stageItems.map((it) => {
		const tooth = it.toothNumber || it.toothCode ? ` (зуб #${it.toothNumber || it.toothCode})` : "";
		const name = it.name || it.title || it.nameRu || it.medicalTitleRu || it.patientFriendlyTitleRu || it.priceId || "Услуга";
		return `${name}${tooth}`;
	});

	return `[${stageTitle}]: ${descriptions.join(", ")}`;
}
