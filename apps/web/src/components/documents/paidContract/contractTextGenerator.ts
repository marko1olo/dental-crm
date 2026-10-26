/**
 * paidContract/contractTextGenerator.ts
 * Plain text representation of medical services contract for archive (Mandate 8b <= 120 lines)
 */

import { formatKopecksToRubAndKop } from "./money";
import type { PaidContractData } from "./contractDataTypes";

export function generatePaidContractText(contract: PaidContractData): string {
	const hasCost = typeof contract.totalAmountKopecks === "number" && contract.totalAmountKopecks > 0;
	const moneyInfo = formatKopecksToRubAndKop(contract.totalAmountKopecks || 0);
	const cl = contract.clinic;
	const pt = contract.patient;
	const cust = contract.customer.isDifferentFromPatient ? contract.customer : contract.patient;

	const servicesList = contract.services && contract.services.length > 0
		? contract.services.map((s, idx) =>
			`  ${idx + 1}. ${s.code ? `[${s.code}] ` : ""}${s.name}${s.toothOrArea ? ` (Область/Зуб: ${s.toothOrArea})` : ""} — ${s.quantity} шт. × ${formatKopecksToRubAndKop(s.unitPriceKopecks).formatted} = ${formatKopecksToRubAndKop(s.totalKopecks).formatted}`,
		).join("\n")
		: `  ${contract.serviceScopeSummary || "Стоматологические медицинские услуги в соответствии со сметой / планом лечения"}`;

	const passportText = (cust.passportSeries && cust.passportNumber)
		? `серия ${cust.passportSeries} № ${cust.passportNumber}, выдан ${cust.passportIssuedBy || "___________________________"}, дата: ${cust.passportIssuedDate || "«___» _______ 20___ г."}, код: ${cust.passportDepartmentCode || "_______"}`
		: "серия _____ № __________, выдан ____________________________________, дата: «___» _______ 20___ г., код: _______";
	const addressText = cust.registrationAddress || "________________________________________________________";
	const phoneText = cust.phone || "____________________";
	const costText = hasCost ? `${moneyInfo.formattedWithKopecks} (${moneyInfo.inWords})` : "____________________ руб. (________________________________________)";

	return `ДОГОВОР № ${contract.contractNumber}
НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ
(в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736)

${contract.city}                                                «${contract.contractDate}»

${cl.fullName} (сокращенное наименование: ${cl.shortName}), именуемое в дальнейшем «Исполнитель», в лице ${cl.directorTitle} ${cl.directorFullName}, действующего на основании ${cl.actingOnBasis}, осуществляющее деятельность на основании Лицензии № ${cl.licenseNumber}, с одной стороны, и
Гражданин(ка) ${cust.fullName || "________________________________________________"}, ${contract.customer.isDifferentFromPatient ? `именуемый(ая) в дальнейшем «Заказчик», в интересах Пациента ${pt.fullName || "________________________________________________"}` : "именуемый(ая) в дальнейшем «Пациент» (Заказчик)"}, с другой стороны, заключили настоящий Договор:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Оказание платных стоматологических услуг надлежащего качества по утвержденному плану лечения.
1.2. Основание обращения: ${contract.clinicalReason || "Первичная консультация и осмотр врача-стоматолога"}
1.3. Перечень услуг:\n${servicesList}
1.4. Оформление согласий по Приказу Минздрава России № 1051н и соблюдение 152-ФЗ.

2. СТОИМОСТЬ И ОПЛАТА
2.1. Ориентировочная стоимость: ${costText}.
2.2. ${contract.paymentTerms} Оплата подтверждается фискальным кассовым чеком по 54-ФЗ.

3. СРОКИ И ПЕРСОНАЛЬНЫЕ ДАННЫЕ
3.1. Начало: ${contract.serviceStart || "в день обращения"}, окончание: ${contract.serviceEndOrCondition || "до завершения плана лечения"}.
3.2. ${contract.warrantyTerms} Передача сведений в ЕГИСЗ (РЭМД) по законодательству РФ.

ИСПОЛНИТЕЛЬ:
${cl.fullName} (${cl.shortName})
ОГРН: ${cl.ogrn}, ИНН: ${cl.inn}, КПП: ${cl.kpp}, Лицензия: № ${cl.licenseNumber}
Р/с: ${cl.checkingAccount} в ${cl.bankName}, БИК: ${cl.bik}
${cl.directorTitle}: _____________________ / ${cl.directorFullName || "________________________"} /

ПАЦИЕНТ / ЗАКАЗЧИК:
${cust.fullName} | Паспорт: ${passportText} | Адрес: ${addressText} | Тел: ${phoneText}
Подпись: _____________________ / ${cust.fullName} /
Дата: «${contract.signedAt || contract.contractDate}»
${contract.customer.isDifferentFromPatient ? `\nЗАКАЗЧИК (ПЛАТЕЛЬЩИК):\n${contract.customer.fullName || "________________________"}\nПодпись Заказчика: _____________________ / ${contract.customer.fullName || "________________________"} /` : ""}${contract.representative?.hasRepresentative ? `\nЗАКОННЫЙ ПРЕДСТАВИТЕЛЬ:\n${contract.representative.fullName || "________________________"}\nПодпись представителя: _____________________ / ${contract.representative.fullName || "________________________"} /` : ""}`;
}
