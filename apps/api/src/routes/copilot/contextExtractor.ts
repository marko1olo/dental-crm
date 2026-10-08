/**
 * contextExtractor.ts — Layer 1: Pure Utility for Doctor Screen Context Extraction.
 *
 * Verbatim extraction from canonical copilot route handler.
 */

import type { DoctorScreenContext } from "../../services/agent/index.js";

export function extractDoctorScreenContext(
	text: string,
	bodyContext?: unknown,
): { doctorContext: DoctorScreenContext | null; cleanText: string } {
	if (bodyContext && typeof bodyContext === "object") {
		return {
			doctorContext: bodyContext as DoctorScreenContext,
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
			toothFormula = JSON.parse(raw);
		} catch (err) {
			console.warn("[Copilot extractDoctorScreenContext] Failed to parse toothFormula JSON:", raw, err);
		}
	}

	let diagnosesByTooth: Record<string, string> | undefined = undefined;
	if (diagnosesMatch?.[1]) {
		const raw = diagnosesMatch[1].replace(/\\'/g, "'");
		try {
			diagnosesByTooth = JSON.parse(raw);
		} catch (err) {
			console.warn("[Copilot extractDoctorScreenContext] Failed to parse diagnosesByTooth JSON:", raw, err);
		}
	}

	let clinical043Context: Record<string, string> | undefined = undefined;
	if (form043Match?.[1]) {
		const raw = form043Match[1].replace(/\\'/g, "'");
		try {
			clinical043Context = JSON.parse(raw);
		} catch (err) {
			console.warn("[Copilot extractDoctorScreenContext] Failed to parse clinical043Context JSON:", raw, err);
		}
	}

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
		clinical043Context: (clinical043Context as any) ?? null,
		allergies: allergies ?? null,
	};

	const cleanText = text.slice(rawHeader.length).trimStart();
	return { doctorContext, cleanText };
}
