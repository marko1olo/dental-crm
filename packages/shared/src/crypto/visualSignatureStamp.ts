/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VISUAL DIGITAL SIGNATURE STAMP GENERATOR (ГОСТ Р 7.0.97-2016 РАЗД. 5.23)
 * Renders official dynamic blue electronic signature stamps for clinical and
 * financial documents (043/u, informed consents, treatment plans, acts).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

export const visualSignatureStampParamsSchema = z.object({
	certificateSerialNumber: z.string().trim().min(1, "Серийный номер обязателен"),
	certificateSubject: z.string().trim().min(1, "Владелец сертификата обязателен"),
	certificateIssuer: z.string().trim().optional(),
	validFrom: z.string().trim().min(1, "Дата начала действия обязательна"),
	validTo: z.string().trim().min(1, "Дата окончания действия обязательна"),
	signedAt: z.string().trim().optional(),
	signatureType: z.enum(["ukep", "unep"]).default("ukep"),
	organizationName: z.string().trim().optional(),
	documentId: z.string().trim().optional(),
});
export type VisualSignatureStampParams = z.infer<typeof visualSignatureStampParamsSchema>;

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

function formatDateRu(isoString: string): string {
	try {
		const d = new Date(isoString);
		if (Number.isNaN(d.getTime())) return isoString;
		return d.toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	} catch {
		return isoString;
	}
}

function formatDateTimeRu(isoString: string): string {
	try {
		const d = new Date(isoString);
		if (Number.isNaN(d.getTime())) return isoString;
		return d.toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			timeZone: "Europe/Moscow",
		}) + " (МСК)";
	} catch {
		return isoString;
	}
}

/**
 * Генерирует HTML официального визуального синего штампа электронной подписи
 * строго по ГОСТ Р 7.0.97-2016 (раздел 5.23 "Отметка об электронной подписи")
 * и методическим рекомендациям Минкомсвязи/Минцифры России.
 */
export function renderDigitalSignatureStampHtml(params: VisualSignatureStampParams): string {
	const parsed = visualSignatureStampParamsSchema.parse(params);

	const validFromRu = formatDateRu(parsed.validFrom);
	const validToRu = formatDateRu(parsed.validTo);
	const signedAtRu = parsed.signedAt ? formatDateTimeRu(parsed.signedAt) : null;

	const signatureTypeLabel =
		parsed.signatureType === "ukep"
			? "Усиленная квалифицированная электронная подпись (УКЭП)"
			: "Усиленная неквалифицированная электронная подпись (УНЭП)";

	// Традиционный синий цвет штампа Госуслуг и Минздрава: #003399
	return `<!-- BEGIN_GOST_SIGNATURE_STAMP -->
<div class="gost-digital-stamp" style="
  box-sizing: border-box;
  display: inline-block;
  border: 2px solid #003399;
  border-radius: 4px;
  padding: 8px 12px;
  background-color: #f4f8ff;
  color: #003399;
  font-family: 'PT Astra Sans', Arial, Helvetica, sans-serif;
  font-size: 8pt;
  line-height: 1.3;
  width: 100%;
  max-width: 380px;
  margin: 10px 0;
  text-align: left;
  page-break-inside: avoid;
">
  <div style="
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #003399;
    padding-bottom: 4px;
    margin-bottom: 6px;
  ">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;" aria-label="Герб / ЭЦП">
      <path d="M12 2L4 5V11C4 16.52 7.41 21.61 12 22.88C16.59 21.61 20 16.52 20 11V5L12 2Z" fill="#003399" fill-opacity="0.12" stroke="#003399" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M9 12L11 14L15 10" stroke="#003399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div style="flex: 1;">
      <div style="font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.15; color: #003399;">
        ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ
      </div>
      <div style="font-size: 6.5pt; font-weight: 600; color: #002266; text-transform: uppercase; margin-top: 1px;">
        ${escapeXml(signatureTypeLabel)}
      </div>
    </div>
  </div>

  <div style="font-size: 7.5pt; color: #002266;">
    <div style="margin-bottom: 2px; word-break: break-all;">
      <strong>Сертификат:</strong> ${escapeXml(parsed.certificateSerialNumber)}
    </div>
    <div style="margin-bottom: 2px; word-break: break-word;">
      <strong>Владелец:</strong> ${escapeXml(parsed.certificateSubject)}
    </div>
    <div style="margin-bottom: 2px;">
      <strong>Действителен:</strong> с ${escapeXml(validFromRu)} по ${escapeXml(validToRu)}
    </div>
    ${
			signedAtRu
				? `<div style="margin-top: 3px; padding-top: 2px; border-top: 1px dashed rgba(0,51,153,0.3); font-size: 7pt;">
      <strong>Подписано:</strong> ${escapeXml(signedAtRu)}
    </div>`
				: ""
		}
  </div>
</div>
<!-- END_GOST_SIGNATURE_STAMP -->`;
}

/**
 * Инжектирует визуальный синий штамп электронной подписи в HTML документа.
 * Находит место подписи врача/клиники (signature-right / signatures) и замещает
 * бумажные прочерки «Подпись: _________ / _________ /» официальным штампом.
 */
export function injectVisualSignatureStampIntoHtml(
	html: string,
	stampHtml: string,
): string {
	if (!html || !stampHtml) return html;

	// Если штамп уже внедрен — не дублируем
	if (html.includes("BEGIN_GOST_SIGNATURE_STAMP") || html.includes("<div class=\"gost-digital-stamp\"")) {
		return html;
	}

	// 1. Поиск блока signature-right (подпись врача / представителя клиники)
	const signatureRightRegex = /(<section class="signature-column signature-right">[\s\S]*?)(<\/section>)/i;
	if (signatureRightRegex.test(html)) {
		return html.replace(signatureRightRegex, (_match, before, closing) => {
			// Убираем пустые линии для ручной подписи и М.П.
			const cleanedBefore = before
				.replace(/<p class="signature-line">[\s\S]*?<\/p>/gi, "")
				.replace(/<p class="signature-subtext">[\s\S]*?<\/p>/gi, "")
				.replace(/<p class="signature-stamps">[\s\S]*?<\/p>/gi, "");
			return `${cleanedBefore}\n${stampHtml}\n${closing}`;
		});
	}

	// 2. Поиск стандартного блока signatures
	const signaturesRegex = /(<div class="signatures">[\s\S]*?)(<\/div>)/i;
	if (signaturesRegex.test(html)) {
		return html.replace(signaturesRegex, (_match, content, closing) => {
			return `${content}\n<div style="margin-top: 12px; text-align: right;">${stampHtml}</div>\n${closing}`;
		});
	}

	// 3. Поиск секции ИДС sign-block врача
	const signBlockRegex = /(<div class="sign-block">[\s\S]*?Врач[\s\S]*?)(<\/div>)/i;
	if (signBlockRegex.test(html)) {
		return html.replace(signBlockRegex, (_match, before, closing) => {
			const cleaned = before
				.replace(/<div class="sign-line"><\/div>/gi, "")
				.replace(/<div style="font-size:7\.5pt;[^>]*>\(подпись[^<]*<\/div>/gi, "");
			return `${cleaned}\n${stampHtml}\n${closing}`;
		});
	}

	// 4. Поиск окончания тела документа перед </body>
	if (html.includes("</body>")) {
		return html.replace("</body>", `<div style="margin: 20px 0; text-align: right;">${stampHtml}</div>\n</body>`);
	}

	// 5. Fallback: просто дописать в конец
	return `${html}\n${stampHtml}`;
}
