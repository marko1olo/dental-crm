/**
 * WARRANTY CERTIFICATE & REMEDIATION ACT PRINTABLE HTML GENERATORS (A4 / A5)
 * Генерация официального бланка гарантийного паспорта и акта устранения дефекта
 * Mandate 8b: strict file length budget <= 120 lines.
 */

import { formatRussianDate } from "./warrantyDateUtils.js";
import type { WarrantyCertificateData } from "./warrantyRemediationTypes.js";
import { WARRANTY_CERTIFICATE_BASE_CSS } from "./warrantyCertificateBaseStyles.js";
import { WARRANTY_CERTIFICATE_TABLE_CSS } from "./warrantyCertificateTableStyles.js";
import {
	renderCertificateCheckups,
	renderCertificateConditions,
	renderCertificateItemsRows,
	renderCertificateRemediations,
} from "./warrantyCertificateSections.js";

export { generateWarrantyRemediationActHtml } from "./warrantyRemediationActHtml.js";

export function generateWarrantyCertificateHtml(data: WarrantyCertificateData): string {
	const { patient, doctor, clinic, items, calculation, certificateId, issueDate, qrCodeSvg, integrityHash } = data;

	const clinicName = clinic?.name || "Стоматологическая клиника";
	const clinicLegalName = clinic?.legalName || clinicName;
	const clinicLicenseNumber = clinic?.licenseNumber || "ЛО41-01137-77/00584930";
	const clinicAddress = clinic?.address || "";
	const clinicPhone = clinic?.phone || "";
	const doctorFullName = doctor?.fullName || "________________________";
	const patientFullName = patient?.fullName || "________________________";

	const itemsRows = renderCertificateItemsRows(items, calculation, issueDate);
	const conditionsList = renderCertificateConditions();
	const checkupsGrid = renderCertificateCheckups(calculation.checkupSchedule || []);
	const remediationsBlock = renderCertificateRemediations(data.remediations);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Гарантийный паспорт — ${certificateId}</title>
  <style>
${WARRANTY_CERTIFICATE_BASE_CSS}
${WARRANTY_CERTIFICATE_TABLE_CSS}
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="cert-watermark">DENTE • ГАРАНТИЯ</div>
    <div class="cert-header">
      <div class="clinic-logo-block">
        <div class="clinic-emblem">D</div>
        <div class="clinic-info">
          <h1>${clinicName}</h1>
          <div class="legal">${clinicLegalName} • Лицензия № ${clinicLicenseNumber}</div>
          <div class="legal">${clinicAddress} • Тел: ${clinicPhone}</div>
        </div>
      </div>
      <div class="cert-title-badge">
        <div class="cert-number">${certificateId}</div>
        <div class="cert-issue-date">Выдан: ${formatRussianDate(issueDate)}</div>
      </div>
    </div>
    <div class="cert-main-title">
      <h2>Гарантийный паспорт и Сертификат качества</h2>
      <p>Официальные гарантийные обязательства в соответствии с Законом РФ «О защите прав потребителей» и Положением СтАР</p>
    </div>
    <div class="patient-card-strip">
      <div><div class="label">Пациент:</div><div class="val">${patientFullName}</div></div>
      <div><div class="label">Медицинская карта:</div><div class="val">${patient?.cardNumber || "043/у"}</div></div>
      <div><div class="label">Лечащий врач:</div><div class="val">${doctorFullName}</div></div>
    </div>
    <table class="items-table">
      <thead><tr>
        <th class="col-num">#</th><th class="col-tooth">Зуб</th><th class="col-work">Клиническая работа / Услуга</th>
        <th class="col-material">Материал, производитель, LOT</th><th class="col-warranty">Срок гарантии</th><th class="col-life">Срок службы</th>
      </tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <div class="conditions-section">
      <h4>Условия сохранения гарантийных обязательств:</h4>
      <ul class="conditions-list">${conditionsList}</ul>
    </div>
    <div class="checkups-section">
      <h4>График обязательных контрольных осмотров:</h4>
      <div class="checkup-grid">${checkupsGrid}</div>
    </div>
    ${remediationsBlock}
    <div class="signatures-block">
      <div class="sign-col">
        <div class="sign-title">Лечащий врач-стоматолог:</div><div class="sign-line"></div>
        <div class="sign-name">${doctorFullName}</div>
      </div>
      <div class="sign-col">
        <div class="sign-title">Пациент с условиями ознакомлен:</div><div class="sign-line"></div>
        <div class="sign-name">${patientFullName}</div>
      </div>
      <div class="qr-col">
        ${qrCodeSvg || ""}
        <div class="qr-note">Электронная верификация паспорта</div>
      </div>
    </div>
    <div class="hash-footer">
      Контрольный криптографический хеш подлинности бланка (SHA-256): ${integrityHash || "—"}
    </div>
  </div>
</body>
</html>`;
}
