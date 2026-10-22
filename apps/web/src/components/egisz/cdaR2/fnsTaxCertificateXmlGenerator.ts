/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS TAX DEDUCTION CERTIFICATE XML BUILDER (КНД 1151156 / ЕД-7-11/755@)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { escapeXml, formatRuDate } from "@dental/shared/cda";
import type { FnsTaxCertificatePayload } from "./cdaTypes";
import { canonicalizeCdaXml, formatKopecksToRubles } from "./kopeckMath";

export function generateFnsTaxCertificateXml(payload: FnsTaxCertificatePayload): string {
	const docDate = payload.documentDate instanceof Date ? payload.documentDate : new Date(payload.documentDate);
	const validDocDate = Number.isNaN(docDate.getTime()) ? new Date() : docDate;
	const formattedDocDate = formatRuDate(validDocDate);
	const fileGuid = `UT_SPROPLMED_${(payload.clinic.inn || "0000000000").trim()}_${validDocDate.getFullYear()}${(validDocDate.getMonth() + 1).toString().padStart(2, "0")}${validDocDate.getDate().toString().padStart(2, "0")}_${Date.now()}`;

	const payments = payload.payments || [];
	const totalKopecks = payments.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
	const code1Kopecks = payments
		.filter((p) => p.serviceCode === "1")
		.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
	const code2Kopecks = payments
		.filter((p) => p.serviceCode === "2")
		.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);

	const totalRublesStr = formatKopecksToRubles(totalKopecks);
	const code1RublesStr = formatKopecksToRubles(code1Kopecks);
	const code2RublesStr = formatKopecksToRubles(code2Kopecks);

	const tpParts = (payload.taxpayer.fullName || "").trim().split(/\s+/);
	const tpFamily = tpParts[0] || "Налогоплательщик";
	const tpGiven = tpParts[1] || "";
	const tpPatronymic = tpParts[2] || "";

	const patParts = (payload.patient.fullName || "").trim().split(/\s+/);
	const patFamily = patParts[0] || "Пациент";
	const patGiven = patParts[1] || "";
	const patPatronymic = patParts[2] || "";

	const sigParts = (payload.signer.fullName || "").trim().split(/\s+/);
	const sigFamily = sigParts[0] || "Руководитель";
	const sigGiven = sigParts[1] || "";
	const sigPatronymic = sigParts[2] || "";

	const cleanClinicInn = (payload.clinic.inn || "").replace(/\D/g, "");
	const cleanClinicKpp = (payload.clinic.kpp || "").replace(/\D/g, "");
	const cleanClinicOgrn = (payload.clinic.ogrn || "").replace(/\D/g, "");

	const cleanTpInn = (payload.taxpayer.inn || "").replace(/\D/g, "");
	const cleanTpSnils = (payload.taxpayer.snils || "").replace(/\D/g, "");
	const cleanPatSnils = (payload.patient.snils || "").replace(/\D/g, "");
	const cleanSigSnils = (payload.signer.snils || "").replace(/\D/g, "");

	const paymentsXml = payments
		.map((p, idx) => {
			const payDate = p.date instanceof Date ? p.date : new Date(p.date);
			const payDateStr = formatRuDate(payDate);
			const rubStr = formatKopecksToRubles(p.amountKopecks);
			return `\t\t\t<СведОпл НомСтроки="${idx + 1}" КодУслуги="${p.serviceCode}" ДатаОпл="${payDateStr}" Сумма="${rubStr}"${p.serviceDescription ? ` НаимУслуги="${escapeXml(p.serviceDescription)}"` : ""}/>`;
		})
		.join("\n");

	const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
<Файл ИдФайл="${escapeXml(fileGuid)}" ВерсФорм="5.01" ВерсПрог="DenteCRM-EGISZ 1.0">
	<СвУчДок>
		<СвОрг НаимОрг="${escapeXml(payload.clinic.name)}" ИННЮЛ="${escapeXml(cleanClinicInn)}"${cleanClinicKpp ? ` КПП="${escapeXml(cleanClinicKpp)}"` : ""} ОГРН="${escapeXml(cleanClinicOgrn)}"${payload.clinic.phone ? ` Тел="${escapeXml(payload.clinic.phone)}"` : ""}${payload.clinic.email ? ` E-mail="${escapeXml(payload.clinic.email)}"` : ""}/>
	</СвУчДок>
	<Документ КНД="1151156" ДатаДок="${formattedDocDate}" НомДок="${escapeXml(payload.documentNumber || "1")}" НалогПериод="${payload.taxYear}">
		<СвФЛ${cleanTpInn ? ` ИННФЛ="${escapeXml(cleanTpInn)}"` : ""}${cleanTpSnils ? ` СНИЛС="${escapeXml(cleanTpSnils)}"` : ""}${payload.taxpayer.birthDate ? ` ДатаРожд="${formatRuDate(payload.taxpayer.birthDate)}"` : ""}>
			<ФИО Фамилия="${escapeXml(tpFamily)}" Имя="${escapeXml(tpGiven)}"${tpPatronymic ? ` Отчество="${escapeXml(tpPatronymic)}"` : ""}/>
			${payload.taxpayer.docSeriesNumber ? `<УдЛичнФЛ КодВидДок="${escapeXml(payload.taxpayer.docTypeCode || "21")}" СерНомДок="${escapeXml(payload.taxpayer.docSeriesNumber)}"/>` : ""}
		</СвФЛ>
		<Пациент РодствоКод="${payload.patient.relationshipCode}"${cleanPatSnils ? ` СНИЛС="${escapeXml(cleanPatSnils)}"` : ""}${payload.patient.birthDate ? ` ДатаРожд="${formatRuDate(payload.patient.birthDate)}"` : ""}>
			<ФИО Фамилия="${escapeXml(patFamily)}" Имя="${escapeXml(patGiven)}"${patPatronymic ? ` Отчество="${escapeXml(patPatronymic)}"` : ""}/>
		</Пациент>
		<ОплатаУслуг СуммаКод1="${code1RublesStr}" СуммаКод2="${code2RublesStr}" ИтогоСумма="${totalRublesStr}">
${paymentsXml}
		</ОплатаУслуг>
		<Подписант ПрПодп="1"${cleanSigSnils ? ` СНИЛС="${escapeXml(cleanSigSnils)}"` : ""}>
			<ФИО Фамилия="${escapeXml(sigFamily)}" Имя="${escapeXml(sigGiven)}"${sigPatronymic ? ` Отчество="${escapeXml(sigPatronymic)}"` : ""}/>
			<Должность>${escapeXml(payload.signer.position || "Руководитель медицинской организации")}</Должность>
		</Подписант>
	</Документ>
</Файл>`;

	return canonicalizeCdaXml(rawXml);
}
