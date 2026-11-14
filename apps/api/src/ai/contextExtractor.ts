/**
 * contextExtractor.ts — Pure Utility for Doctor Screen Context Extraction.
 *
 * Extracts structured DoctorScreenContext from UI header text or request body.
 */

import type { DoctorScreenContext } from "@dental/shared";

export { type DoctorScreenContext } from "@dental/shared";

type ClinicalEmrRecord = NonNullable<DoctorScreenContext["clinicalEmrContext"]>;

function isDoctorScreenContext(value: unknown): value is DoctorScreenContext {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseClinicalEmrContext(raw: string): ClinicalEmrRecord | null {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return null;
		}
		const obj = parsed as Record<string, unknown>;
		return {
			complaints: typeof obj.complaints === "string" ? obj.complaints : undefined,
			anamnesis: typeof obj.anamnesis === "string" ? obj.anamnesis : undefined,
			objectiveStatus:
				typeof obj.objectiveStatus === "string"
					? obj.objectiveStatus
					: undefined,
			diagnosis: typeof obj.diagnosis === "string" ? obj.diagnosis : undefined,
			treatmentPlan:
				typeof obj.treatmentPlan === "string" ? obj.treatmentPlan : undefined,
			recommendations:
				typeof obj.recommendations === "string"
					? obj.recommendations
					: undefined,
		};
	} catch (err) {
		console.warn(
			"[Copilot extractDoctorScreenContext] Failed to parse clinicalEmrContext JSON:",
			raw,
			err,
		);
		return null;
	}
}

export function extractDoctorScreenContext(
	text: string,
	bodyContext?: unknown,
): { doctorContext: DoctorScreenContext | null; cleanText: string } {
	if (isDoctorScreenContext(bodyContext)) {
		return {
			doctorContext: bodyContext,
			cleanText: text,
		};
	}

	const headerMatch = text.match(
		/^\[UI Context:\s*([\s\S]*?)\](?=\s*(?:\r?\n|$))(?:\r?\n)?/i,
	);
	if (!headerMatch) {
		return { doctorContext: null, cleanText: text };
	}

	const rawHeader = headerMatch[0];
	const headerBody = headerMatch[1] ?? "";

	const viewMatch = headerBody.match(/View='([^']*)'/i);
	const patientIdMatch = headerBody.match(/PatientId=(null|'[^']*')/i);
	const activeToothMatch = headerBody.match(/ActiveTooth=(null|[0-9]+|'[^']*')/i);
	const activeDoctorMatch = headerBody.match(/ActiveDoctor=(null|'[^']*')/i);
	const toothFormulaMatch = headerBody.match(/ToothFormula='([^']*)'/i);
	const diagnosesMatch = headerBody.match(/Diagnoses='([^']*)'/i);
	const form043Match = headerBody.match(/Form043='([^']*)'/i);
	const allergiesMatch = headerBody.match(/Allergies='([^']*)'/i);

	const patientId =
		patientIdMatch?.[1] && patientIdMatch[1] !== "null"
			? patientIdMatch[1].replace(/^'|'$/g, "").replace(/\\'/g, "'")
			: null;

	let activeTooth: number | string | null = null;
	if (activeToothMatch?.[1] && activeToothMatch[1] !== "null") {
		const unquoted = activeToothMatch[1]
			.replace(/^'|'$/g, "")
			.replace(/\\'/g, "'");
		const num = Number(unquoted);
		activeTooth = !Number.isNaN(num) && num > 0 ? num : unquoted;
	}

	const activeDoctor =
		activeDoctorMatch?.[1] && activeDoctorMatch[1] !== "null"
			? activeDoctorMatch[1].replace(/^'|'$/g, "").replace(/\\'/g, "'")
			: null;

	let toothFormula: Record<string, string> | undefined = undefined;
	if (toothFormulaMatch?.[1]) {
		const raw = toothFormulaMatch[1].replace(/\\'/g, "'");
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				toothFormula = Object.fromEntries(
					Object.entries(parsed as Record<string, unknown>).map(
						([key, val]) => [key, String(val ?? "")],
					),
				);
			}
		} catch (err) {
			console.warn("[Copilot extractDoctorScreenContext] Failed to parse toothFormula JSON:", raw, err);
		}
	}

	let diagnosesByTooth: Record<string, string> | undefined = undefined;
	if (diagnosesMatch?.[1]) {
		const raw = diagnosesMatch[1].replace(/\\'/g, "'");
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				diagnosesByTooth = Object.fromEntries(
					Object.entries(parsed as Record<string, unknown>).map(
						([key, val]) => [key, String(val ?? "")],
					),
				);
			}
		} catch (err) {
			console.warn("[Copilot extractDoctorScreenContext] Failed to parse diagnosesByTooth JSON:", raw, err);
		}
	}

	const clinicalEmrContext = form043Match?.[1]
		? parseClinicalEmrContext(form043Match[1].replace(/\\'/g, "'"))
		: null;

	let allergies: string[] | undefined = undefined;
	if (allergiesMatch?.[1]) {
		const raw = allergiesMatch[1].replace(/\\'/g, "'");
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				allergies = parsed.map(String);
			}
		} catch (err) {
			console.warn("[Copilot extractDoctorScreenContext] Failed to parse allergies JSON:", raw, err);
			// Resilient fallback: parse comma-separated or bracketed tokens so critical life-saving allergies are not lost
			const salvaged = raw
				.replace(/^[\["']+|[\]"']+$/g, "")
				.split(/[,\n;]+/)
				.map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
				.filter(Boolean);
			if (salvaged.length > 0) {
				allergies = salvaged;
			}
		}
	}

	const doctorContext: DoctorScreenContext = {
		view: viewMatch?.[1] || null,
		patientId,
		activeTooth,
		activeDoctor,
		toothFormula: toothFormula ?? null,
		diagnosesByTooth: diagnosesByTooth ?? null,
		clinicalEmrContext,
		clinical043Context: clinicalEmrContext,
		allergies: allergies ?? null,
	};

	const cleanText = text.slice(rawHeader.length).trimStart();
	return { doctorContext, cleanText };
}
