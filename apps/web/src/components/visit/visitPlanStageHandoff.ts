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

export interface AppointmentStageTargeting {
	treatmentPlanId: string | null;
	stageId: string | null;
	stageNumber: number | null;
	stageTitle: string | null;
	services: any[];
	durationMinutes: number | null;
}

export interface PlanStageOption {
	stageNumber: number;
	stageId?: string;
	title: string;
	subtitle?: string;
	items: any[];
	totalPriceRub: number;
	servicesCount: number;
	isCurrentTarget?: boolean;
}

/**
 * Extracts stage targeting metadata from an appointment object.
 * Checks direct properties, stage id prefixes, and structured comment tags.
 */
export function extractAppointmentStageInfo(appointment: any | null | undefined): AppointmentStageTargeting {
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

	const treatmentPlanId: string | null =
		appointment.treatmentPlanId || appointment.planId || null;

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
				// treatmentPlanId from comment
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
	const services: any[] = Array.isArray(appointment.services) && appointment.services.length > 0
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

/**
 * Groups and categorizes treatment plan items by stage.
 * Incorporates target stage information from the active appointment.
 */
export function groupTreatmentPlanByStages(
	loadedPlan: any | null | undefined,
	targetStageInfo?: AppointmentStageTargeting | null,
): {
	stages: PlanStageOption[];
	allPlanItems: any[];
	hasMultipleStages: boolean;
	totalPlanPriceRub: number;
} {
	if (!loadedPlan || !Array.isArray(loadedPlan.items) || loadedPlan.items.length === 0) {
		return {
			stages: [],
			allPlanItems: [],
			hasMultipleStages: false,
			totalPlanPriceRub: 0,
		};
	}

	const allPlanItems: any[] = loadedPlan.items;
	const totalPlanPriceRub = allPlanItems.reduce((sum, it) => {
		const price = Number(it.unitPriceRub ?? it.price ?? it.priceRub ?? 0);
		const qty = Number(it.quantity || 1);
		const discount = Number(it.discountRub ?? it.discount ?? 0);
		return sum + Math.max(0, price * qty - discount);
	}, 0);

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

		// Calculate total for phase
		const totalPriceRub = phaseItems.reduce((sum, it) => {
			const price = Number(it.unitPriceRub ?? it.price ?? it.priceRub ?? 0);
			const qty = Number(it.quantity || 1);
			const discount = Number(it.discountRub ?? it.discount ?? 0);
			return sum + Math.max(0, price * qty - discount);
		}, 0);

		const isCurrentTarget = Boolean(targetStageInfo?.stageNumber === phaseNum);

		let title = "";
		if (isCurrentTarget && targetStageInfo?.stageTitle) {
			title = targetStageInfo.stageTitle;
		} else {
			// Try to find stage name in loadedPlan.stages if present
			const planStageObj = Array.isArray(loadedPlan.stages)
				? loadedPlan.stages.find((s: any) => s.stageNumber === phaseNum)
				: null;
			title = planStageObj?.titleRu || planStageObj?.title || planStageObj?.name || getStandardStageTitle(phaseNum);
		}

		return {
			stageNumber: phaseNum,
			title,
			items: phaseItems,
			totalPriceRub,
			servicesCount: phaseItems.length,
			isCurrentTarget,
		};
	});

	return {
		stages,
		allPlanItems,
		hasMultipleStages,
		totalPlanPriceRub,
	};
}

/**
 * Transforms stage item to canonical 804n billing item detail
 */
export function formatStageItemForBilling(it: any): {
	code804n: string;
	title: string;
	toothCode?: string | undefined;
	quantity: number;
	unitPriceRub: number;
	discountRub: number;
} {
	const toothCandidate = it.toothNumber ? String(it.toothNumber) : (it.toothCode ? String(it.toothCode) : undefined);
	const priceVal = Number(it.unitPriceRub ?? it.price ?? it.priceRub ?? 0);
	const discountVal = Number(it.discountRub ?? it.discount ?? 0);

	return {
		code804n: it.code804n || it.priceId || "A16.07.001",
		title: it.name || it.title || it.medicalTitleRu || it.patientFriendlyTitleRu || "Услуга плана лечения",
		...(toothCandidate ? { toothCode: toothCandidate } : {}),
		quantity: Number(it.quantity || 1),
		unitPriceRub: priceVal,
		discountRub: discountVal,
	};
}

/**
 * Builds structured medical diary text from stage items
 */
export function buildStageMedicalDiaryText(stageTitle: string, stageItems: any[]): string {
	const descriptions = stageItems.map((it) => {
		const tooth = it.toothNumber || it.toothCode ? ` (зуб #${it.toothNumber || it.toothCode})` : "";
		const name = it.name || it.title || it.medicalTitleRu || it.patientFriendlyTitleRu || it.priceId || "Услуга";
		return `${name}${tooth}`;
	});

	return `[${stageTitle}]: ${descriptions.join(", ")}`;
}
