import { escapeXml } from "../../cda/c14n.js";
import type {
	MdlpSchema701Document,
	MdlpSchema701Item,
	MdlpSchema701Params,
	SafeParseMdlpSchema701Result,
} from "./types.js";

/**
 * Validates parameters for Schema 701 (Acceptance of goods by invoice / UPD).
 */
export function validateMdlpSchema701Params(
	params: MdlpSchema701Params,
): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!params.subjectId || params.subjectId.trim().length === 0) {
		errors.push("Идентификатор субъекта обращения - получателя (subjectId) обязателен.");
	}

	if (!params.shipperId || params.shipperId.trim().length === 0) {
		errors.push("Идентификатор грузоотправителя / поставщика (shipperId) обязателен.");
	}

	if (!params.docNum || params.docNum.trim().length === 0) {
		errors.push("Номер первичного документа / УПД (docNum) обязателен.");
	}

	if (!params.docDate || params.docDate.trim().length === 0) {
		errors.push("Дата первичного документа / УПД (docDate) обязательна.");
	}

	if (!params.items || params.items.length === 0) {
		errors.push("Список принимаемых позиций (items) не может быть пустым.");
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
				errors.push(`Позиция #${idx + 1}: некорректная цена товара (${it.costRub}).`);
			}
		});
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Generates an official MDLP Schema 701 XML Document
 * "Регистрация в ИС МДЛП сведений об акцептовании лекарственных препаратов получателем" (701-accept-goods).
 */
export function generateMdlpSchema701Payload(
	params: MdlpSchema701Params,
	options: { version?: "1.37" | "1.38" | string | undefined } = {},
): MdlpSchema701Document {
	const validation = validateMdlpSchema701Params(params);
	if (!validation.isValid) {
		throw new Error(`Ошибка формирования схемы 701: ${validation.errors.join("; ")}`);
	}

	const opDate =
		params.operationDate instanceof Date
			? params.operationDate.toISOString()
			: typeof params.operationDate === "string" && params.operationDate
				? params.operationDate
				: new Date().toISOString();

	const receivingType = params.receivingType ?? 1;
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
  <accept_goods action_id="701">
    <subject_id>${escapeXml(params.subjectId)}</subject_id>
    <shipper_id>${escapeXml(params.shipperId)}</shipper_id>
    <operation_date>${escapeXml(opDate)}</operation_date>
    <doc_num>${escapeXml(params.docNum)}</doc_num>
    <doc_date>${escapeXml(params.docDate)}</doc_date>
    <receiving_type>${receivingType}</receiving_type>
    <order_details>
${sgtinTags}
    </order_details>
  </accept_goods>
</documents>`;

	const jsonContent: Record<string, unknown> = {
		action_id: 701,
		subject_id: params.subjectId,
		shipper_id: params.shipperId,
		operation_date: opDate,
		doc_num: params.docNum,
		doc_date: params.docDate,
		receiving_type: receivingType,
		order_details: params.items.map((it) => ({
			sgtin: it.sgtin,
			gtin: it.gtin ?? it.sgtin.slice(0, 14),
			serial_number: it.serialNumber ?? it.sgtin.slice(14),
			cost: it.costRub != null ? Number(it.costRub.toFixed(2)) : null,
			vat_value: it.vatValueRub != null ? Number(it.vatValueRub.toFixed(2)) : null,
		})),
	};

	return {
		actionId: 701,
		subjectId: params.subjectId,
		shipperId: params.shipperId,
		operationDate: opDate,
		docNum: params.docNum,
		docDate: params.docDate,
		receivingType,
		items: params.items,
		xmlContent,
		jsonContent,
	};
}

/**
 * Parses an MDLP Schema 701 XML document back into structured parameters.
 */
export function parseMdlpSchema701Xml(xml: string): MdlpSchema701Params {
	if (!xml || typeof xml !== "string" || !xml.includes('action_id="701"')) {
		throw new Error("Невалидный XML-документ схемы 701 МДЛП.");
	}

	const subjectMatch = xml.match(/<subject_id>([^<]+)<\/subject_id>/);
	const shipperMatch = xml.match(/<shipper_id>([^<]+)<\/shipper_id>/);
	const opDateMatch = xml.match(/<operation_date>([^<]+)<\/operation_date>/);
	const docNumMatch = xml.match(/<doc_num>([^<]+)<\/doc_num>/);
	const docDateMatch = xml.match(/<doc_date>([^<]+)<\/doc_date>/);
	const receivingTypeMatch = xml.match(/<receiving_type>([^<]+)<\/receiving_type>/);

	const subjectId = subjectMatch ? subjectMatch[1]!.trim() : "";
	const shipperId = shipperMatch ? shipperMatch[1]!.trim() : "";
	const operationDate = opDateMatch ? opDateMatch[1]!.trim() : new Date().toISOString();
	const docNum = docNumMatch ? docNumMatch[1]!.trim() : "";
	const docDate = docDateMatch ? docDateMatch[1]!.trim() : "";
	const receivingType = (receivingTypeMatch ? Number.parseInt(receivingTypeMatch[1]!.trim(), 10) : 1) as 1 | 2;

	const items: MdlpSchema701Item[] = [];
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
		shipperId,
		operationDate,
		docNum,
		docDate,
		receivingType,
		items,
	};
}

/**
 * Gracefully parses an MDLP Schema 701 XML document without throwing unhandled exceptions.
 */
export function safeParseMdlpSchema701Xml(xml: unknown): SafeParseMdlpSchema701Result {
	if (!xml || typeof xml !== "string") {
		return {
			success: false,
			errors: ["Входные данные XML отсутствуют или не являются строкой."],
		};
	}

	if (!xml.includes('action_id="701"') && !xml.includes("701")) {
		return {
			success: false,
			errors: ['Документ не содержит идентификатор действия схемы 701 МДЛП (action_id="701").'],
		};
	}

	try {
		const parsed = parseMdlpSchema701Xml(xml);
		const validation = validateMdlpSchema701Params(parsed);
		if (!validation.isValid) {
			return { success: false, errors: validation.errors };
		}
		return { success: true, data: parsed };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Неизвестная ошибка разбора XML схемы 701";
		return { success: false, errors: [message] };
	}
}
