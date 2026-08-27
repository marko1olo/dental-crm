/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEMD 130: СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ НАЛОГОВОГО ОРГАНА
 * (КНД 1151156 / ПРИКАЗ МИНЗДРАВА И ФНС РОССИИ / CDA R2)
 * Kopeck-exact financial arithmetic and fiscal verification.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { EGISZ_OIDS } from "./oids.js";
import { escapeXml } from "./c14n.js";
import { generateClinicalDocumentHeader } from "./header.js";
import { formatKopecksToRubles } from "../money.js";
const RELATION_NAMES = {
    "1": "Сам налогоплательщик (пациент)",
    "2": "Супруг (супруга)",
    "3": "Родитель",
    "4": "Ребенок (подопечный)",
};
export function generateSemd130Xml(params) {
    const headerXml = generateClinicalDocumentHeader({
        docKind: "130",
        docTypeNsiCode: "130",
        docTitle: `Справка об оплате медицинских услуг № ${params.certificateNumber} за ${params.taxYear} год`,
        templateOids: [
            EGISZ_OIDS.SEMD_TEMPLATE_130,
            EGISZ_OIDS.SEMD_TEMPLATE_BASE_CONSULTATION,
        ],
        documentId: params.documentId,
        documentVersion: params.documentVersion ?? 1,
        documentTime: params.documentTime,
        visitDate: params.issueDate,
        patient: params.patient,
        doctor: params.doctor,
        clinic: params.clinic,
        legalAuthenticator: params.legalAuthenticator,
    });
    // ─── 1. Сведения о налогоплательщике и пациенте (LOINC 55752-0) ────────────
    const relationLabel = RELATION_NAMES[params.taxpayer.relationToPatient] || "Пациент";
    const taxpayerSnilsClean = params.taxpayer.snils ? params.taxpayer.snils.replace(/\D/g, "") : "";
    const taxpayerInnClean = params.taxpayer.inn ? params.taxpayer.inn.trim() : "";
    const taxpayerSection = `
			<!-- Секция 1: Сведения о налогоплательщике и пациенте -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_TAXPAYER_INFO}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Сведения о налогоплательщике"/>
					<title>Сведения о налогоплательщике и пациенте</title>
					<text>
						<paragraph><strong>Налогоплательщик:</strong> ${escapeXml(params.taxpayer.fullName)}</paragraph>
						${taxpayerInnClean ? `<paragraph><strong>ИНН налогоплательщика:</strong> ${escapeXml(taxpayerInnClean)}</paragraph>` : ""}
						${taxpayerSnilsClean ? `<paragraph><strong>СНИЛС налогоплательщика:</strong> ${escapeXml(taxpayerSnilsClean)}</paragraph>` : ""}
						<paragraph><strong>Степень родства:</strong> ${escapeXml(relationLabel)}</paragraph>
						<paragraph><strong>Пациент:</strong> ${escapeXml(params.patient.name.last)} ${escapeXml(params.patient.name.first)}${params.patient.name.middle ? ` ${escapeXml(params.patient.name.middle)}` : ""}</paragraph>
						${params.patient.snils ? `<paragraph><strong>СНИЛС пациента:</strong> ${escapeXml(params.patient.snils.replace(/\D/g, ""))}</paragraph>` : ""}
					</text>
				</section>
			</component>`;
    // ─── 2. Договор на оказание медицинских услуг (LOINC 48768-6) ──────────────
    const contractSection = `
			<!-- Секция 2: Договор на оказание платных медицинских услуг -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_PAYMENTS_AND_CONTRACT}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Сведения о договоре"/>
					<title>Основание: Договор на оказание платных медицинских услуг</title>
					<text>
						<paragraph><strong>Договор №:</strong> ${escapeXml(params.contractNumber)} от ${escapeXml(params.contractDate)}</paragraph>
						<paragraph><strong>Медицинская организация:</strong> ${escapeXml(params.clinic.name)} (ОГРН: ${escapeXml(params.clinic.ogrn || "-")}, ИНН: ${escapeXml(params.clinic.inn || "-")})</paragraph>
						${params.clinic.licenseNumber ? `<paragraph><strong>Лицензия:</strong> № ${escapeXml(params.clinic.licenseNumber)}${params.clinic.licenseDate ? ` от ${escapeXml(params.clinic.licenseDate)}` : ""}</paragraph>` : ""}
					</text>
				</section>
			</component>`;
    // ─── 3. Реестр оплат и фискальных чеков (LOINC 48768-6) ───────────────────
    const rowsXml = params.paymentRecords.map((r, idx) => {
        const amountFormatted = formatKopecksToRubles(r.paymentAmountKopecks);
        const catLabel = r.serviceCategoryCode === "2" ? "2 (Дорогостоящее)" : "1 (Обычное)";
        return `
								<tr>
									<td>${idx + 1}</td>
									<td>${escapeXml(r.fiscalReceiptNumber)}</td>
									<td>${escapeXml(r.fiscalReceiptDate)}</td>
									<td style="text-align: center;">${catLabel}</td>
									<td style="text-align: right;">${amountFormatted} руб.</td>
								</tr>`;
    }).join("");
    const entriesXml = params.paymentRecords.map((r) => {
        const amountRub = (r.paymentAmountKopecks / 100).toFixed(2);
        return `					<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="TAX_PAYMENT_ITEM" codeSystem="${EGISZ_OIDS.SEMD_TEMPLATE_130}" displayName="Фискальная оплата медицинских услуг"/>
							<statusCode code="completed"/>
							<effectiveTime value="${escapeXml(r.fiscalReceiptDate.replace(/\D/g, ""))}"/>
							<value xsi:type="MO" value="${amountRub}" currency="RUB"/>
							<methodCode code="${escapeXml(r.serviceCategoryCode)}" codeSystem="1.2.643.5.1.13.13.11.1075" displayName="${escapeXml(`Код услуги ${r.serviceCategoryCode}`)}"/>
						</observation>
					</entry>`;
    }).join("\n");
    const totalOrdinaryRub = formatKopecksToRubles(params.totalOrdinaryTreatmentKopecks);
    const totalExpensiveRub = formatKopecksToRubles(params.totalExpensiveTreatmentKopecks);
    const totalSumRub = formatKopecksToRubles(params.totalSumKopecks);
    const paymentsRegistrySection = `
			<!-- Секция 3: Реестр фискальных оплат медицинских услуг -->
			<component>
				<section>
					<code code="${EGISZ_OIDS.LOINC_PAYMENTS_AND_CONTRACT}" codeSystem="${EGISZ_OIDS.LOINC}" codeSystemName="LOINC" displayName="Реестр платежей"/>
					<title>Реестр кассовых чеков и оплат за ${escapeXml(String(params.taxYear))} год</title>
					<text>
						<table border="1" width="100%">
							<thead>
								<tr>
									<th>№</th>
									<th>Фискальный чек</th>
									<th>Дата оплаты</th>
									<th>Код услуги</th>
									<th>Сумма (руб.)</th>
								</tr>
							</thead>
							<tbody>${rowsXml}
							</tbody>
						</table>
						<paragraph><strong>Итого по коду «1» (Обычное лечение):</strong> ${totalOrdinaryRub} руб.</paragraph>
						<paragraph><strong>Итого по коду «2» (Дорогостоящее лечение):</strong> ${totalExpensiveRub} руб.</paragraph>
						<paragraph><strong>Всего оплачено медицинских услуг:</strong> ${totalSumRub} руб.</paragraph>
					</text>
${entriesXml}
				</section>
			</component>`;
    return `${headerXml}

	<component>
		<structuredBody>
			${taxpayerSection}
			${contractSection}
			${paymentsRegistrySection}
		</structuredBody>
	</component>
</ClinicalDocument>`;
}
