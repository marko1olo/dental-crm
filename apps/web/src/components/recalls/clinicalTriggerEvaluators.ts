import type { ClinicalRecallTriggerType } from "./recallCycleTypes";
import type { PatientRecallRecord } from "./recallRecordTypes";
import type {
	ClinicalRecallChannelId,
	MultiRecallEvaluationResult,
	PatientClinicalStatusInput,
} from "./clinicalTriggerTypes";
import {
	calculateHygieneRecallTrigger,
	calculateImplantProstheticRecallTrigger,
	calculateOrthoActivationRecallTrigger,
	calculatePediatricRecallTrigger,
	calculatePeriodontalRecallTrigger,
} from "./clinicalTriggerCalculators";

export type { ClinicalRecallChannelId, PatientClinicalStatusInput, MultiRecallEvaluationResult };

export function evaluateMultiRecallChannels(clinicalData: PatientClinicalStatusInput): MultiRecallEvaluationResult {
	const lastDate = clinicalData.lastVisitDate ?? new Date();
	const triggers: (ReturnType<typeof calculateHygieneRecallTrigger> & { channelId: ClinicalRecallChannelId })[] = [];
	const activeChannels: ClinicalRecallChannelId[] = [];

	const isPeriodontal = (clinicalData.maxPocketDepthMm !== undefined && clinicalData.maxPocketDepthMm >= 4) || clinicalData.hasBleedingOnProbing === true;
	const cleaningDate = clinicalData.lastCleaningDate ?? lastDate;

	if (isPeriodontal) {
		const trig = calculatePeriodontalRecallTrigger(cleaningDate, clinicalData.customHygieneMonths ?? 3);
		triggers.push({ ...trig, channelId: "hygiene_periodontal" });
	} else {
		const trig = calculateHygieneRecallTrigger(cleaningDate, clinicalData.customHygieneMonths ?? 6);
		triggers.push({ ...trig, channelId: "hygiene_periodontal" });
	}
	activeChannels.push("hygiene_periodontal");

	const hasImplants = clinicalData.hasImplants || (clinicalData.implantsCount !== undefined && clinicalData.implantsCount > 0) || clinicalData.implantSurgeryDate !== undefined;
	if (hasImplants || clinicalData.hasCrownsOrVeneers || clinicalData.hasProsthetics) {
		const trig = calculateImplantProstheticRecallTrigger(clinicalData.implantSurgeryDate ?? lastDate, clinicalData.customImplantMonths ?? (hasImplants ? 6 : 12));
		triggers.push({ ...trig, channelId: "implant_monitoring" });
		activeChannels.push("implant_monitoring");
	}

	const hasOrtho = clinicalData.hasBraces || clinicalData.hasAligners || clinicalData.hasOrthodonticAppliance;
	if (hasOrtho) {
		const trig = calculateOrthoActivationRecallTrigger(clinicalData.lastOrthoAdjustmentDate ?? lastDate, clinicalData.customOrthoWeeks ?? (clinicalData.hasAligners ? 6 : 4));
		triggers.push({ ...trig, channelId: "orthodontic_activation" });
		activeChannels.push("orthodontic_activation");
	}

	const isChild = clinicalData.isChildUnder14 === true || (clinicalData.age !== undefined && clinicalData.age < 14);
	if (isChild) {
		const trig = calculatePediatricRecallTrigger(clinicalData.lastPediatricVisitDate ?? lastDate, (clinicalData.customPediatricMonths === 4 ? 4 : 3) as 3 | 4);
		triggers.push({ ...trig, channelId: "pediatric_prophylaxis" });
		activeChannels.push("pediatric_prophylaxis");
	}

	let primaryTrigger = triggers[0]!;
	if (isChild && triggers.some((t) => t.channelId === "pediatric_prophylaxis")) {
		primaryTrigger = triggers.find((t) => t.channelId === "pediatric_prophylaxis")!;
	} else if (hasOrtho && triggers.some((t) => t.channelId === "orthodontic_activation")) {
		primaryTrigger = triggers.find((t) => t.channelId === "orthodontic_activation")!;
	} else if (hasImplants && triggers.some((t) => t.channelId === "implant_monitoring")) {
		primaryTrigger = triggers.find((t) => t.channelId === "implant_monitoring")!;
	}

	return { triggers, activeChannels, hasMultipleRecalls: triggers.length > 1, primaryTrigger };
}

export function resolveCandidateTriggerType(candidate: PatientRecallRecord): ClinicalRecallTriggerType {
	if (candidate.clinicalTriggerType) return candidate.clinicalTriggerType;
	const plan = (candidate.treatmentPlanTitle ?? "").toLowerCase();
	const procs = (candidate.lastProcedures ?? []).join(" ").toLowerCase();
	const notes = (candidate.clinicalNotes ?? "").toLowerCase();
	const combined = `${plan} ${procs} ${notes}`;

	if (candidate.isChildUnder14 || (candidate.age !== undefined && candidate.age < 14) || combined.includes("детск") || combined.includes("молочн")) {
		return "pediatric_3_4m";
	}
	if (candidate.hasBraces || candidate.cycleType === "orthodontic_braces" || candidate.cycleType === "orthodontic_aligners" || combined.includes("брекет") || combined.includes("элайнер") || combined.includes("дуг")) {
		return "ortho_activation_1m";
	}
	if ((candidate.implantsCount && candidate.implantsCount > 0) || candidate.cycleType === "implant_monitoring" || candidate.cycleType === "prosthetic_check" || combined.includes("имплант") || combined.includes("коронк") || combined.includes("протез")) {
		return "implant_prosthetic_12m";
	}
	if (candidate.cycleType === "endodontic_check" || combined.includes("эндо") || combined.includes("пульпит") || combined.includes("периодонтит") || combined.includes("канал")) {
		return "endodontic_1m";
	}
	if (candidate.cycleType === "periodontal_maintenance" || combined.includes("пародонт") || combined.includes("вектор") || combined.includes("гингив") || (candidate.periodontalPocketMaxMm !== undefined && candidate.periodontalPocketMaxMm >= 4)) {
		return "periodontal_3m";
	}
	return "hygiene_6m";
}
