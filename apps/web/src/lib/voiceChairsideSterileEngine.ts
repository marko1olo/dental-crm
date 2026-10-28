/**
 * voiceChairsideSterileEngine.ts — Autonomous Chairside Sterile Hands Voice Protocol Engine.
 *
 * Designed for dental operators in nitrile gloves at chairside:
 * - Hands-free voice recognition with F8 (foot pedal) / Alt+V hotkey
 * - Zero-touch tooth odontogram auto-fill (caries, pulpitis, filled, crown, implant, missing)
 * - ISO 3950 / FDI tooth number normalization (11-48, primary 51-85)
 * - Anesthesia & SOAP clinical notes extraction
 * - Audible earcon feedback and non-blocking toast notifications
 *
 * Rules: THE_HAMMER_MASTER_PROMPT.md, frontend.md, <500 lines limit.
 */

import { parseDentalVoiceSpeech } from "../services/voice/dentalGrammarParser";
import { playTactileEarcon } from "./chairsideErgonomics";

export type SterileToothState =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Filled"
	| "Crown"
	| "Implant"
	| "Missing"
	| "Healthy";

export interface SterileToothAction {
	toothNumber: number;
	state: SterileToothState;
	surfaces: string[];
	rawText: string;
}

export interface SterileAnesthesiaAction {
	drug: string;
	volumeMl: number;
	cartridges: number;
	rawText: string;
}

export interface SterileDiaryAction {
	section: "complaints" | "anesthesia" | "objective" | "treatment";
	text: string;
}

export interface SterileVoiceParseResult {
	hasActions: boolean;
	teethActions: SterileToothAction[];
	anesthesiaAction: SterileAnesthesiaAction | null;
	diaryActions: SterileDiaryAction[];
	summaryText: string;
}

/**
 * Normalizes speech status to canonical ToothState enum.
 */
export function mapVoiceStatusToToothState(status: string): SterileToothState {
	const lower = status.toLowerCase().trim();
	if (lower.includes("пульпит")) return "Pulpitis";
	if (lower.includes("периодонтит")) return "Periodontitis";
	if (lower.includes("пломб") || lower.includes("реставрац") || lower.includes("filled")) return "Filled";
	if (lower.includes("коронк") || lower.includes("crown") || lower.includes("протез")) return "Crown";
	if (lower.includes("имплант") || lower.includes("implant")) return "Implant";
	if (lower.includes("удален") || lower.includes("отсутств") || lower.includes("missing")) return "Missing";
	if (lower.includes("здоров") || lower.includes("интакт") || lower.includes("healthy") || lower.includes("норма")) return "Healthy";
	return "Caries";
}

/**
 * Maps Russian surface speech keywords to single-letter codes.
 */
export function mapSurfaceKeywords(text: string): string[] {
	const lower = text.toLowerCase();
	const surfaces: string[] = [];

	if (lower.includes("окклюзион") || lower.includes("жевательн") || lower.includes("окклюз")) {
		surfaces.push("O");
	}
	if (lower.includes("медиал") || lower.includes("передн") || lower.includes("контактн")) {
		surfaces.push("M");
	}
	if (lower.includes("дистал") || lower.includes("задн")) {
		surfaces.push("D");
	}
	if (lower.includes("вестибуляр") || lower.includes("щечн") || lower.includes("губн")) {
		surfaces.push("V");
	}
	if (lower.includes("язычн") || lower.includes("небн")) {
		surfaces.push("L");
	}

	return Array.from(new Set(surfaces));
}

/**
 * Parses raw speech string into actionable clinical commands.
 */
export function parseVoiceChairsideCommand(rawText: string): SterileVoiceParseResult {
	const text = rawText.trim();
	if (!text) {
		return {
			hasActions: false,
			teethActions: [],
			anesthesiaAction: null,
			diaryActions: [],
			summaryText: "",
		};
	}

	const intent = parseDentalVoiceSpeech(text);
	const teethActions: SterileToothAction[] = [];
	const diaryActions: SterileDiaryAction[] = [];
	let anesthesiaAction: SterileAnesthesiaAction | null = null;

	// 1. Tooth Updates
	if (intent.teethUpdates && intent.teethUpdates.length > 0) {
		for (const u of intent.teethUpdates) {
			const mappedState = mapVoiceStatusToToothState(u.state || u.icd10Title || "кариес");
			const extractedSurfaces = u.surfaces && u.surfaces.length > 0
				? [...u.surfaces]
				: mapSurfaceKeywords(text);

			teethActions.push({
				toothNumber: u.toothNumber,
				state: mappedState,
				surfaces: extractedSurfaces,
				rawText: text,
			});
		}
	}

	// 2. Anesthesia
	if (intent.anesthesia) {
		const cartridges = intent.anesthesia.cartridgeCount || 1;
		const volumeMl = intent.anesthesia.volumeMl || cartridges * 1.7;
		anesthesiaAction = {
			drug: intent.anesthesia.displayName || intent.anesthesia.tradeName || "Артикаин 4% с эпинефрином 1:100000",
			volumeMl,
			cartridges,
			rawText: text,
		};
		diaryActions.push({
			section: "anesthesia",
			text: `${anesthesiaAction.drug} — ${anesthesiaAction.cartridges} карп. (${anesthesiaAction.volumeMl.toFixed(1)} мл)`,
		});
	}

	// 3. SOAP Notes / Complaints
	if (intent.soapNotes?.subjective) {
		diaryActions.push({
			section: "complaints",
			text: intent.soapNotes.subjective,
		});
	} else if (text.toLowerCase().includes("жалоб")) {
		const complaintMatch = text.match(/жалоб[а-я]*\s+(?:на\s+)?(.+)/i);
		if (complaintMatch?.[1]) {
			diaryActions.push({
				section: "complaints",
				text: complaintMatch[1].trim(),
			});
		}
	}

	// Generate concise clinical summary
	const summaryParts: string[] = [];
	if (teethActions.length > 0) {
		summaryParts.push(
			teethActions
				.map((t) => `Зуб ${t.toothNumber}: ${t.state}${t.surfaces.length > 0 ? ` (${t.surfaces.join("")})` : ""}`)
				.join(", "),
		);
	}
	if (anesthesiaAction) {
		summaryParts.push(`Анестезия: ${anesthesiaAction.drug} (${anesthesiaAction.cartridges} карп.)`);
	}
	if (diaryActions.some((d) => d.section === "complaints")) {
		summaryParts.push("Жалобы добавлены в дневник");
	}

	const hasActions = teethActions.length > 0 || anesthesiaAction !== null || diaryActions.length > 0;

	return {
		hasActions,
		teethActions,
		anesthesiaAction,
		diaryActions,
		summaryText: summaryParts.join(" · "),
	};
}

/**
 * Inserts recognized speech directly into the currently focused input/textarea.
 * Ensures hands-free dictation immediately populates active diary fields (complaints, anamnesis, objective).
 * Supports React controlled inputs by invoking native property setters and bubbling input/change events.
 */
export function insertTextIntoActiveInput(text: string): boolean {
	if (typeof document === "undefined" || !text.trim()) return false;
	const active = document.activeElement as any;
	if (!active) return false;

	const isTextArea =
		typeof HTMLTextAreaElement !== "undefined"
			? active instanceof HTMLTextAreaElement
			: active.tagName === "TEXTAREA";

	const isTextInput =
		typeof HTMLInputElement !== "undefined"
			? active instanceof HTMLInputElement && (!active.type || active.type === "text" || active.type === "search")
			: active.tagName === "INPUT" && (!active.type || active.type === "text" || active.type === "search");

	if (isTextArea || isTextInput) {
		const start = typeof active.selectionStart === "number" ? active.selectionStart : (active.value?.length ?? 0);
		const end = typeof active.selectionEnd === "number" ? active.selectionEnd : (active.value?.length ?? 0);
		const val = String(active.value || "");
		const prefix = start > 0 && !/\s$/.test(val.slice(0, start)) ? " " : "";
		const cleanText = text.trim();
		const nextVal = val.slice(0, start) + prefix + cleanText + val.slice(end);

		// Support React controlled components via prototype value descriptor setter
		try {
			const proto = Object.getPrototypeOf(active);
			const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
			if (descriptor?.set) {
				descriptor.set.call(active, nextVal);
			} else {
				active.value = nextVal;
			}
		} catch {
			active.value = nextVal;
		}

		const newCursor = start + prefix.length + cleanText.length;
		if (typeof active.setSelectionRange === "function") {
			try {
				active.setSelectionRange(newCursor, newCursor);
			} catch {
				// ignore
			}
		}

		if (typeof active.dispatchEvent === "function") {
			try {
				const InputEventClass = typeof Event !== "undefined" ? Event : function (this: any, type: string) { this.type = type; } as any;
				active.dispatchEvent(new InputEventClass("input", { bubbles: true }));
				active.dispatchEvent(new InputEventClass("change", { bubbles: true }));
			} catch {
				// ignore
			}
		}
		return true;
	}
	return false;
}

/**
 * Dispatches clinical actions to the application event bus.
 * Integrates with canonical DENTE events:
 * - 'dente-odontogram-update' for tooth formula mutations
 * - 'dente-apply-soap-protocol' for Form 043/u clinical diary syncing
 */
export function dispatchSterileVoiceActions(result: SterileVoiceParseResult): boolean {
	if (!result.hasActions || typeof window === "undefined") {
		return false;
	}

	// 1. Dispatch canonical odontogram event
	if (result.teethActions.length > 0) {
		window.dispatchEvent(
			new CustomEvent("dente-odontogram-update", {
				detail: {
					states: result.teethActions.map((t) => ({
						toothNumber: t.toothNumber,
						state: t.state,
						surfaces: t.surfaces,
					})),
				},
			}),
		);
	}

	// 2. Dispatch legacy tooth events for backward compatibility
	for (const toothAction of result.teethActions) {
		window.dispatchEvent(
			new CustomEvent("dente:voice-tooth-update", {
				detail: toothAction,
			}),
		);
	}

	// 3. Dispatch canonical Form 043/u clinical diary event
	const complaints = result.diaryActions
		.filter((d) => d.section === "complaints")
		.map((d) => d.text)
		.join(". ");
	const objective = result.diaryActions
		.filter((d) => d.section === "objective")
		.map((d) => d.text)
		.join(". ");
	const treatment = result.diaryActions
		.filter((d) => d.section === "treatment")
		.map((d) => d.text)
		.join(". ");
	const anesthesiaText = result.anesthesiaAction
		? `Анестезия: ${result.anesthesiaAction.drug} — ${result.anesthesiaAction.cartridges} карп. (${result.anesthesiaAction.volumeMl.toFixed(1)} мл)`
		: "";
	const combinedTreatment = [anesthesiaText, treatment].filter(Boolean).join("\n");

	if (complaints || objective || combinedTreatment) {
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					mode: "smart_append",
					immediate: true,
					complaint: complaints || undefined,
					complaints: complaints || undefined,
					objectiveStatus: objective || undefined,
					statusLocalis: objective || undefined,
					treatmentPlan: combinedTreatment || undefined,
					treatmentDescription: combinedTreatment || undefined,
					soap: {
						complaint: complaints || undefined,
						objectiveStatus: objective || undefined,
						treatmentPlan: combinedTreatment || undefined,
					},
				},
			}),
		);
	}

	// 4. Dispatch legacy diary events for backward compatibility
	for (const diaryAction of result.diaryActions) {
		window.dispatchEvent(
			new CustomEvent("dente:voice-diary-append", {
				detail: diaryAction,
			}),
		);
	}

	// 5. Audible tactile feedback (Doctor's earcon)
	if (result.teethActions.length > 0) {
		playTactileEarcon("norm");
	} else if (result.diaryActions.length > 0 || result.anesthesiaAction) {
		playTactileEarcon("save");
	}

	return true;
}
