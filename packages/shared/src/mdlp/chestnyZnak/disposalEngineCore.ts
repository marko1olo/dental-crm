import { escapeXml } from "../../cda/c14n.js";
import type {
	ChestnyZnakScannedItem,
	ChestnyZnakScanSummary,
	MdlpSchema531Document,
	MdlpSchema531Item,
	MdlpSchema531Params,
	SafeParseMdlpSchema531Result,
} from "./types.js";

/**
 * Validates parameters for Schema 531 (Disposal of drugs for medical care).
 */
export function validateMdlpSchema531Params(
	params: MdlpSchema531Params,
): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!params.subjectId || params.subjectId.trim().length === 0) {
		errors.push("Идентификатор субъекта обращения МДЛП (subjectId) обязателен.");
	}

	if (!params.docNum || params.docNum.trim().length === 0) {
		errors.push("Номер первичного медицинского документа (docNum) обязателен.");
	}

	if (!params.docDate || params.docDate.trim().length === 0) {
		errors.push("Дата первичного медицинского документа (docDate) обязательна.");
	}

	if (!params.items || params.items.length === 0) {
		errors.push("Список списываемых медикаментов (items) не может быть пустым.");
	} else {
		params.items.forEach((it, idx) => {
			if (!it.sgtin || it.sgtin.trim().length === 0) {
				errors.push(`Позиция #${idx + 1}: отсутствует обязательный SGTIN.`);
			} else if (it.sgtin.length < 18) {
				errors.push(
					`Позиция #${idx + 1}: некорректная длина SGTIN "${it.sgtin}" (ожидается >= 18 символов).`,
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
 * Generates an official MDLP Schema 531 XML Document
 * "Регистрация в ИС МДЛП сведений о выводе из оборота лекарственных препаратов для оказания медицинской помощи" (531-withdrawal).
 */
export function generateMdlpSchema531Payload(
	params: MdlpSchema531Params,
	options: { version?: "1.37" | "1.38" | string | undefined } = {},
): MdlpSchema531Document {
	const validation = validateMdlpSchema531Params(params);
	if (!validation.isValid) {
		throw new Error(`Ошибка формирования схемы 531: ${validation.errors.join("; ")}`);
	}

	const opDate =
		params.operationDate instanceof Date
			? params.operationDate.toISOString()
			: typeof params.operationDate === "string" && params.operationDate
				? params.operationDate
				: new Date().toISOString();

	const withdrawalType = params.withdrawalType ?? 13;
	const schemaVersion = options.version ?? "1.38";

	const sgtinTags = params.items
		.map((it) => {
			const costTag =
				it.costRub != null
					? `\n        <cost>${it.costRub.toFixed(2)}</cost>`
					: "";
			const vatTag =
				it.vatValueRub != null
					? `\n        <vat_value>${it.vatValueRub.toFixed(2)}</vat_value>`
					: "";
			return `      <union>\n        <sgtin>${escapeXml(it.sgtin)}</sgtin>${costTag}${vatTag}\n      </union>`;
		})
		.join("\n");

	const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<documents version="${schemaVersion}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <withdrawal action_id="531">
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
		action_id: 531,
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
			gtin: it.gtin ?? it.sgtin.slice(0, 14),
			serial_number: it.serialNumber ?? it.sgtin.slice(14),
			cost: it.costRub != null ? Number(it.costRub.toFixed(2)) : null,
			vat_value: it.vatValueRub != null ? Number(it.vatValueRub.toFixed(2)) : null,
		})),
	};

	return {
		actionId: 531,
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
 * Parses an MDLP Schema 531 XML document back into structured parameters.
 */
export function parseMdlpSchema531Xml(xml: string): MdlpSchema531Params {
	if (!xml || typeof xml !== "string" || !xml.includes('action_id="531"')) {
		throw new Error("Невалидный XML-документ схемы 531 МДЛП.");
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

	const items: MdlpSchema531Item[] = [];
	const unionRegex = /<union>([\s\S]*?)<\/union>/g;
	let match: RegExpExecArray | null;

	while ((match = unionRegex.exec(xml)) !== null) {
		const block = match[1]!;
		const sgtinMatch = block.match(/<sgtin>([^<]+)<\/sgtin>/);
		const costMatch = block.match(/<cost>([^<]+)<\/cost>/);
		const vatMatch = block.match(/<vat_value>([^<]+)<\/vat_value>/);

		if (sgtinMatch) {
			const sgtin = sgtinMatch[1]!.trim();
			const costRub = costMatch ? Number.parseFloat(costMatch[1]!.trim()) : undefined;
			const vatValueRub = vatMatch ? Number.parseFloat(vatMatch[1]!.trim()) : undefined;
			const gtin = sgtin.slice(0, 14);
			const serialNumber = sgtin.slice(14);

			items.push({
				sgtin,
				gtin,
				serialNumber,
				costRub: Number.isNaN(costRub) ? undefined : costRub,
				vatValueRub: Number.isNaN(vatValueRub) ? undefined : vatValueRub,
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

/**
 * Gracefully parses an MDLP Schema 531 XML document without throwing exceptions.
 */
export function safeParseMdlpSchema531Xml(xml: unknown): SafeParseMdlpSchema531Result {
	if (!xml || typeof xml !== "string") {
		return {
			success: false,
			errors: ["Входные данные XML отсутствуют или не являются строкой."],
		};
	}

	if (!xml.includes('action_id="531"') && !xml.includes("531")) {
		return {
			success: false,
			errors: ['Документ не содержит идентификатор действия схемы 531 МДЛП (action_id="531").'],
		};
	}

	try {
		const parsed = parseMdlpSchema531Xml(xml);
		const validation = validateMdlpSchema531Params(parsed);
		if (!validation.isValid) {
			return { success: false, errors: validation.errors };
		}
		return { success: true, data: parsed };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Неизвестная ошибка разбора XML схемы 531";
		return { success: false, errors: [message] };
	}
}

/**
 * Calculates live summary and statistics for a list of scanned Chestny ZNAK items.
 */
export function calculateChestnyZnakSummary(
	items: readonly ChestnyZnakScannedItem[],
): ChestnyZnakScanSummary {
	let verifiedCount = 0;
	let warningCount = 0;
	let expiredCount = 0;
	let invalidCount = 0;
	let totalCostRub = 0;

	const gtinSet = new Set<string>();
	const seriesSet = new Set<string>();

	for (const item of items) {
		if (item.status === "verified") {
			verifiedCount++;
		} else if (item.status === "warning") {
			warningCount++;
		} else if (item.status === "expired") {
			expiredCount++;
		} else {
			invalidCount++;
		}

		if (item.costRub != null && item.costRub > 0) {
			totalCostRub += item.costRub;
		}

		if (item.gtin) {
			gtinSet.add(item.gtin);
		}
		if (item.series) {
			seriesSet.add(item.series);
		}
	}

	return {
		totalCount: items.length,
		verifiedCount,
		warningCount,
		expiredCount,
		invalidCount,
		totalCostRub: Math.round(totalCostRub * 100) / 100,
		uniqueGtinCount: gtinSet.size,
		uniqueSeriesCount: seriesSet.size,
	};
}
