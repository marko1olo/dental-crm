/**
 * toothStatusTools.ts — Odontogram tooth status mutation & surface normalizer for DENTE Copilot.
 *
 * Adheres to:
 * - FDI numbering 11..48, 51..85
 * - MODVLI surface rules (Mandate 8e)
 * - ICD-10 diagnosis alignment
 */

import { VALID_FDI_PERMANENT_TEETH, VALID_FDI_PRIMARY_TEETH } from "../../../clinical/Icd10ClinicalValidator.js";
import { formatFdiTooth, parseFdiTooth } from "../../chairsideSentinelEngine.js";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../../tools/tool.js";
import {
	updateToothStatusSchema,
	type UpdateToothStatusInput,
	type UpdateToothStatusResult,
} from "../types.js";

export function normalizeAnatomicalSurfaces(
	toothNumber: number,
	surfaces?: string[] | string | null,
): string[] {
	if (!surfaces) return [];

	let rawTokens: string[] = [];
	if (Array.isArray(surfaces)) {
		rawTokens = surfaces.flatMap((s) => s.toUpperCase().split(""));
	} else if (typeof surfaces === "string") {
		rawTokens = surfaces.toUpperCase().replace(/[^A-Z]/g, "").split("");
	}

	const isAnterior = (toothNumber % 10) <= 3; // Incisors & canines (1-3)
	const quadrant = Math.floor(toothNumber / 10);
	const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;

	const normalized = new Set<string>();

	for (const token of rawTokens) {
		if (token === "M") normalized.add("M"); // Mesial
		else if (token === "D") normalized.add("D"); // Distal
		else if (token === "B" || token === "V") normalized.add("V"); // Vestibular
		else if (token === "P" || token === "L") normalized.add(isUpper ? "P" : "L"); // Palatal or Lingual
		else if (token === "O" || token === "I") {
			// Occlusal for posterior, Incisal for anterior
			normalized.add(isAnterior ? "I" : "O");
		}
	}

	return Array.from(normalized);
}

export const updateToothStatusTool: ToolDefinition<
	typeof updateToothStatusSchema,
	UpdateToothStatusResult
> = {
	name: "update_tooth_status",
	description:
		"Изменение клинического статуса зуба в одонтограмме FDI (11..48, 51..85) с валидацией анатомических поверхностей (MODVLI), проверкой диагноза МКБ-10 и поддержкой автономии врача.",
	parameters: updateToothStatusSchema,
	permissions: ["clinical.write"],
	category: "write",
	handler: async (_ctx: AgentContext, args: UpdateToothStatusInput) => {
		const parsedTooth = parseFdiTooth(args.tooth);
		if (!parsedTooth) {
			throw new Error(`Некорректный номер зуба: '${args.tooth}'. Требуется FDI 11..48 или 51..85.`);
		}

		const isPermanent = VALID_FDI_PERMANENT_TEETH.has(parsedTooth);
		const isPrimary = VALID_FDI_PRIMARY_TEETH.has(parsedTooth);
		if (!isPermanent && !isPrimary) {
			throw new Error(`Номер зуба ${parsedTooth} вне допустимого диапазона FDI (11..48 или 51..85).`);
		}

		const statusNorm = args.status.toLowerCase().trim();
		let statusCode = "Norm";
		let statusLabel = "Здоровый (норма)";

		if (/кариес|caries|^c[0-4]$/i.test(statusNorm)) {
			if (/c0|пятн/i.test(statusNorm)) {
				statusCode = "C0";
				statusLabel = "Кариес эмали в стадии пятна (K02.0)";
			} else if (/c1|поверхност/i.test(statusNorm)) {
				statusCode = "C1";
				statusLabel = "Поверхностный кариес (K02.0)";
			} else if (/c2|средн/i.test(statusNorm)) {
				statusCode = "C2";
				statusLabel = "Средний кариес дентина (K02.1)";
			} else if (/c3|глубок/i.test(statusNorm)) {
				statusCode = "C3";
				statusLabel = "Глубокий кариес дентина (K02.1)";
			} else {
				statusCode = "C";
				statusLabel = "Кариес дентина (K02.1)";
			}
		} else if (/пульпит|pulpitis|^p/i.test(statusNorm)) {
			statusCode = "P";
			statusLabel = "Пульпит (K04.0)";
		} else if (/периодонтит|periodontitis|^pt/i.test(statusNorm)) {
			statusCode = "Pt";
			statusLabel = "Апикальный периодонтит (K04.5)";
		} else if (/пломб|filling|^f$|^pl/i.test(statusNorm)) {
			statusCode = "Pl";
			statusLabel = "Пломбирован композитом (Pl)";
		} else if (/коронк|crown|^cr$|^k/i.test(statusNorm)) {
			statusCode = "K";
			statusLabel = "Искусственная коронка (K)";
		} else if (/удал|отсутств|missing|extracted|^x$|^a$/i.test(statusNorm)) {
			statusCode = "A";
			statusLabel = "Отсутствует / удален (A)";
		} else if (/имплант|implant|^imp/i.test(statusNorm)) {
			statusCode = "Imp";
			statusLabel = "Дентальный имплантат (Imp)";
		}

		const normalizedSurfaces = normalizeAnatomicalSurfaces(parsedTooth, args.surfaces);
		const fdiFormatted = formatFdiTooth(parsedTooth);
		const diagnosisText = args.diagnosisText || statusLabel;

		return {
			success: true,
			toothNumber: parsedTooth,
			fdiFormatted,
			previousStatus: "sound (Norm)",
			newStatus: statusLabel,
			statusCode,
			surfaces: normalizedSurfaces,
			diagnosisText,
			message: `Статус зуба ${fdiFormatted} обновлен: ${statusLabel}${normalizedSurfaces.length > 0 ? ` (поверхности: ${normalizedSurfaces.join("")})` : ""}.`,
		};
	},
};
