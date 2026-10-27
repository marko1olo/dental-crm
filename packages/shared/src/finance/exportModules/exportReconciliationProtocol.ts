/**
 * exportReconciliationProtocol.ts — Russian Statutory A4 Reconciliation Protocol (402-FZ).
 * Wave 130 & Mandate 8b (<= 120 lines), Mandate 8d point 7 (Strictly 0 emojis).
 */

import {
	type ClinicRequisiteInfo,
	clinicRequisiteInfoSchema,
	type ReconciliationProtocolOptions,
	type ReconciliationResult,
} from "./exportTypes.js";
import { format1CDate, formatRublesRu } from "./export1CXmlFormatter.js";

export function formatReconciliationProtocolA4(
	result: ReconciliationResult,
	clinic: ClinicRequisiteInfo,
	options?: ReconciliationProtocolOptions,
): string {
	const c = clinicRequisiteInfoSchema.parse(clinic);
	const protocolNo = options?.protocolNumber || `СВ-${result.reconciliationId.slice(-8)}`;
	const chief = options?.chiefAccountant || "Смирнова Е.А.";
	const cashier = options?.cashier || "Барабаш С.В.";
	const sum = result.summary;
	const statusLabel = result.status === "balanced" ? "[СВЕРЕНО: БЕЗ РАСХОЖДЕНИЙ]" : "[ВНИМАНИЕ: ОБНАРУЖЕНЫ РАСХОЖДЕНИЯ]";

	const lines: string[] = [
		"════════════════════════════════════════════════════════════════════════════════",
		"             ПРОТОКОЛ СВЕРКИ ОПЕРАЦИЙ ЭКВАЙРИНГА И КАССОВОЙ ВЫРУЧКИ             ",
		`                    № ${protocolNo} от ${result.reconciliationDate}                     `,
		"════════════════════════════════════════════════════════════════════════════════",
		"",
		`Организация:        ${c.name}`,
		`ИНН / КПП:          ${c.inn}${c.kpp ? ` / ${c.kpp}` : ""}`,
		c.bankAccount ? `Расчетный счет:     ${c.bankAccount} в ${c.bankName || "Банке"}${c.bankBik ? ` (БИК ${c.bankBik})` : ""}` : "",
		`Банк-эквайер:       ${result.acquirerName}`,
		`Период сверки:      с ${result.periodFrom} по ${result.periodTo}`,
		`Статус протокола:   ${statusLabel}`,
		"",
		"────────────────────────────────────────────────────────────────────────────────",
		"1. СВОДНЫЕ ПОКАЗАТЕЛИ СВЕРКИ ОПЕРАЦИЙ",
		"────────────────────────────────────────────────────────────────────────────────",
		"Показатель                                      Количество        Сумма (руб.)  ",
		"────────────────────────────────────────────────────────────────────────────────",
		`Операции по данным учетной системы (CRM):       ${sum.systemCount.toString().padEnd(14)}  ${formatRublesRu(sum.systemTotalKopecks).padStart(16)}`,
		`Операции по выписке банка-эквайера:             ${sum.acquirerCount.toString().padEnd(14)}  ${formatRublesRu(sum.acquirerGrossKopecks).padStart(16)}`,
		`Удержанная комиссия эквайера:                   -               ${formatRublesRu(sum.acquirerFeeKopecks).padStart(16)}`,
		`Сумма к зачислению на р/счет (нетто):           -               ${formatRublesRu(sum.acquirerNetKopecks).padStart(16)}`,
		`Сверено без расхождений:                        ${sum.matchedCount.toString().padEnd(14)}  ${formatRublesRu(sum.matchedGrossKopecks).padStart(16)}`,
		`Расхождения по сумме комиссии:                  ${sum.feeDiscrepancyCount.toString().padEnd(14)}  ${formatRublesRu(sum.feeDiscrepancyKopecks).padStart(16)}`,
		`Не обнаружено в выписке банка (недопоступление):${sum.missingInBankCount.toString().padEnd(14)}  ${formatRublesRu(sum.missingInBankKopecks).padStart(16)}`,
		`Не обнаружено в CRM (неучтенные операции):      ${sum.missingInCrmCount.toString().padEnd(14)}  ${formatRublesRu(sum.missingInCrmKopecks).padStart(16)}`,
		"────────────────────────────────────────────────────────────────────────────────",
	].filter((l) => l.length > 0);

	const feeDiscrepancies = result.matchedRecords.filter((r) => r.hasFeeDiscrepancy);
	if (feeDiscrepancies.length > 0) {
		lines.push("", "2. ДЕТАЛИЗАЦИЯ РАСХОЖДЕНИЙ ПО КОМИССИИ ЭКВАЙРИНГА", "────────────────────────────────────────────────────────────────────────────────", "RRN            Дата       Сумма брутто    Ожид. ком.    Факт. ком.    Разница   ", "────────────────────────────────────────────────────────────────────────────────");
		for (const item of feeDiscrepancies) {
			const rrn = (item.rrn || item.systemPaymentId).padEnd(14).slice(0, 14);
			const dt = format1CDate(item.date).padEnd(10);
			const gross = formatRublesRu(item.grossAmountKopecks).padStart(14);
			const expFee = formatRublesRu(item.expectedFeeKopecks).padStart(12);
			const actFee = formatRublesRu(item.actualFeeKopecks).padStart(12);
			const diff = formatRublesRu(item.feeDiscrepancyKopecks).padStart(12);
			lines.push(`${rrn} ${dt} ${gross}  ${expFee}  ${actFee}  ${diff}`);
		}
		lines.push("────────────────────────────────────────────────────────────────────────────────");
	}

	if (result.missingInBankRecords.length > 0) {
		lines.push("", "3. ПЛАТЕЖИ, НЕ ПОДТВЕРЖДЕННЫЕ В ВЫПИСКЕ БАНКА", "────────────────────────────────────────────────────────────────────────────────", "ID платежа     RRN            Дата       Пациент             Сумма      ", "────────────────────────────────────────────────────────────────────────────────");
		for (const p of result.missingInBankRecords) {
			const id = p.id.padEnd(14).slice(0, 14);
			const rrn = (p.rrn || "-").padEnd(14).slice(0, 14);
			const dt = format1CDate(p.date).padEnd(10);
			const pat = (p.patientName || "Пациент").padEnd(19).slice(0, 19);
			const amt = formatRublesRu(p.amountKopecks).padStart(12);
			lines.push(`${id} ${rrn} ${dt} ${pat} ${amt}`);
		}
		lines.push("────────────────────────────────────────────────────────────────────────────────");
	}

	if (result.missingInCrmRecords.length > 0) {
		lines.push("", "4. ОПЕРАЦИИ БАНКА, ОТСУТСТВУЮЩИЕ В УЧЕТНОЙ СИСТЕМЕ CRM (НЕУЧТЕННАЯ ВЫРУЧКА)", "────────────────────────────────────────────────────────────────────────────────", "ID транзакции  RRN            Дата       Терминал    Карта       Сумма брутто   ", "────────────────────────────────────────────────────────────────────────────────");
		for (const s of result.missingInCrmRecords) {
			const id = s.id.padEnd(14).slice(0, 14);
			const rrn = (s.rrn || "-").padEnd(14).slice(0, 14);
			const dt = format1CDate(s.date).padEnd(10);
			const term = (s.terminalId || "-").padEnd(11).slice(0, 11);
			const card = (s.cardMask || "-").padEnd(11).slice(0, 11);
			const amt = formatRublesRu(s.grossAmountKopecks).padStart(14);
			lines.push(`${id} ${rrn} ${dt} ${term} ${card} ${amt}`);
		}
		lines.push("────────────────────────────────────────────────────────────────────────────────");
	}

	lines.push(
		"", "ЗАКЛЮЧЕНИЕ:",
		result.status === "balanced"
			? "Настоящим подтверждается полное совпадение данных учетной системы CRM и банковской выписки. Расхождений по выручке и тарифам комиссии не выявлено."
			: "Обнаружены расхождения между данными учетной системы CRM и банковской выпиской. Требуется финансовое расследование и составление претензии в банк-эквайер.",
		"", "Настоящий протокол составлен в соответствии с требованиями Федерального закона\nот 06.12.2011 № 402-ФЗ «О бухгалтерском учете» и регламентом кассовой дисциплины.",
		"", "ПОДПИСИ ОТВЕТСТВЕННЫХ ЛИЦ:", "",
		`Главный бухгалтер:                  ____________________ / ${chief} /`, "",
		`Ответственный за кассу:             ____________________ / ${cashier} /`, "",
		`Дата формирования протокола:        ${result.reconciliationDate}`,
		"════════════════════════════════════════════════════════════════════════════════",
	);

	return lines.join("\n");
}
