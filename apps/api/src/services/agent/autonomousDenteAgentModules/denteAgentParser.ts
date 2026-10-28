/**
 * denteAgentParser.ts — Context normalization & clinical prompt parser for DENTE Copilot.
 *
 * Adheres to:
 * - Mandate 8x & Mandate 8ap: Clean clinical domain language without raw decree codes in UI strings.
 * - Mandate 8e: Doctor autonomy, one-click physiological norm defaults.
 */

import { formatFdiTooth, parseFdiTooth } from "../chairsideSentinelEngine.js";

export interface LabOrderRequest {
	workType: string;
	material: string;
	vitaShade: string;
	dueDate: string;
	notes?: string | undefined;
	priceRub?: number | undefined;
}

export interface AppointmentRequest {
	startsAt: string;
	durationMinutes?: number | undefined;
	reason: string;
	doctorUserId?: string | undefined;
	chairId?: string | undefined;
	comment?: string | undefined;
}

export interface AutonomousDenteAgentInput {
	patientId: string;
	prompt?: string | undefined;
	toothNumber?: number | string | undefined;
	complaints?: string | undefined;
	diagnoses?: string[] | undefined;
	allergies?: string[] | undefined;
	somaticHistory?: string[] | undefined;
	activeServices?: string[] | undefined;
	discountPercent?: number | undefined;
	patientWeightKg?: number | undefined;
	anestheticType?: "articaine_1_100000" | "articaine_1_200000" | "mepivacaine_3_plain" | "auto" | undefined;
	plannedCarpules?: number | undefined;
	labOrderRequest?: LabOrderRequest | undefined;
	appointmentRequest?: AppointmentRequest | undefined;
	mode?: "autonomous" | "supervised" | undefined;
	organizationId?: string | undefined;
	userId?: string | undefined;
}

export interface ParsedClinicalContext {
	resolvedTooth: number | null;
	fdiToothFormatted: string;
	extractedComplaints: string;
	extractedDiagnoses: string[];
	extractedAllergies: string[];
	extractedSomatic: string[];
	resolvedDiscount: number;
	resolvedWeight: number;
	labReq: LabOrderRequest | undefined;
	appReq: AppointmentRequest | undefined;
	primaryIcd10: string;
	diagnosisName: string;
	clinicalCategory: "pulpitis" | "caries" | "periodontitis" | "surgery" | "hygiene" | "preventive" | "therapy" | "endodontics";
	orgId: string;
	userId: string;
}

export function parseClinicalPromptAndContext(input: AutonomousDenteAgentInput): ParsedClinicalContext {
	let resolvedTooth = parseFdiTooth(input.toothNumber);
	let extractedComplaints = input.complaints || "";
	const extractedDiagnoses = [...(input.diagnoses || [])];
	const extractedAllergies = [...(input.allergies || [])];
	const extractedSomatic = [...(input.somaticHistory || [])];
	let resolvedDiscount = input.discountPercent ?? 0;
	let resolvedWeight = input.patientWeightKg ?? 70;
	const labReq = input.labOrderRequest;
	let appReq = input.appointmentRequest;

	// Extract context from natural language prompt if provided
	if (input.prompt) {
		const p = input.prompt;
		if (!resolvedTooth) {
			resolvedTooth = parseFdiTooth(p);
		}
		if (!extractedComplaints && /боль|жалоб|ноет|болит|пульсир/i.test(p)) {
			extractedComplaints = p;
		}
		if (/пульпит|периодонтит|кариес/i.test(p) && extractedDiagnoses.length === 0) {
			if (/пульпит/i.test(p)) extractedDiagnoses.push("Пульпит");
			else if (/периодонтит/i.test(p)) extractedDiagnoses.push("Периодонтит");
			else if (/кариес/i.test(p)) extractedDiagnoses.push("Кариес");
		}
		if (/пенициллин/i.test(p) && !extractedAllergies.some((a) => /пенициллин/i.test(a))) {
			extractedAllergies.push("Аллергия на пенициллин");
		}
		if (/гипертон|давлен/i.test(p) && !extractedSomatic.some((s) => /гипертон/i.test(s))) {
			extractedSomatic.push("Артериальная гипертензия");
		}
		if (/глауком/i.test(p) && !extractedSomatic.some((s) => /глауком/i.test(s))) {
			extractedSomatic.push("Закрытоугольная глаукома");
		}
		if (/скидк[аеу]\s*(\d+)%/i.test(p)) {
			const match = p.match(/скидк[аеу]\s*(\d+)%/i);
			if (match && match[1]) {
				resolvedDiscount = Number.parseInt(match[1], 10);
			}
		}
		const weightMatch = p.match(/(?:вес[а-я]*\s*[:=]?\s*|пациент\s+)(\d{2,3})\s*кг/i) || p.match(/(\d{2,3})\s*кг/i);
		if (weightMatch && weightMatch[1]) {
			resolvedWeight = Number.parseInt(weightMatch[1], 10);
		}
		if (!appReq && /запис|при[её]м|повторн/i.test(p)) {
			const dateMatch = p.match(/\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z?)?/);
			appReq = {
				startsAt: dateMatch ? dateMatch[0] : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
				reason: `Повторный прием${resolvedTooth ? ` по зубу ${resolvedTooth}` : ""}`,
				durationMinutes: 30,
			};
		}
	}

	// Clinical category detection
	const allText = `${extractedDiagnoses.join(" ")} ${extractedComplaints}`.toLowerCase();
	let primaryIcd10 = "Z01.2";
	let diagnosisName = "Стоматологическое обследование (Здоров)";
	let clinicalCategory: ParsedClinicalContext["clinicalCategory"] = "preventive";

	if (/k04\.0|пульпит/i.test(allText)) {
		primaryIcd10 = "K04.0";
		diagnosisName = "K04.0 Пульпит зуба";
		clinicalCategory = "endodontics";
	} else if (/k04\.5|периодонтит/i.test(allText)) {
		primaryIcd10 = "K04.5";
		diagnosisName = "K04.5 Хронический апикальный периодонтит";
		clinicalCategory = "endodontics";
	} else if (/k02|кариес/i.test(allText)) {
		primaryIcd10 = "K02.1";
		diagnosisName = "K02.1 Кариес дентина";
		clinicalCategory = "therapy";
	} else if (/удалени|экстракц/i.test(allText)) {
		primaryIcd10 = "K08.1";
		diagnosisName = "K08.1 Потеря зубов (удаление)";
		clinicalCategory = "surgery";
	}

	const fdiToothFormatted = formatFdiTooth(resolvedTooth);
	const orgId = input.organizationId || "00000000-0000-7000-8000-000000000001";
	const userId = input.userId || "00000000-0000-7000-8000-000000000001";

	return {
		resolvedTooth,
		fdiToothFormatted,
		extractedComplaints,
		extractedDiagnoses,
		extractedAllergies,
		extractedSomatic,
		resolvedDiscount,
		resolvedWeight,
		labReq,
		appReq,
		primaryIcd10,
		diagnosisName,
		clinicalCategory,
		orgId,
		userId,
	};
}
