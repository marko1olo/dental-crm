/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MDLP SCHEMA 444: DISPOSAL FOR MEDICAL ASSISTANCE / CARE (СХЕМА 444)
 * "Регистрация в ИС МДЛП сведений об отпуске лекарственного препарата
 * для оказания медицинской помощи" (444-medical_assistance)
 * Linked to Outpatient Record Form 043/u & Patient Identity
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { escapeXml } from "../cda/c14n.js";

export interface MdlpSchema444Item {
	readonly sgtin: string;
	readonly gtin?: string | undefined;
	readonly serialNumber?: string | undefined;
	readonly costRub?: number | null | undefined;
	readonly vatValueRub?: number | null | undefined;
}

export interface MdlpSchema444Params {
	readonly subjectId: string;
	readonly operationDate?: string | Date | undefined;
	readonly docNum: string;
	readonly docDate: string;
	readonly patientId?: string | null | undefined;
	readonly cardNumber?: string | null | undefined; // Form 043/у
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorSnils?: string | null | undefined;
	readonly items: readonly MdlpSchema444Item[];
	readonly notes?: string | null | undefined;
}

export interface MdlpSchema444Document {
	readonly actionId: 444;
	readonly subjectId: string;
	readonly operationDate: string;
	readonly docNum: string;
	readonly docDate: string;
	readonly patientId: string | null;
	readonly cardNumber: string;
	readonly visitId: string | null;
	readonly itemsCount: number;
	readonly totalCostRub: number;
	readonly xmlContent: string;
	readonly jsonContent: Record<string, unknown>;
	readonly items: readonly MdlpSchema444Item[];
}

export function validateMdlpSchema444Params(params: MdlpSchema444Params): {
	readonly isValid: boolean;
	readonly errors: readonly string[];
} {
	const errors: string[] = [];

	if (!params.subjectId || typeof params.subjectId !== "string" || !params.subjectId.trim()) {
		errors.push("Идентификатор субъекта обращения (subjectId) обязателен.");
	}

	if (!params.docNum || typeof params.docNum !== "string" || !params.docNum.trim()) {
		errors.push("Номер первичного документа/протокола 043/у (docNum) обязателен.");
	}

	if (!params.docDate || typeof params.docDate !== "string" || !params.docDate.trim()) {
		errors.push("Дата первичного документа (docDate) обязательна.");
	}

	if (!Array.isArray(params.items) || params.items.length === 0) {
		errors.push("Список отпускаемых препаратов для медпомощи (items) не может быть пустым.");
	} else {
		params.items.forEach((it, idx) => {
			if (!it.sgtin || typeof it.sgtin !== "string" || it.sgtin.trim().length < 27) {
				errors.push(`Позиция #${idx + 1}: некорректный SGTIN ("${it.sgtin}"). Требуется минимум 27 символов (GTIN 14 + SN 13).`);
			}
		});
	}

	return { isValid: errors.length === 0, errors };
}

export function generateMdlpSchema444Payload(
	params: MdlpSchema444Params,
	options: { version?: "1.37" | "1.38" | string | undefined } = {},
): MdlpSchema444Document {
	const validation = validateMdlpSchema444Params(params);
	if (!validation.isValid) {
		throw new Error(`Ошибка формирования схемы 444: ${validation.errors.join("; ")}`);
	}

	const opDate =
		params.operationDate instanceof Date
			? params.operationDate.toISOString()
			: typeof params.operationDate === "string" && params.operationDate
				? params.operationDate
				: new Date().toISOString();

	const schemaVersion = options.version ?? "1.38";
	const effectiveCardNumber = params.cardNumber || "043/у";

	const detailsTags = params.items
		.map((it) => {
			const costTag =
				it.costRub != null
					? `\n        <cost>${it.costRub.toFixed(2)}</cost>`
					: "";
			const vatTag =
				it.vatValueRub != null
					? `\n        <vat_value>${it.vatValueRub.toFixed(2)}</vat_value>`
					: "";
			return `      <union>\n        <detail>\n          <sgtin>${escapeXml(it.sgtin)}</sgtin>${costTag}${vatTag}\n        </detail>\n      </union>`;
		})
		.join("\n");

	const patientBlock = `    <patient_info>
      ${params.patientId ? `<patient_id>${escapeXml(params.patientId)}</patient_id>` : ""}
      <card_num>${escapeXml(effectiveCardNumber)}</card_num>
      ${params.doctorSnils ? `<doctor_snils>${escapeXml(params.doctorSnils.replace(/\D/g, ""))}</doctor_snils>` : ""}
    </patient_info>`;

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<documents version="${schemaVersion}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <medical_assistance action_id="444">
    <subject_id>${escapeXml(params.subjectId)}</subject_id>
    <operation_date>${escapeXml(opDate)}</operation_date>
    <doc_num>${escapeXml(params.docNum)}</doc_num>
    <doc_date>${escapeXml(params.docDate)}</doc_date>
${patientBlock}
    <order_details>
${detailsTags}
    </order_details>
  </medical_assistance>
</documents>`;

	const totalCostRub = params.items.reduce((sum, it) => sum + (it.costRub ?? 0), 0);

	const jsonContent: Record<string, unknown> = {
		action_id: 444,
		subject_id: params.subjectId,
		operation_date: opDate,
		doc_num: params.docNum,
		doc_date: params.docDate,
		patient_id: params.patientId ?? null,
		card_num: effectiveCardNumber,
		visit_id: params.visitId ?? null,
		doctor_id: params.doctorId ?? null,
		doctor_snils: params.doctorSnils ?? null,
		notes: params.notes ?? null,
		order_details: params.items.map((it) => ({
			sgtin: it.sgtin,
			gtin: it.gtin ?? it.sgtin.slice(0, 14),
			serial_number: it.serialNumber ?? it.sgtin.slice(14),
			cost: it.costRub != null ? Number(it.costRub.toFixed(2)) : null,
			vat_value: it.vatValueRub != null ? Number(it.vatValueRub.toFixed(2)) : null,
		})),
	};

	return {
		actionId: 444,
		subjectId: params.subjectId,
		operationDate: opDate,
		docNum: params.docNum,
		docDate: params.docDate,
		patientId: params.patientId ?? null,
		cardNumber: effectiveCardNumber,
		visitId: params.visitId ?? null,
		itemsCount: params.items.length,
		totalCostRub,
		xmlContent,
		jsonContent,
		items: params.items,
	};
}
