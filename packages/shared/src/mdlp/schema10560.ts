import { escapeXml } from "../cda/c14n.js";
import type {
	MdlpDisposalItem,
	MdlpDisposalParams,
	MdlpSchema10560Document,
} from "./types.js";

/**
 * Escapes XML special characters and strips non-printable control characters for MDLP schemas.
 */
export function escapeMdlpXml(unsafe: unknown): string {
	return escapeXml(unsafe);
}

/**
 * Validates parameters for MDLP Schema 10560.
 */
export function validateMdlpSchema10560Params(
	params: MdlpDisposalParams,
): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!params.subjectId || params.subjectId.trim().length === 0) {
		errors.push("Идентификатор субъекта обращения МДЛП (subjectId) обязателен.");
	}

	if (!params.docNum || params.docNum.trim().length === 0) {
		errors.push("Номер первичного медицинского документа (docNum) обязателен.");
	}

	if (!params.docDate || params.docDate.trim().length === 0) {
		errors.push("Дата первичного документа (docDate) обязательна.");
	}

	if (!params.items || params.items.length === 0) {
		errors.push("Список списываемых медикаментов (items) не может быть пустым.");
	} else {
		params.items.forEach((it, idx) => {
			if (!it.sgtin || it.sgtin.trim().length === 0) {
				errors.push(`Позиция #${idx + 1}: отсутствует обязательный SGTIN.`);
			} else if (it.sgtin.length < 20) {
				errors.push(
					`Позиция #${idx + 1}: некорректная длина SGTIN "${it.sgtin}" (требуется >= 20 символов).`,
				);
			}
			if (it.costRub != null && (Number.isNaN(it.costRub) || it.costRub < 0)) {
				errors.push(`Позиция #${idx + 1}: некорректная стоимость препарата (${it.costRub}).`);
			}
		});
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Generates an official MDLP Schema 10560 Document
 * "Регистрация в ИС МДЛП сведений о выводе из оборота лекарственных препаратов для оказания медицинской помощи"
 * (Схема 10560, withdrawal_type = 13 или 6).
 */
export function generateMdlpSchema10560Payload(
	params: MdlpDisposalParams,
	options: { version?: "1.37" | "1.38" | undefined; defaultWithdrawalType?: number | undefined } = {},
): MdlpSchema10560Document {
	const validation = validateMdlpSchema10560Params(params);
	if (!validation.isValid) {
		throw new Error(`Ошибка формирования схемы 10560: ${validation.errors.join("; ")}`);
	}

	const opDate =
		params.operationDate instanceof Date
			? params.operationDate.toISOString()
			: typeof params.operationDate === "string" && params.operationDate
				? params.operationDate
				: new Date().toISOString();

	const withdrawalType = (params.withdrawalType ?? options.defaultWithdrawalType ?? 13) as 13;
	const schemaVersion = options.version ?? "1.38";

	// XML Document Structure according to official MDLP XSD schema 10560
	const sgtinTags = params.items
		.map((it) => {
			const costTag =
				it.costRub != null
					? `\n        <cost>${it.costRub.toFixed(2)}</cost>`
					: "";
			return `      <union>\n        <sgtin>${escapeXml(it.sgtin)}</sgtin>${costTag}\n      </union>`;
		})
		.join("\n");

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<documents version="${schemaVersion}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <withdrawal action_id="10560">
    <subject_id>${escapeXml(params.subjectId)}</subject_id>
    <operation_date>${escapeXml(opDate)}</operation_date>
    <doc_num>${escapeXml(params.docNum)}</doc_num>
    <doc_date>${escapeXml(params.docDate)}</doc_date>
    <withdrawal_type>${withdrawalType}</withdrawal_type>
    <order_details>
${sgtinTags}
    </order_details>
  </withdrawal>
</documents>`;

	const jsonContent: Record<string, unknown> = {
		action_id: 10560,
		subject_id: params.subjectId,
		operation_date: opDate,
		doc_num: params.docNum,
		doc_date: params.docDate,
		withdrawal_type: withdrawalType,
		patient_id: params.patientId ?? null,
		visit_id: params.visitId ?? null,
		doctor_id: params.doctorId ?? null,
		notes: params.notes ?? null,
		order_details: params.items.map((it) => ({
			sgtin: it.sgtin,
			gtin: it.gtin,
			serial_number: it.serialNumber,
			series: it.series ?? null,
			lot: it.lot ?? null,
			cost: it.costRub != null ? Number(it.costRub.toFixed(2)) : null,
			trade_name: it.tradeName ?? null,
			inn: it.inn ?? null,
		})),
	};

	return {
		actionId: 10560,
		subjectId: params.subjectId,
		operationDate: opDate,
		docNum: params.docNum,
		docDate: params.docDate,
		withdrawalType,
		patientId: params.patientId ?? null,
		visitId: params.visitId ?? null,
		doctorId: params.doctorId ?? null,
		items: params.items,
		xmlContent,
		jsonContent,
	};
}

/**
 * Parses an MDLP Schema 10560 XML document back into structured parameters.
 */
export function parseMdlpSchema10560Xml(xml: string): MdlpDisposalParams {
	if (!xml || typeof xml !== "string" || !xml.includes('action_id="10560"')) {
		throw new Error("Невалидный XML-документ схемы 10560 МДЛП.");
	}

	const subjectMatch = xml.match(/<subject_id>([^<]+)<\/subject_id>/);
	const opDateMatch = xml.match(/<operation_date>([^<]+)<\/operation_date>/);
	const docNumMatch = xml.match(/<doc_num>([^<]+)<\/doc_num>/);
	const docDateMatch = xml.match(/<doc_date>([^<]+)<\/doc_date>/);
	const withdrawalTypeMatch = xml.match(/<withdrawal_type>([^<]+)<\/withdrawal_type>/);

	const subjectId = subjectMatch ? subjectMatch[1]!.trim() : "";
	const operationDate = opDateMatch ? opDateMatch[1]!.trim() : new Date().toISOString();
	const docNum = docNumMatch ? docNumMatch[1]!.trim() : "";
	const docDate = docDateMatch ? docDateMatch[1]!.trim() : "";
	const withdrawalType = withdrawalTypeMatch ? Number.parseInt(withdrawalTypeMatch[1]!.trim(), 10) : 13;

	const items: MdlpDisposalItem[] = [];
	const unionRegex = /<union>([\s\S]*?)<\/union>/g;
	let match: RegExpExecArray | null;

	while ((match = unionRegex.exec(xml)) !== null) {
		const block = match[1]!;
		const sgtinMatch = block.match(/<sgtin>([^<]+)<\/sgtin>/);
		const costMatch = block.match(/<cost>([^<]+)<\/cost>/);

		if (sgtinMatch) {
			const sgtin = sgtinMatch[1]!.trim();
			const costRub = costMatch ? Number.parseFloat(costMatch[1]!.trim()) : undefined;
			const gtin = sgtin.slice(0, 14);
			const serialNumber = sgtin.slice(14);

			items.push({
				sgtin,
				gtin,
				serialNumber,
				costRub: Number.isNaN(costRub) ? undefined : costRub,
			});
		}
	}

	return {
		subjectId,
		operationDate,
		docNum,
		docDate,
		withdrawalType,
		items,
	};
}

export type SafeParseMdlpSchema10560Result =
	| { success: true; data: MdlpDisposalParams }
	| { success: false; errors: string[] };

/**
 * Gracefully parses an MDLP Schema 10560 XML document without throwing exceptions.
 */
export function safeParseMdlpSchema10560Xml(xml: unknown): SafeParseMdlpSchema10560Result {
	if (!xml || typeof xml !== "string") {
		return {
			success: false,
			errors: ["Входные данные XML отсутствуют или не являются строкой."],
		};
	}

	if (!xml.includes('action_id="10560"') && !xml.includes("10560")) {
		return {
			success: false,
			errors: ["Документ не содержит идентификатор действия схемы 10560 МДЛП (action_id=\"10560\")."],
		};
	}

	try {
		const parsed = parseMdlpSchema10560Xml(xml);
		const validation = validateMdlpSchema10560Params(parsed);
		if (!validation.isValid) {
			return { success: false, errors: validation.errors };
		}
		return { success: true, data: parsed };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Неизвестная ошибка разбора XML схемы 10560";
		return { success: false, errors: [message] };
	}
}

