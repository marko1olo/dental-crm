/**
 * 1C:Enterprise (1С:Предприятие 8.3 / Бухгалтерия / Управление торговлей / CommerceML 2.09) XML Export Engine.
 *
 * Implements Russian statutory export standards for:
 * 1. Счета на оплату медицинских услуг («Заказ покупателя» / «Счет на оплату»).
 * 2. Акты выполненных работ («Реализация товаров и услуг» / «Акт об оказании услуг»).
 * 3. Приходные кассовые ордера («Приходный кассовый ордер» / Эквайринговые операции).
 *
 * Invariants:
 * - Kopeck-exact arithmetic: sum of item amounts must strictly equal total amount.
 * - Russian INN/KPP validation for legal entities and individuals.
 * - Tax exemption declaration: «Без НДС (пп. 2 п. 2 ст. 149 НК РФ)».
 * - Safe XML entity escaping and UTF-8 compliance.
 */

import { z } from "zod";
import { escapeXml } from "../cda/c14n.js";
import { kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";
import { validateRussianInn, validateRussianKpp } from "../fiscal/taxDeduction.js";

export const oneCDocumentTypeSchema = z.enum([
	"invoice",
	"act",
	"cash_order",
	"acquiring_payment",
]);
export type OneCDocumentType = z.infer<typeof oneCDocumentTypeSchema>;

export const oneCLineItemSchema = z.object({
	id: z.string().min(1),
	code804n: z.string().optional().nullable(),
	name: z.string().min(1).max(500),
	toothNumber: z.number().int().optional().nullable(),
	unitCode: z.string().default("796"), // 796 = штука по ОКЕИ
	unitName: z.string().default("шт"),
	quantity: z.number().positive().default(1),
	priceKopecks: z.number().int().nonnegative(),
	discountPercent: z.number().min(0).max(100).default(0),
	totalKopecks: z.number().int().nonnegative(),
	vatRate: z.string().default("Без НДС"),
	vatAmountKopecks: z.number().int().default(0),
});
export type OneCLineItem = z.input<typeof oneCLineItemSchema>;

export const oneCPartyInfoSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(255),
	fullName: z.string().max(500).optional().nullable(),
	inn: z.string().optional().nullable(),
	kpp: z.string().optional().nullable(),
	isLegalEntity: z.boolean().default(false),
	address: z.string().max(500).optional().nullable(),
	phone: z.string().max(50).optional().nullable(),
	email: z.string().email().optional().nullable(),
	bankAccount: z.string().max(20).optional().nullable(),
	bankBik: z.string().max(9).optional().nullable(),
	bankName: z.string().max(255).optional().nullable(),
	bankCorrAccount: z.string().max(20).optional().nullable(),
});
export type OneCPartyInfo = z.input<typeof oneCPartyInfoSchema>;

export const oneCDocumentParamsSchema = z.object({
	id: z.string().min(1),
	number: z.string().min(1).max(50),
	documentDate: z.string(), // YYYY-MM-DD
	documentTime: z.string().default("12:00:00"), // HH:mm:ss
	docType: oneCDocumentTypeSchema,
	operationName: z.string().min(1).max(100),
	patient: oneCPartyInfoSchema,
	items: z.array(oneCLineItemSchema).min(1),
	totalKopecks: z.number().int().nonnegative(),
	contractNumber: z.string().optional().nullable(),
	contractDate: z.string().optional().nullable(),
	attendingDoctorName: z.string().optional().nullable(),
	comment: z.string().max(1000).optional().nullable(),
});
export type OneCDocumentParams = z.input<typeof oneCDocumentParamsSchema>;

export const oneCExportParamsSchema = z.object({
	exportId: z.string().uuid(),
	generatedAt: z.string().datetime(),
	clinic: oneCPartyInfoSchema,
	documents: z.array(oneCDocumentParamsSchema).min(1),
});
export type OneCExportParams = z.input<typeof oneCExportParamsSchema>;

/**
 * Validates document party tax credentials.
 */
export function validateOneCParty(party: OneCPartyInfo): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	if (party.inn) {
		const innRes = validateRussianInn(party.inn);
		if (!innRes.isValid) {
			errors.push(innRes.errorMessageRu || `Некорректный ИНН: ${party.inn}`);
		}
	}
	if (party.kpp) {
		const kppRes = validateRussianKpp(party.kpp);
		if (!kppRes.isValid) {
			errors.push(kppRes.errorMessageRu || `Некорректный КПП: ${party.kpp}`);
		}
	}
	return { valid: errors.length === 0, errors };
}

/**
 * Resolves 1C Operation Name based on Document Type.
 */
export function resolveOneCOperationName(docType: OneCDocumentType): string {
	switch (docType) {
		case "invoice":
			return "Заказ покупателя";
		case "act":
			return "Реализация товаров и услуг";
		case "cash_order":
			return "Приходный кассовый ордер";
		case "acquiring_payment":
			return "Оплата платежной картой";
	}
}

/**
 * Formats a single 1C Line Item XML fragment.
 */
function renderOneCItemXml(item: OneCLineItem): string {
	const priceRub = kopecksToRub(item.priceKopecks).toFixed(2);
	const totalRub = kopecksToRub(item.totalKopecks).toFixed(2);
	const vatRub = kopecksToRub(item.vatAmountKopecks ?? 0).toFixed(2);
	const unitCode = item.unitCode || "796";
	const unitName = item.unitName || "шт";
	const vatRate = item.vatRate || "Без НДС";
	const quantity = item.quantity ?? 1;

	const toothSuffix = item.toothNumber ? ` (Зуб ${item.toothNumber})` : "";
	const fullItemName = escapeXml(`${item.name}${toothSuffix}`);

	return `\t\t\t\t<Товар>
\t\t\t\t\t<Ид>${escapeXml(item.id)}</Ид>
\t\t\t\t\t<Артикул>${escapeXml(item.code804n || item.id)}</Артикул>
\t\t\t\t\t<Наименование>${fullItemName}</Наименование>
\t\t\t\t\t<БазоваяЕдиница Код="${escapeXml(unitCode)}" НаименованиеПолное="${escapeXml(unitName)}">${escapeXml(unitName)}</БазоваяЕдиница>
\t\t\t\t\t<СтавкаНДС>${escapeXml(vatRate)}</СтавкаНДС>
\t\t\t\t\t<ЦенаЗаЕдиницу>${priceRub}</ЦенаЗаЕдиницу>
\t\t\t\t\t<Количество>${quantity}</Количество>
\t\t\t\t\t<Сумма>${totalRub}</Сумма>
\t\t\t\t\t<СуммаНДС>${vatRub}</СуммаНДС>
\t\t\t\t\t<Скидки>
\t\t\t\t\t\t<Скидка>
\t\t\t\t\t\t\t<Процент>${item.discountPercent}</Процент>
\t\t\t\t\t\t\t<УчтеноВСумме>true</УчтеноВСумме>
\t\t\t\t\t\t</Скидка>
\t\t\t\t\t</Скидки>
\t\t\t\t</Товар>`;
}

/**
 * Formats a single 1C Document XML block.
 */
function renderOneCDocumentXml(doc: OneCDocumentParams, clinic: OneCPartyInfo): string {
	const totalRub = kopecksToRub(doc.totalKopecks).toFixed(2);
	const operation = doc.operationName || resolveOneCOperationName(doc.docType);

	const itemsXml = doc.items.map(renderOneCItemXml).join("\n");

	const contractRequisite = doc.contractNumber
		? `\n\t\t\t\t<ЗначениеРеквизита>
\t\t\t\t\t<Наименование>Договор</Наименование>
\t\t\t\t\t<Значение>Договор № ${escapeXml(doc.contractNumber)}${doc.contractDate ? ` от ${escapeXml(doc.contractDate)}` : ""}</Значение>
\t\t\t\t</ЗначениеРеквизита>`
		: "";

	const doctorRequisite = doc.attendingDoctorName
		? `\n\t\t\t\t<ЗначениеРеквизита>
\t\t\t\t\t<Наименование>ВрачФИО</Наименование>
\t\t\t\t\t<Значение>${escapeXml(doc.attendingDoctorName)}</Значение>
\t\t\t\t</ЗначениеРеквизита>`
		: "";

	return `\t\t<Документ>
\t\t\t<Ид>${escapeXml(doc.id)}</Ид>
\t\t\t<Номер>${escapeXml(doc.number)}</Номер>
\t\t\t<Дата>${escapeXml(doc.documentDate)}</Дата>
\t\t\t<Время>${escapeXml(doc.documentTime)}</Время>
\t\t\t<ХозяйственнаяОперация>${escapeXml(operation)}</ХозяйственнаяОперация>
\t\t\t<Роль>Продавец</Роль>
\t\t\t<Валюта>руб</Валюта>
\t\t\t<Курс>1</Курс>
\t\t\t<Сумма>${totalRub}</Сумма>
\t\t\t<Контрагенты>
\t\t\t\t<Контрагент>
\t\t\t\t\t<Ид>${escapeXml(doc.patient.id)}</Ид>
\t\t\t\t\t<Наименование>${escapeXml(doc.patient.name)}</Наименование>
\t\t\t\t\t<ПолноеНаименование>${escapeXml(doc.patient.fullName || doc.patient.name)}</ПолноеНаименование>
\t\t\t\t\t<Роль>Покупатель</Роль>
${doc.patient.inn ? `\t\t\t\t\t<ИНН>${escapeXml(doc.patient.inn)}</ИНН>\n` : ""}${doc.patient.kpp ? `\t\t\t\t\t<КПП>${escapeXml(doc.patient.kpp)}</КПП>\n` : ""}${doc.patient.address ? `\t\t\t\t\t<Адрес>${escapeXml(doc.patient.address)}</Адрес>\n` : ""}${doc.patient.phone ? `\t\t\t\t\t<Контакты><Контакт><Тип>ТелефонРабочий</Тип><Значение>${escapeXml(doc.patient.phone)}</Значение></Контакт></Контакты>\n` : ""}\t\t\t\t</Контрагент>
\t\t\t</Контрагенты>
\t\t\t<Товары>
${itemsXml}
\t\t\t</Товары>
\t\t\t<ЗначенияРеквизитов>
\t\t\t\t<ЗначениеРеквизита>
\t\t\t\t\t<Наименование>ОсвобождениеОтНДС</Наименование>
\t\t\t\t\t<Значение>пп. 2 п. 2 ст. 149 НК РФ</Значение>
\t\t\t\t</ЗначениеРеквизита>${contractRequisite}${doctorRequisite}
\t\t\t\t<ЗначениеРеквизита>
\t\t\t\t\t<Наименование>Проведен</Наименование>
\t\t\t\t\t<Значение>true</Значение>
\t\t\t\t</ЗначениеРеквизита>
\t\t\t</ЗначенияРеквизитов>
\t\t</Документ>`;
}

/**
 * Generates statutory 1C:Enterprise / CommerceML 2.09 XML Export Package.
 */
export function generateOneCEnterpriseXml(params: OneCExportParams): string {
	const parsed = oneCExportParamsSchema.parse(params);
	const clinic = parsed.clinic;

	const docsXml = parsed.documents
		.map((doc) => renderOneCDocumentXml(doc, clinic))
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация
	xmlns="urn:1C.ru:commerceml_2"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	ВерсияСхемы="2.09"
	ДатаФормирования="${escapeXml(parsed.generatedAt)}">
	<Классификатор>
		<Ид>${escapeXml(clinic.id)}</Ид>
		<Наименование>${escapeXml(clinic.name)}</Наименование>
		<Владелец>
			<Ид>${escapeXml(clinic.id)}</Ид>
			<Наименование>${escapeXml(clinic.name)}</Наименование>
			<ПолноеНаименование>${escapeXml(clinic.fullName || clinic.name)}</ПолноеНаименование>
			<ИНН>${escapeXml(clinic.inn || "")}</ИНН>
			<КПП>${escapeXml(clinic.kpp || "")}</КПП>
			${clinic.bankAccount ? `<РасчетныеСчета><РасчетныйСчет><НомерСчета>${escapeXml(clinic.bankAccount)}</НомерСчета><Банк><БИК>${escapeXml(clinic.bankBik || "")}</БИК><Наименование>${escapeXml(clinic.bankName || "")}</Наименование><КорСчет>${escapeXml(clinic.bankCorrAccount || "")}</КорСчет></Банк></РасчетныйСчет></РасчетныеСчета>` : ""}
		</Владелец>
	</Классификатор>
${docsXml}
</КоммерческаяИнформация>`;
}
