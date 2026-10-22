import {
	type Clinical043Snapshot,
	type CopilotUiContext,
	type ParsedCopilotMessage,
	VIEW_CANONICAL_NAMES,
	getCanonicalViewName,
} from "./contextSyncTypes";

export function formatCopilotUiContextHeader(ctx?: Partial<CopilotUiContext>): string {
	const canonical = getCanonicalViewName(ctx?.view ?? "Odontogram");
	const viewVal = ctx?.view
		? (VIEW_CANONICAL_NAMES[ctx.view.toLowerCase()]?.canonicalKey ?? ctx.view)
		: canonical.canonicalKey;

	const patientIdVal = ctx?.patientId ? `'${String(ctx.patientId).replace(/'/g, "\\'")}'` : "null";

	let toothVal = "null";
	if (ctx?.activeTooth !== null && ctx?.activeTooth !== undefined) {
		const num = Number(ctx.activeTooth);
		toothVal = !Number.isNaN(num) && num > 0 ? String(num) : `'${String(ctx.activeTooth).replace(/'/g, "\\'")}'`;
	}

	const doctorVal = ctx?.activeDoctor ? `'${String(ctx.activeDoctor).replace(/'/g, "\\'")}'` : "null";

	const parts: string[] = [
		`View='${viewVal}'`,
		`PatientId=${patientIdVal}`,
		`ActiveTooth=${toothVal}`,
		`ActiveDoctor=${doctorVal}`,
	];

	if (ctx?.toothFormula && Object.keys(ctx.toothFormula).length > 0) {
		parts.push(`ToothFormula='${JSON.stringify(ctx.toothFormula).replace(/'/g, "\\'")}'`);
	}
	if (ctx?.diagnosesByTooth && Object.keys(ctx.diagnosesByTooth).length > 0) {
		parts.push(`Diagnoses='${JSON.stringify(ctx.diagnosesByTooth).replace(/'/g, "\\'")}'`);
	}
	if (ctx?.clinical043Context && Object.keys(ctx.clinical043Context).length > 0) {
		parts.push(`Form043='${JSON.stringify(ctx.clinical043Context).replace(/'/g, "\\'")}'`);
	}
	if (ctx?.allergies && ctx.allergies.length > 0) {
		parts.push(`Allergies='${JSON.stringify(ctx.allergies).replace(/'/g, "\\'")}'`);
	}

	return `[UI Context: ${parts.join(", ")}]`;
}

function parseJsonField<T>(raw?: string): T | undefined {
	if (!raw) return undefined;
	try {
		return JSON.parse(raw.replace(/\\'/g, "'"));
	} catch {
		return undefined;
	}
}

export function parseCopilotUiContextHeader(fullText: string): ParsedCopilotMessage {
	if (!fullText || typeof fullText !== "string") {
		return { context: null, cleanText: "", rawHeader: null };
	}
	const headerMatch = fullText.match(/^\[UI Context:\s*([\s\S]*?)\](?=\s*(?:\r?\n|$))(?:\r?\n)?/i);
	if (!headerMatch) return { context: null, cleanText: fullText, rawHeader: null };

	const rawHeader = headerMatch[0];
	const body = headerMatch[1] ?? "";

	const rawView = body.match(/View='([^']*)'/i)?.[1] ?? "";
	const rawPatientId = body.match(/PatientId=(null|'[^']*')/i)?.[1] ?? "null";
	const rawActiveTooth = body.match(/ActiveTooth=(null|[0-9]+|'[^']*')/i)?.[1] ?? "null";
	const rawActiveDoctor = body.match(/ActiveDoctor=(null|'[^']*')/i)?.[1] ?? "null";

	const canonical = getCanonicalViewName(rawView);
	const patientId = rawPatientId === "null" ? null : rawPatientId.replace(/^'|'$/g, "").replace(/\\'/g, "'");

	let activeTooth: number | string | null = null;
	if (rawActiveTooth !== "null") {
		const unquoted = rawActiveTooth.replace(/^'|'$/g, "").replace(/\\'/g, "'");
		const num = Number(unquoted);
		activeTooth = !Number.isNaN(num) && num > 0 ? num : unquoted;
	}

	const activeDoctor = rawActiveDoctor === "null" ? null : rawActiveDoctor.replace(/^'|'$/g, "").replace(/\\'/g, "'");
	const toothFormula = parseJsonField<Record<string, string>>(body.match(/ToothFormula='([^']*)'/i)?.[1]);
	const diagnosesByTooth = parseJsonField<Record<string, string>>(body.match(/Diagnoses='([^']*)'/i)?.[1]);
	const clinical043Context = parseJsonField<Clinical043Snapshot>(body.match(/Form043='([^']*)'/i)?.[1]);
	const allergies = parseJsonField<string[]>(body.match(/Allergies='([^']*)'/i)?.[1]);

	return {
		context: {
			view: canonical.canonicalKey, viewLabel: canonical.labelRu, patientId,
			patientName: null, allergies, activeTooth, activeDoctor, toothFormula,
			diagnosesByTooth, clinical043Context,
		},
		cleanText: fullText.slice(rawHeader.length).trimStart(),
		rawHeader,
	};
}
