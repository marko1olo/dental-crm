/**
 * toothStatusTool.ts — FDI Odontogram Tooth Status & Anatomical Surfaces Tool.
 *
 * Adheres to:
 * - FDI numbering 11..48 (permanent) & 51..85 (primary).
 * - Anatomical surface normalization (MODVLI).
 * - ICD-10 clinical diagnosis tagging (K02, K04).
 * - Mandate 8e: Doctor autonomy (unrestricted status changes).
 */

import { z } from "zod";
import {
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../../clinical/Icd10ClinicalValidator.js";
import { formatFdiTooth, parseFdiTooth } from "../../chairsideSentinelEngine.js";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";

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

	const isAnterior = (toothNumber % 10) <= 3;
	const quadrant = Math.floor(toothNumber / 10);
	const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;

	const normalized = new Set<string>();

	for (const token of rawTokens) {
		if (token === "M") normalized.add("M");
		else if (token === "D") normalized.add("D");
		else if (token === "B" || token === "V") normalized.add("V");
		else if (token === "P" || token === "L") normalized.add(isUpper ? "P" : "L");
		else if (token === "O" || token === "I") {
			normalized.add(isAnterior ? "I" : "O");
		}
	}

	return Array.from(normalized);
}

export const updateToothStatusSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	tooth: z
		.union([z.number(), z.string()])
		.describe("Номер зуба по международной системе FDI (11..48 или 51..85, например 26, '2.6', '47')"),
	status: z
		.string()
		.min(1, "Статус зуба обязателен")
		.describe("Клинический статус зуба: кариес (C1-C4), пульпит (P), пломба (F/Pl), коронка (Cr/K), удален (X/A), имплант (Imp), здоровый (Norm)"),
	surfaces: z
		.union([z.array(z.string()), z.string()])
		.optional()
		.describe("Пораженные или восстанавливаемые анатомические поверхности: O (окклюзионная), M (мезиальная), D (дистальная), V/B (вестибулярная), L/P (язычная/небная), I (режущий край)"),
	diagnosisText: z.string().optional().describe("Текстовый диагноз или код МКБ-10 (например, 'K02.1 Кариес дентина')"),
	notes: z.string().optional().describe("Клинические примечания к зубу"),
});

export type UpdateToothStatusInput = z.infer<typeof updateToothStatusSchema>;

export interface UpdateToothStatusResult {
	success: true;
	toothNumber: number;
	fdiFormatted: string;
	previousStatus: string;
	newStatus: string;
	statusCode: string;
	surfaces: string[];
	diagnosisText: string;
	message: string;
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
			statusLabel = "Периодонтит (K04.7)";
		} else if (/пломб|restoration|composite|^f|^pl/i.test(statusNorm)) {
			statusCode = "F";
			statusLabel = "Пломба (состояние удовлетворительное)";
		} else if (/коронк|crown|^cr|^k/i.test(statusNorm)) {
			statusCode = "Cr";
			statusLabel = "Коронка (искусственная)";
		} else if (/удал|отсутств|missing|^x|^a/i.test(statusNorm)) {
			statusCode = "X";
			statusLabel = "Отсутствует (удален)";
		} else if (/имплант|implant|^imp/i.test(statusNorm)) {
			statusCode = "Imp";
			statusLabel = "Дентальный имплантат";
		}

		const surfaces = normalizeAnatomicalSurfaces(parsedTooth, args.surfaces);
		const fdiFormatted = formatFdiTooth(parsedTooth);

		return {
			success: true,
			toothNumber: parsedTooth,
			fdiFormatted,
			previousStatus: "sound",
			newStatus: statusLabel,
			statusCode,
			surfaces,
			diagnosisText: args.diagnosisText || statusLabel,
			message: `Статус зуба ${fdiFormatted} успешно обновлен: ${statusLabel} (${surfaces.join("") || "вся поверхность"}).`,
		};
	},
};
