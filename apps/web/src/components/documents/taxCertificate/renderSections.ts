import { escapeHtml, formatDateRu, formatRublesExactRu } from "../documentPrintFormatters";
import { resolveTaxDeductionCategoryShared } from "@dental/shared";
import type { TaxCertificateClinicInfo, TaxCertificatePartyInfo, TaxYearAggregation } from "./types";

export function renderClinicSection(clinic: TaxCertificateClinicInfo): string {
	return `
      <div class="section-title">1. Сведения о медицинской организации (клинике)</div>
      <table class="details-table">
        <tr><td class="label-col">Наименование организации:</td><td><strong>${escapeHtml(clinic.legalName)}</strong></td></tr>
        <tr><td class="label-col">ИНН / КПП организации:</td><td>ИНН <strong>${escapeHtml(clinic.inn)}</strong>${clinic.kpp ? ` / КПП <strong>${escapeHtml(clinic.kpp)}</strong>` : ""}</td></tr>
        <tr><td class="label-col">ОГРН:</td><td><strong>${escapeHtml(clinic.ogrn)}</strong></td></tr>
        <tr><td class="label-col">Адрес местонахождения:</td><td>${escapeHtml(clinic.address)}</td></tr>
        <tr><td class="label-col">Лицензия на мед. деятельность:</td><td>№ <strong>${escapeHtml(clinic.licenseNumber)}</strong>${clinic.licenseDate ? ` от ${escapeHtml(clinic.licenseDate)}` : ""}</td></tr>
      </table>`;
}

export function renderTaxpayerSection(taxpayer: TaxCertificatePartyInfo, passportStr: string): string {
	return `
      <div class="section-title">2. Сведения о налогоплательщике</div>
      <table class="details-table">
        <tr><td class="label-col">Фамилия, имя, отчество:</td><td><strong>${escapeHtml(taxpayer.fullName)}</strong></td></tr>
        <tr><td class="label-col">ИНН налогоплательщика:</td><td>${taxpayer.inn ? `<strong>${escapeHtml(taxpayer.inn)}</strong>` : "Не указан (идентифицирован по документу)"}</td></tr>
        <tr><td class="label-col">Дата рождения:</td><td>${taxpayer.birthDate ? formatDateRu(taxpayer.birthDate) : "____________________"}</td></tr>
        <tr><td class="label-col">Документ, удостоверяющий личность:</td><td>${passportStr}</td></tr>
      </table>`;
}

export function renderPatientSection(
	patient: TaxCertificatePartyInfo,
	relInfo: { code: string; labelRu: string },
	isSamePerson: boolean,
	patientPassportStr: string,
): string {
	return `
      <div class="section-title">3. Сведения о пациенте и родстве</div>
      <table class="details-table">
        <tr><td class="label-col">Фамилия, имя, отчество пациента:</td><td><strong>${escapeHtml(patient.fullName)}</strong></td></tr>
        <tr><td class="label-col">Дата рождения пациента:</td><td>${patient.birthDate ? formatDateRu(patient.birthDate) : "____________________"}</td></tr>
        <tr><td class="label-col">Отношение к налогоплательщику:</td><td>
          <strong>Код ${relInfo.code}</strong> — ${relInfo.labelRu}
          ${!isSamePerson && patientPassportStr ? ` (${patientPassportStr})` : ""}
        </td></tr>
      </table>`;
}

export function renderReceiptsList(aggregation: TaxYearAggregation, taxYear: number): string {
	if (aggregation.payments.length === 0) return "";
	return `
      <div class="receipts-list">
        <strong>Реестр подтверждающих фискальных документов ККТ за ${taxYear} г.:</strong><br>
        ${aggregation.payments.map((p, i) => {
					const date = formatDateRu(p.dateIso);
					const fd = p.fiscalDocumentNumber ? `ФД № ${p.fiscalDocumentNumber}` : "";
					const fp = p.fiscalSign ? `ФП ${p.fiscalSign}` : "";
					const code = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
					return `${i + 1}. ${date} — ${escapeHtml(p.serviceName)} [Код ${code}] — ${formatRublesExactRu(p.amountRub)} ${fd} ${fp}`;
				}).join("; ")}
      </div>`;
}

export function renderSignaturesBlock(clinic: TaxCertificateClinicInfo, qrSvg: string): string {
	return `
    <div class="bottom-signatures">
      <div style="text-align: center;">${qrSvg}</div>
      <div>
        Руководитель клиники / гл. врач:<br><br>
        ______________________ / ${escapeHtml(clinic.chiefDoctorOrDirector || "Смирнов А.В.")}
      </div>
      <div style="text-align: center;">
        <div class="stamp-box">М.П.<br>КЛИНИКА</div>
      </div>
    </div>`;
}
