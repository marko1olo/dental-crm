/**
 * xmlStructureValidator.ts — XML Syntax & Statutory Document Type Validator
 */

export interface XmlStructureValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	tagCount: number;
	docTypeDetected?: "cda_r2" | "fns_knd_1151156" | "unknown";
}

export function validateXmlStructure(xml: string): XmlStructureValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!xml || typeof xml !== "string" || xml.trim().length === 0) {
		return { isValid: false, errors: ["XML документ пуст"], warnings: [], tagCount: 0 };
	}

	const cleanXml = xml.trim();
	if (!cleanXml.startsWith("<?xml")) {
		warnings.push('Отсутствует стандартный XML-пролог <?xml version="1.0" encoding="UTF-8"?>');
	}

	const tagRegex = /<\/?([a-zA-Z0-9_:\u0400-\u04FF.-]+)(?:\s+[^>]*?)?(\/?)>/gu;
	const tagStack: string[] = [];
	let match: RegExpExecArray | null = null;
	let tagCount = 0;

	const strippedXml = cleanXml
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
		.replace(/<\?[\s\S]*?\?>/g, "");

	while (true) {
		match = tagRegex.exec(strippedXml);
		if (match === null) break;
		tagCount++;
		const fullTag = match[0];
		const tagName = match[1] || "";
		const isSelfClosing = match[2] || "";
		const isClosingTag = fullTag.startsWith("</");

		if (isSelfClosing === "/" || fullTag.endsWith("/>")) {
			continue;
		}

		if (isClosingTag) {
			if (tagStack.length === 0) {
				errors.push(`Неожиданный закрывающий тег </${tagName}> без открывающего`);
				break;
			}
			const lastTag = tagStack.pop();
			if (lastTag !== tagName) {
				errors.push(`Нарушена вложенность тегов: ожидался закрывающий </${lastTag ?? "unknown"}>, получен </${tagName}>`);
				break;
			}
		} else if (tagName) {
			tagStack.push(tagName);
		}
	}

	if (tagStack.length > 0) {
		errors.push(`Обнаружены незакрытые XML-теги: ${tagStack.join(", ")}`);
	}

	let docTypeDetected: "cda_r2" | "fns_knd_1151156" | "unknown" = "unknown";

	if (cleanXml.includes("<ClinicalDocument") && cleanXml.includes("urn:hl7-org:v3")) {
		docTypeDetected = "cda_r2";
		if (!cleanXml.includes("<realmCode")) warnings.push('В CDA XML отсутствует тег <realmCode code="RU"/>');
		if (!cleanXml.includes("<typeId")) errors.push("В CDA XML отсутствует обязательный заголовок <typeId>");
		if (!cleanXml.includes("<templateId")) errors.push("В CDA XML отсутствует идентификатор шаблона СЭМД <templateId>");
		if (!cleanXml.includes("<recordTarget")) errors.push("В CDA XML отсутствуют сведения о пациенте <recordTarget>");
		if (!cleanXml.includes("<author")) errors.push("В CDA XML отсутствуют сведения об авторе (враче) <author>");
		if (!cleanXml.includes("<custodian")) errors.push("В CDA XML отсутствуют сведения об организации <custodian>");
		if (!cleanXml.includes("<legalAuthenticator")) errors.push("В CDA XML отсутствуют сведения о заверителе <legalAuthenticator>");
		if (!cleanXml.includes("<structuredBody")) errors.push("В CDA XML отсутствует тело документа <structuredBody>");
	} else if (cleanXml.includes("<Файл") && cleanXml.includes('КНД="1151156"')) {
		docTypeDetected = "fns_knd_1151156";
		if (!cleanXml.includes("<СвОрг") && !cleanXml.includes("<СвУчДок")) {
			errors.push("В XML справки ФНС отсутствуют сведения о медицинской организации <СвОрг>");
		}
		if (!cleanXml.includes("<СвФЛ")) errors.push("В XML справки ФНС отсутствуют сведения о налогоплательщике <СвФЛ>");
		if (!cleanXml.includes("<Пациент")) errors.push("В XML справки ФНС отсутствуют сведения о пациенте <Пациент>");
		if (!cleanXml.includes("<ОплатаУслуг")) errors.push("В XML справки ФНС отсутствует раздел <ОплатаУслуг>");
		if (!cleanXml.includes("<Подписант")) errors.push("В XML справки ФНС отсутствуют сведения о подписанте <Подписант>");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		tagCount,
		docTypeDetected,
	};
}
