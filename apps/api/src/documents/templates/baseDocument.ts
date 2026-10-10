import {
	type ClinicProfile,
	type DocumentKind,
	documentKindMetadata,
	type GeneratedDocument,
	type Patient,
} from "@dental/shared";
import {
	DocumentRenderContext,
	escapeHtml,
	documentStatusBanner,
	present,
	patientIdentityDocument,
	patientSnils,
	patientTaxpayerInn,
	patientInsurancePolicyNumber,
	patientRegistrationAddress,
	patientResidentialAddress,
	patientDataProcessingBasisNote,
	documentRecipientLine,
	representativeDisplayLine,
	representativeAuthorityLine,
	representativeContactLine,
	representativeIdentityLine,
	clinicDisplayName,
	clinicLicenseLine,
	clinicLegalRequisites,
	clinicPaymentRequisites,
	clinicSignatory,
	clinicLegalProfileMissingFields,
	preferredDocumentRecipient,
	legalRepresentativeName,
	legalRepresentativeRelationship,
	legalRepresentativeDocument,
	legalRepresentativePhone,
	issuedDate,
	documentStatusLabels,
} from "./baseRenderUtils.js";
import {
	signatureParty,
	issueSignatureModeLabel,
	releaseJournalBlock,
	issueSignatureAttestationBlock,
} from "./signatureRenderUtils.js";

export function baseDocument(
	title: string,
	patient: Patient,
	document: GeneratedDocument,
	body: string,
	context: DocumentRenderContext,
) {
	const clinicProfile = context.clinicProfile;
	const clinicName = clinicDisplayName(clinicProfile);
	const clinicLegalName = present(clinicProfile?.legalName);
	const inn = clinicProfile?.inn ? `ИНН: ${clinicProfile.inn}` : "";
	const kpp = clinicProfile?.kpp ? `КПП: ${clinicProfile.kpp}` : "";
	const ogrn = clinicProfile?.ogrn ? `ОГРН: ${clinicProfile.ogrn}` : "";
	const license = clinicLicenseLine(clinicProfile) ?? "Лицензия на осуществление медицинской деятельности (ЕРУЛ)";
	const docNum = document.id.slice(0, 8).toUpperCase();
	const dateStr = issuedDate(document);
	const clinicContacts = [
		clinicProfile?.phone ? `тел. ${clinicProfile.phone}` : null,
		clinicProfile?.email ? `email: ${clinicProfile.email}` : null,
		clinicProfile?.website ? `сайт: ${clinicProfile.website}` : null,
	]
		.filter(Boolean)
		.join(" • ");

	return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 15mm 20mm 20mm;
      @bottom-right {
        content: "Стр. " counter(page);
        font-family: "PT Astra Sans", Arial, sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: "PT Astra Serif", "Times New Roman", "PT Astra Sans", Arial, serif;
      font-size: 9.5pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-container {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
    }
    .header-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .clinic-info {
      width: 60%;
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-size: 7.5pt;
      line-height: 1.25;
      color: #334155;
    }
    .clinic-title {
      font-weight: 800;
      font-size: 11pt;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 2px;
      letter-spacing: 0.02em;
    }
    .clinic-legal-sub {
      font-weight: 600;
      font-size: 8.5pt;
      color: #1e293b;
      margin-bottom: 3px;
    }
    .clinic-details {
      margin-top: 2px;
      font-size: 7.5pt;
      line-height: 1.25;
    }
    .doc-requisites {
      width: 38%;
      text-align: right;
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-size: 7.5pt;
      line-height: 1.25;
      color: #334155;
    }
    .form-badge {
      display: inline-block;
      font-weight: 800;
      font-size: 8pt;
      text-transform: uppercase;
      color: #0f172a;
      border: 1pt solid #0f172a;
      padding: 1pt 5pt;
      margin-bottom: 4pt;
      background: #f8fafc;
      letter-spacing: 0.03em;
    }
    .doc-meta-row {
      margin: 1.5pt 0;
    }
    h1 {
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-size: 12pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #0f172a;
      margin: 10px 0 8px;
      text-align: center;
      page-break-after: avoid;
      break-after: avoid;
    }
    h2 {
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin: 10px 0 4px;
      background: #f8fafc;
      color: #0f172a;
      padding: 3px 6px;
      border-bottom: 0.75pt solid #0f172a;
      page-break-after: avoid;
      break-after: avoid;
    }
    h3 {
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-size: 9pt;
      font-weight: 700;
      margin: 8px 0 4px;
      page-break-after: avoid;
      break-after: avoid;
    }
    p {
      margin: 4px 0;
      line-height: 1.25;
    }
    p.legal-clause, .legal-body p {
      text-align: justify;
      text-justify: inter-word;
      text-indent: 1.25cm;
      margin: 3.5pt 0;
      line-height: 1.25;
    }
    p.preamble {
      text-align: justify;
      text-justify: inter-word;
      text-indent: 1.25cm;
      margin: 4pt 0 8pt;
      line-height: 1.28;
    }
    table {
      border-collapse: collapse;
      margin: 4px 0 8px;
      width: 100%;
      font-size: 8.5pt;
      line-height: 1.25;
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    td, th {
      border: 0.5pt solid #cbd5e1;
      padding: 3.5pt 5pt;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-weight: 700;
    }
    .tabular-nums {
      font-variant-numeric: tabular-nums;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .financial-table th {
      text-align: center;
      font-size: 8pt;
    }
    ul { margin: 4px 0 8px 18px; padding: 0; }
    li { margin: 2px 0; text-align: justify; line-height: 1.25; }
    .meta {
      background: #f8fafc;
      border: 0.5pt solid #cbd5e1;
      padding: 6px 8px;
      margin-bottom: 10px;
      font-size: 8.5pt;
      border-radius: 3px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .document-status-banner {
      border: 2px solid #a34f32;
      color: #a34f32;
      display: inline-block;
      font-weight: 700;
      padding: 2px 6px;
      font-size: 8pt;
      margin-bottom: 6px;
    }
    .status-issued { border-color: #2f7340; color: #2f7340; }
    .status-voided { border-color: #5f574f; color: #5f574f; text-decoration: line-through; }
    .notice {
      background: #f8fafc;
      border: 0.75pt solid #94a3b8;
      padding: 6px 8px;
      margin: 6px 0;
      font-size: 8.5pt;
      color: #0f172a;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .check-list { list-style: none; margin-left: 0; }
    .check-list li { align-items: baseline; display: flex; gap: 6px; }
    .check-list span { color: #334155; font-weight: 700; }
    .total-words-box {
      background: #f8fafc;
      border: 1pt solid #cbd5e1;
      padding: 6pt 8pt;
      margin: 6pt 0 10pt;
      font-size: 9pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .executive-requisites {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 10pt 0 6pt;
      font-size: 8.5pt;
      line-height: 1.25;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .executive-requisites-col {
      border: 0.5pt solid #cbd5e1;
      padding: 6pt 8pt;
      background: #f8fafc;
    }
    .executive-requisites-title {
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8.5pt;
      color: #0f172a;
      margin-bottom: 4pt;
      border-bottom: 1pt solid #cbd5e1;
      padding-bottom: 2pt;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 14pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signature-column {
      font-size: 8.5pt;
      line-height: 1.25;
    }
    .signature-role {
      font-family: "PT Astra Sans", Arial, sans-serif;
      font-size: 9pt;
      font-weight: 700;
      margin-bottom: 6pt;
      border-bottom: 1pt solid #cbd5e1;
      padding-bottom: 2pt;
    }
    .signature-line-block {
      margin: 6pt 0 3pt;
    }
    .signature-line {
      font-family: "PT Astra Serif", "Times New Roman", serif;
      font-size: 8.5pt;
    }
    .signature-subtext {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 1pt;
    }
    .signature-date {
      margin-top: 5pt;
      font-size: 8.5pt;
    }
    .signature-stamps {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8pt;
    }
    .stamp-seal-circle {
      width: 20mm;
      height: 20mm;
      border: 1pt dashed #64748b;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-weight: 700;
      font-size: 9pt;
      flex-shrink: 0;
    }
    .gost-digital-stamp {
      box-sizing: border-box;
      border: 2px solid #003399;
      border-radius: 4px;
      padding: 8px 12px;
      background-color: #f4f8ff;
      color: #003399;
      font-size: 8pt;
      line-height: 1.3;
      page-break-inside: avoid;
    }
    .small { color: #64748b; font-size: 8pt; }
    @media print {
      body { font-size: 9.5pt; color: #000 !important; background: #fff !important; }
      h2 { background: #f8fafc !important; color: #000 !important; border-bottom-color: #000 !important; }
      table th { background: #f1f5f9 !important; color: #0f172a !important; }
      td, th { border-color: #000 !important; }
      .header-grid { border-bottom-color: #000 !important; }
      .document-status-banner { color: #000; border-color: #000; }
      .stamp-seal-circle { border-color: #000 !important; color: #000 !important; }
      .gost-digital-stamp { border-color: #003399 !important; color: #003399 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="doc-container">
  <div class="header-grid">
    <div class="clinic-info">
      <div class="clinic-title">${escapeHtml(clinicName)}</div>
      ${clinicLegalName && clinicLegalName !== clinicName ? `<div class="clinic-legal-sub">${escapeHtml(clinicLegalName)}</div>` : ""}
      <div class="clinic-details">
        <div><strong>Лицензия (ЕРУЛ):</strong> ${escapeHtml(license)}</div>
        <div>${escapeHtml([ogrn, inn, kpp].filter(Boolean).join(" • "))}</div>
        <div><strong>Адрес:</strong> ${escapeHtml(clinicProfile?.address ?? "")}</div>
        <div><strong>Контакты:</strong> ${escapeHtml(clinicContacts || (clinicProfile?.phone ? `тел. ${clinicProfile.phone}` : ""))}</div>
      </div>
    </div>
    <div class="doc-requisites">
      <div class="form-badge">DENTE CLINICAL CRM</div>
      <div class="doc-meta-row">Документ №: <strong>${escapeHtml(docNum)}</strong></div>
      <div class="doc-meta-row">Дата: <strong>${escapeHtml(dateStr)}</strong></div>
      <div class="doc-meta-row">Статус: <strong>${escapeHtml(documentStatusLabels[document.status])}</strong></div>
    </div>
  </div>

  ${documentStatusBanner(document)}
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <p>Клиника: ${escapeHtml(clinicDisplayName(clinicProfile))}</p>
    <p>Пациент: ${escapeHtml(patient.fullName)}</p>
    <p>Дата рождения: ${escapeHtml(patient.birthDate ?? "не указана")}</p>
    <p>Телефон: ${escapeHtml(patient.phone ?? "не указан")}</p>
    ${patientIdentityDocument(patient) ? `<p>Документ пациента: ${escapeHtml(patientIdentityDocument(patient) ?? "")}</p>` : ""}
    ${patientTaxpayerInn(patient) ? `<p>ИНН пациента: ${escapeHtml(patientTaxpayerInn(patient) ?? "")}</p>` : ""}
    ${patientRegistrationAddress(patient) ? `<p>Адрес регистрации: ${escapeHtml(patientRegistrationAddress(patient) ?? "")}</p>` : ""}
    ${patientResidentialAddress(patient) ? `<p>Адрес проживания: ${escapeHtml(patientResidentialAddress(patient) ?? "")}</p>` : ""}
    ${patientInsurancePolicyNumber(patient) ? `<p>Полис/ДМС: ${escapeHtml(patientInsurancePolicyNumber(patient) ?? "")}</p>` : ""}
    ${patientSnils(patient) ? `<p>СНИЛС: ${escapeHtml(patientSnils(patient) ?? "")}</p>` : ""}
    <p>Статус документа: ${escapeHtml(documentStatusLabels[document.status])}; дата выдачи: ${escapeHtml(issuedDate(document))}</p>
  </div>
  ${issueSignatureAttestationBlock(document)}
  ${releaseJournalBlock(document)}
  ${body}
</div>
</body>
</html>`;
}