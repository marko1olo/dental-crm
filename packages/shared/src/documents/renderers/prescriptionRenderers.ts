/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL MEDICAL HTML / CSS PRINT RENDERERS — PRESCRIPTIONS (Layer 2)
 * Forms 107-1/u, 148-1/u-88 (PKU), 148-1/u-04(l) (Preferential)
 * Order of the Ministry of Health of the Russian Federation No. 1094n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { generateQrCodeSvg } from "../../fiscal/qrGenerator.js";
import {
	CLINICAL_DOCUMENT_PRINT_STYLES,
	escapeHtml,
	renderUkepDigitalSignatureBlock,
} from "./sharedStyles.js";
import type {
	Form107_1uPayload,
	Form148_1u88Payload,
	Form148_1u04lPayload,
	UkepDigitalSignaturePayload,
} from "./types.js";

/** Интерфейс лекарственной позиции в печатном бланке рецепта */
export interface PrescriptionItemPrintLike {
	readonly latinName?: string | undefined;
	readonly latinRp?: string | undefined;
	readonly dispenseLatin?: string | undefined;
	readonly signaRussian?: string | undefined;
	readonly signaRu?: string | undefined;
	readonly tradeName?: string | undefined;
	readonly form?: string | undefined;
	readonly [key: string]: unknown;
}

/** 7. Рендерер Рецептурного бланка № 107-1/у (Приказ Минздрава России от 24.11.2021 N 1094н) */
export function renderForm107_1uHtml(payload: Form107_1uPayload | Record<string, unknown>): string {
	const p = payload as Record<string, unknown>;
	const clinicName = (p.clinicLegalName || (p.organization as { fullName?: string })?.fullName || "Стоматологическая клиника") as string;
	const clinicAddress = (p.clinicAddress || (p.organization as { address?: string })?.address || "—") as string;
	const clinicPhone = (p.clinicPhone || (p.organization as { phone?: string })?.phone || "—") as string;
	const clinicOgrn = (p.clinicOgrn || (p.organization as { ogrn?: string })?.ogrn || "—") as string;
	const clinicInn = (p.clinicInn || (p.organization as { inn?: string })?.inn || "—") as string;
	const medLic = p.medicalLicenseNumber ? `Лицензия: № ${escapeHtml(String(p.medicalLicenseNumber))}` : "";
	const recNum = String(p.prescriptionSeriesNumber || "—");
	const recDate = String(p.prescriptionDate || new Date().toISOString().slice(0, 10));
	const patientName = String(p.patientFullName || (p.patient as { fullName?: string })?.fullName || "—");
	const patientBirth = String(p.patientBirthDate || (p.patient as { birthDate?: string })?.birthDate || "—");
	const patientAge = p.patientAgeYears != null ? `${p.patientAgeYears} лет` : "";
	const cardNum = String(p.medicalCardNumber || (p.patient as { medicalCardNumber?: string })?.medicalCardNumber || "—");
	const doctorName = String(p.doctorFullName || "Врач-стоматолог");
	const doctorSpecialty = String(p.doctorSpecialty || "Врач-стоматолог");
	const validity = String(p.validityDays || "60");
	const items: readonly PrescriptionItemPrintLike[] = (p.items || []) as readonly PrescriptionItemPrintLike[];
	const withStamp = p.withStampAndSignature !== false;

	const itemsHtml = items.map((item: PrescriptionItemPrintLike, idx: number) => `
    <div style="margin-bottom:10px; font-family:'Times New Roman', serif; font-size:10pt; line-height:1.35;">
      <div style="font-weight:bold; font-style:italic; font-size:10.5pt;">${idx + 1}. ${escapeHtml(item.latinName || item.latinRp || "Rp.:")}</div>
      <div style="margin-left:24px; font-style:italic;">${escapeHtml(item.dispenseLatin || "D.t.d.")}</div>
      <div style="margin-left:24px; font-weight:normal; margin-top:2px; font-family:Arial, sans-serif; font-size:8.5pt;">${escapeHtml(item.signaRussian || item.signaRu || "S. По назначению врача.")}</div>
      ${item.tradeName ? `<div style="margin-left:24px; font-size:7.5pt; color:#64748b; font-family:'PT Astra Sans', Arial, sans-serif;">[Торговое наименование: <strong>${escapeHtml(item.tradeName)}</strong>, форма: ${escapeHtml(item.form || "")}]</div>` : ""}
    </div>
  `).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Рецептурный бланк 107-1/у № ${escapeHtml(recNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
<style>
  .recipe-container {
    max-width: 148mm;
    margin: 0 auto;
    border: 1.5pt solid #0f172a;
    padding: 8mm 7mm;
    background: #ffffff;
    box-sizing: border-box;
  }
  .recipe-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1.5pt solid #0f172a;
    padding-bottom: 5px;
    margin-bottom: 6px;
  }
  .stamp-box {
    width: 54%;
    font-size: 7.5pt;
    line-height: 1.2;
    border: 1px dashed #64748b;
    padding: 4px 5px;
  }
  .form-title-box {
    width: 44%;
    text-align: right;
    font-size: 7pt;
    line-height: 1.2;
    color: #334155;
  }
</style>
</head>
<body>
<div class="recipe-container">
  <div class="recipe-header">
    <div class="stamp-box" style="${withStamp ? "border:1.5pt solid #1e3a8a; background:#f8fafc; color:#1e3a8a;" : ""}">
      <div style="font-weight:bold; font-size:8pt; text-transform:uppercase; ${withStamp ? "color:#1e3a8a;" : ""}">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)}</div>
      <div>Тел: ${escapeHtml(clinicPhone)}</div>
      <div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)} ${medLic ? `| ${medLic}` : ""}</div>
      <div style="font-size:6.5pt; color:${withStamp ? "#2563eb" : "#64748b"}; margin-top:2px; font-weight:${withStamp ? "bold" : "normal"};">(${withStamp ? "ШТАМП МЕДИЦИНСКОЙ ОРГАНИЗАЦИИ" : "Штамп медицинской организации"})</div>
    </div>
    <div class="form-title-box">
      <div>Министерство здравоохранения РФ</div>
      <div>Медицинская документация</div>
      <div style="font-weight:bold; font-size:8pt; color:#0f172a;">Форма бланка № 107-1/у</div>
      <div>Утв. приказом Минздрава России</div>
      <div>от 24.11.2021 г. № 1094н</div>
    </div>
  </div>

  <div style="text-align:center; margin:6px 0;">
    <div style="font-size:11.5pt; font-weight:800; letter-spacing:0.08em; text-transform:uppercase;">РЕЦЕПТ</div>
    <div style="font-size:8pt; color:#475569;">Серия и номер: <strong>${escapeHtml(recNum)}</strong> от <strong>${escapeHtml(recDate)}</strong></div>
    <div style="font-size:7pt; color:#64748b; margin-top:1px;">(взрослый, детский — нужное подчеркнуть)</div>
  </div>

  <div style="font-size:8.5pt; line-height:1.4; border-bottom:1px solid #cbd5e1; padding-bottom:5px; margin-bottom:6px;">
    <div>Ф.И.О. пациента: <strong>${escapeHtml(patientName)}</strong></div>
    <div style="display:flex; justify-content:space-between;">
      <span>Дата рождения: <strong>${escapeHtml(patientBirth)}</strong> ${patientAge ? `(Возраст: <strong>${escapeHtml(patientAge)}</strong>)` : ""}</span>
      <span>№ медкарты: <strong>${escapeHtml(cardNum)}</strong></span>
    </div>
    <div>Ф.И.О. лечащего врача: <strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</div>
    ${p.diagnosisIcd10Code ? `<div style="font-size:7.5pt; color:#64748b;">Диагноз (МКБ-10): <strong>${escapeHtml(String(p.diagnosisIcd10Code))}</strong></div>` : ""}
  </div>

  <div style="min-height:50mm; padding:3px 0;">
    ${itemsHtml}
  </div>

  <div style="border-top:1.5pt solid #0f172a; padding-top:5px; font-size:7.5pt; line-height:1.3;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <div>
        <strong>Срок действия рецепта:</strong>
        <span style="${validity === "15" ? "text-decoration:underline; font-weight:bold;" : ""}">15 дней</span> /
        <span style="${validity === "60" ? "text-decoration:underline; font-weight:bold; color:#0284c7;" : "font-weight:bold;"}">60 дней (2 месяца)</span> /
        <span style="${validity === "365" ? "text-decoration:underline; font-weight:bold;" : ""}">до 1 года</span>
      </div>
      <div style="font-size:6.5pt; color:#64748b;">(нужное подчеркнуть)</div>
    </div>

    ${p.isChronicSpecialCare ? `
      <div style="border:1px solid #cbd5e1; background:#f8fafc; padding:3px 5px; margin-bottom:4px; font-size:7pt;">
        [X] <strong>По специальному назначению</strong> (периодичность отпуска: ${escapeHtml(String(p.chronicPeriodicity || "ежемесячно"))})
      </div>
    ` : ""}

    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:8px;">
      <div style="width:40%; position:relative;">
        <div style="font-size:7pt; color:#64748b; margin-bottom:6px;">Подпись и личная печать врача:</div>
        <div style="position:relative; height:20px;">
          ${withStamp ? `<div style="position:absolute; bottom:2px; left:18px; font-family:'Brush Script MT', 'Segoe Script', cursive, serif; font-size:15pt; color:#1d4ed8; transform:rotate(-3deg); font-weight:bold; user-select:none; z-index:2;">${escapeHtml(doctorName.replace(/^(Д-р|Врач)\s+/i, ""))}</div>` : ""}
          <div style="border-bottom:1px solid #0f172a; width:90%; position:absolute; bottom:0;"></div>
        </div>
        <div style="font-size:7.5pt; margin-top:2px;">/ ${escapeHtml(doctorName)} /</div>
      </div>
      <div style="width:28%; display:flex; flex-direction:column; align-items:center;">
        <div style="width:64px; height:64px; border:1px solid #cbd5e1; padding:2px; background:#fff;">
          ${generateQrCodeSvg(String(p.qrVerificationUrl || `https://egisz.rosminzdrav.ru/rx/verify?id=${encodeURIComponent(recNum)}&org=${encodeURIComponent(clinicOgrn)}&date=${encodeURIComponent(recDate)}`), { size: 60, margin: 1, title: `QR-код рецепта № ${recNum}` })}
        </div>
        <div style="font-size:5.5pt; color:#64748b; margin-top:2px; text-align:center;">QR для аптеки / ЕГИСЗ</div>
      </div>
      <div style="width:30%; display:flex; flex-direction:column; align-items:center;">
        <div style="display:flex; gap:6px; align-items:center;">
          <div style="width:44px; height:44px; border:${withStamp ? "1.5px solid #1d4ed8; background:#eff6ff; color:#1e40af;" : "1px dashed #94a3b8; color:#64748b;"} border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:6pt; font-weight:bold; text-align:center; line-height:1.05;">
            <span style="font-size:5.5pt;">ВРАЧ</span>
            <span style="font-size:7pt;">М.П.</span>
          </div>
          <div style="width:48px; height:48px; border:${withStamp ? "2px double #1d4ed8; background:#eff6ff; color:#1e40af;" : "1.5px dashed #0284c7; color:#0369a1;"} border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:6pt; font-weight:bold; text-align:center; line-height:1.1;">
            <span style="font-size:5pt; text-transform:uppercase;">КЛИНИКА</span>
            <span>Для<br>рецептов</span>
          </div>
        </div>
        <div style="font-size:5.5pt; color:${withStamp ? "#1d4ed8" : "#64748b"}; margin-top:2px; text-align:center; font-weight:${withStamp ? "bold" : "normal"};">Печать медицинской организации «Для рецептов»</div>
      </div>
    </div>

    ${renderUkepDigitalSignatureBlock(p.ukepSignature as UkepDigitalSignaturePayload | undefined)}
  </div>
</div>
</body>
</html>`;
}

/** 8. Рендерер Рецептурного бланка строгой отчетности № 148-1/у-88 (ПКУ) */
export function renderForm148_1u88Html(payload: Form148_1u88Payload | Record<string, unknown>): string {
	const p = payload as Record<string, unknown>;
	const clinicName = (p.clinicLegalName || (p.organization as { fullName?: string })?.fullName || "Стоматологическая клиника") as string;
	const clinicAddress = (p.clinicAddress || (p.organization as { address?: string })?.address || "—") as string;
	const clinicPhone = (p.clinicPhone || (p.organization as { phone?: string })?.phone || "—") as string;
	const clinicOgrn = (p.clinicOgrn || (p.organization as { ogrn?: string })?.ogrn || "—") as string;
	const clinicInn = (p.clinicInn || (p.organization as { inn?: string })?.inn || "—") as string;
	const medLic = p.medicalLicenseNumber ? `Лицензия: № ${escapeHtml(String(p.medicalLicenseNumber))}` : "";
	const recNum = String(p.prescriptionSeriesNumber || "—");
	const recDate = String(p.prescriptionDate || new Date().toISOString().slice(0, 10));
	const patientName = String(p.patientFullName || (p.patient as { fullName?: string })?.fullName || "—");
	const patientBirth = String(p.patientBirthDate || (p.patient as { birthDate?: string })?.birthDate || "—");
	const patientAddress = String(p.patientAddress || (p.patient as { address?: string })?.address || "—");
	const cardNum = String(p.medicalCardNumber || (p.patient as { medicalCardNumber?: string })?.medicalCardNumber || "—");
	const doctorName = String(p.doctorFullName || "Врач-стоматолог");
	const doctorSpecialty = String(p.doctorSpecialty || "Врач-стоматолог");
	const headOfDept = String(p.headOfDepartmentFullName || "—");
	const rawItems = (p.items || []) as readonly PrescriptionItemPrintLike[];
	const item: PrescriptionItemPrintLike = rawItems[0] || {
		latinName: "Rp.: Tramadoli 50 mg",
		tradeName: "Трамадол",
		dispenseLatin: "D.t.d. N 10 in caps.",
		signaRussian: "S. По 1 капсуле при выраженном болевом синдроме.",
		form: "капсулы",
	};

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Рецептурный бланк 148-1/у-88 № ${escapeHtml(recNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
<style>
  .recipe-container {
    max-width: 148mm;
    margin: 0 auto;
    border: 2pt solid #0f172a;
    padding: 7mm 7mm;
    background: #ffffff;
    box-sizing: border-box;
  }
  .recipe-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1.5pt solid #0f172a;
    padding-bottom: 4px;
    margin-bottom: 5px;
  }
  .stamp-box {
    width: 55%;
    font-size: 7.5pt;
    line-height: 1.2;
    border: 1px dashed #0f172a;
    padding: 4px 6px;
  }
  .form-title-box {
    width: 42%;
    text-align: right;
    font-size: 7pt;
    line-height: 1.15;
    color: #334155;
  }
</style>
</head>
<body>
<div class="recipe-container">
  <div class="recipe-header">
    <div class="stamp-box">
      <div style="font-weight:bold; font-size:8pt; text-transform:uppercase;">${escapeHtml(clinicName)}</div>
      <div>Адрес: ${escapeHtml(clinicAddress)}</div>
      <div>Тел: ${escapeHtml(clinicPhone)} | ОГРН: ${escapeHtml(clinicOgrn)}</div>
      <div>ИНН: ${escapeHtml(clinicInn)} ${medLic ? `| ${medLic}` : ""}</div>
      <div style="font-size:6.5pt; color:#64748b; margin-top:2px;">(Штамп медицинской организации)</div>
    </div>
    <div class="form-title-box">
      <div>Министерство здравоохранения РФ</div>
      <div>Медицинская документация</div>
      <div style="font-weight:bold; font-size:8pt; color:#0f172a;">Форма бланка № 148-1/у-88</div>
      <div>Утв. приказом Минздрава России</div>
      <div>от 24.11.2021 г. № 1094н</div>
    </div>
  </div>

  <div style="text-align:center; margin:4px 0;">
    <div style="font-size:11pt; font-weight:900; letter-spacing:0.08em; text-transform:uppercase; color:#b91c1c;">РЕЦЕПТ (ПКУ)</div>
    <div style="font-size:8pt; color:#0f172a;">Серия и номер: <strong>${escapeHtml(recNum)}</strong> от <strong>${escapeHtml(recDate)}</strong></div>
    <div style="font-size:7pt; color:#64748b;">(бланк строгой учетной документации — ПКУ)</div>
  </div>

  <div style="font-size:8pt; line-height:1.35; border-bottom:1px solid #0f172a; padding-bottom:4px; margin-bottom:5px;">
    <div>Ф.И.О. пациента: <strong>${escapeHtml(patientName)}</strong> (д.р. ${escapeHtml(patientBirth)})</div>
    <div>Адрес проживания: <strong>${escapeHtml(patientAddress)}</strong></div>
    <div style="display:flex; justify-content:space-between;">
      <span>№ медкарты: <strong>${escapeHtml(cardNum)}</strong></span>
      ${p.diagnosisIcd10Code ? `<span>Диагноз (МКБ-10): <strong>${escapeHtml(String(p.diagnosisIcd10Code))}</strong></span>` : ""}
    </div>
    <div>Ф.И.О. лечащего врача: <strong>${escapeHtml(doctorName)}</strong> (${escapeHtml(doctorSpecialty)})</div>
  </div>

  <div style="min-height:48mm; padding:4px 0; font-family:'Times New Roman', serif;">
    <div style="font-weight:bold; font-style:italic; font-size:10.5pt;">1. ${escapeHtml(item.latinName || item.latinRp || "Rp.:")}</div>
    <div style="margin-left:24px; font-style:italic; font-size:10pt;">${escapeHtml(item.dispenseLatin || "D.t.d.")}</div>
    <div style="margin-left:24px; font-weight:normal; margin-top:2px; font-family:Arial, sans-serif; font-size:8.5pt;">${escapeHtml(item.signaRussian || item.signaRu || "S. По назначению врача.")}</div>
    <div style="margin-left:24px; font-size:7.5pt; color:#475569; font-family:'PT Astra Sans', Arial, sans-serif; margin-top:2px;">
      [Торговое наименование: <strong>${escapeHtml(item.tradeName || "")}</strong>, форма: ${escapeHtml(item.form || "")}]
    </div>
  </div>

  <div style="border-top:1.5pt solid #0f172a; padding-top:4px; font-size:7.5pt; line-height:1.25;">
    <div style="margin-bottom:4px;">
      <strong>Срок действия рецепта: 15 дней</strong> (ПКУ — приказ Минздрава России № 1094н).
    </div>

    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:6px;">
      <div style="width:38%;">
        <div>Подпись и личная печать врача: ____________________</div>
        <div style="font-size:7pt; color:#64748b; margin-bottom:4px;">/ ${escapeHtml(doctorName)} /</div>
        <div style="margin-top:4px;">Подпись зав. отделением: ____________________</div>
        <div style="font-size:7pt; color:#64748b;">/ ${escapeHtml(headOfDept)} /</div>
      </div>
      <div style="width:20%; display:flex; flex-direction:column; align-items:center;">
        <div style="width:58px; height:58px; border:1px solid #cbd5e1; padding:2px; background:#fff;">
          ${generateQrCodeSvg(String(p.qrVerificationUrl || `https://egisz.rosminzdrav.ru/rx/verify?id=${encodeURIComponent(recNum)}&pku=1&org=${encodeURIComponent(clinicOgrn)}&date=${encodeURIComponent(recDate)}`), { size: 54, margin: 1, title: `QR-код ПКУ № ${recNum}` })}
        </div>
        <div style="font-size:5pt; color:#64748b; margin-top:1px; text-align:center;">QR ЕГИСЗ / ПКУ</div>
      </div>
      <div style="width:40%; display:flex; justify-content:flex-end; gap:5px; align-items:center;">
        <div style="width:38px; height:38px; border:1px dashed #0f172a; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:6.5pt; font-weight:bold; text-align:center;">
          М.П.<br>Врача
        </div>
        <div style="width:42px; height:42px; border:1.5px dashed #0284c7; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:6pt; color:#0369a1; font-weight:bold; text-align:center; line-height:1.1;">
          Для<br>рецептов
        </div>
        <div style="width:40px; height:40px; border:1.5px dashed #b91c1c; clip-path:polygon(50% 0%, 0% 100%, 100% 100%); display:flex; align-items:center; justify-content:center; font-size:5.5pt; color:#b91c1c; font-weight:bold; text-align:center; padding-top:8px;">
          СПЕЦ.<br>ПЕЧАТЬ
        </div>
      </div>
    </div>

    ${renderUkepDigitalSignatureBlock(p.ukepSignature as UkepDigitalSignaturePayload | undefined)}
  </div>
</div>
</body>
</html>`;
}

/** 9. Рендерер Льготного рецептурного бланка № 148-1/у-04(л) */
export function renderForm148_1u04lHtml(payload: Form148_1u04lPayload | Record<string, unknown>): string {
	const p = payload as Record<string, unknown>;
	const clinicName = (p.clinicLegalName || (p.organization as { fullName?: string })?.fullName || "Стоматологическая клиника") as string;
	const clinicAddress = (p.clinicAddress || (p.organization as { address?: string })?.address || "—") as string;
	const clinicPhone = (p.clinicPhone || (p.organization as { phone?: string })?.phone || "—") as string;
	const clinicOgrn = (p.clinicOgrn || (p.organization as { ogrn?: string })?.ogrn || "—") as string;
	const clinicInn = (p.clinicInn || (p.organization as { inn?: string })?.inn || "—") as string;
	const recNum = String(p.prescriptionSeriesNumber || "—");
	const recDate = String(p.prescriptionDate || new Date().toISOString().slice(0, 10));
	const patientName = String(p.patientFullName || (p.patient as { fullName?: string })?.fullName || "—");
	const patientBirth = String(p.patientBirthDate || (p.patient as { birthDate?: string })?.birthDate || "—");
	const cardNum = String(p.medicalCardNumber || (p.patient as { medicalCardNumber?: string })?.medicalCardNumber || "—");
	const pref = (p.preferentialDetails || {}) as Record<string, unknown>;
	const snils = String(pref.patientSnils || "—");
	const oms = String(pref.patientOmsPolicy || "—");
	const benefitCode = String(pref.preferentialBenefitCode || "081");
	const benefitName = String(pref.preferentialBenefitNameRu || "Инвалиды I группы");
	const discount = typeof pref.preferentialDiscountPercent === "number" ? pref.preferentialDiscountPercent : 100;
	const funding = pref.fundingSource === "regional" ? "Бюджет субъекта РФ" : "Федеральный бюджет";
	const doctorName = String(p.doctorFullName || "Врач-стоматолог");
	const validity = String(p.validityDays || "30");
	const items: readonly PrescriptionItemPrintLike[] = (p.items || []) as readonly PrescriptionItemPrintLike[];

	const itemsHtml = items.map((item: PrescriptionItemPrintLike, idx: number) => `
    <div style="margin-bottom:8px; font-family:'Times New Roman', serif; font-size:9.5pt; line-height:1.3;">
      <div style="font-weight:bold; font-style:italic;">${idx + 1}. ${escapeHtml(item.latinName || item.latinRp || "Rp.:")}</div>
      <div style="margin-left:20px; font-style:italic;">${escapeHtml(item.dispenseLatin || "D.t.d.")}</div>
      <div style="margin-left:20px; font-weight:normal; font-family:Arial, sans-serif; font-size:8pt;">${escapeHtml(item.signaRussian || item.signaRu || "S. По назначению врача.")}</div>
      ${item.tradeName ? `<div style="margin-left:20px; font-size:7pt; color:#64748b;">[Торговое: ${escapeHtml(item.tradeName)}, ${escapeHtml(item.form || "")}]</div>` : ""}
    </div>
  `).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Льготный рецепт 148-1/у-04(л) № ${escapeHtml(recNum)}</title>
${CLINICAL_DOCUMENT_PRINT_STYLES}
<style>
  .recipe-wrapper {
    max-width: 148mm;
    margin: 0 auto;
    border: 1.5pt solid #0f172a;
    padding: 6mm 6mm;
    background: #ffffff;
    box-sizing: border-box;
  }
  .header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
  }
  .header-table td {
    vertical-align: top;
    padding: 2px;
  }
</style>
</head>
<body>
<div class="recipe-wrapper">
  <!-- Корешок / Заголовок бланка -->
  <table class="header-table">
    <tr>
      <td style="width:55%; font-size:7pt; border:1px dashed #64748b; padding:4px;">
        <strong>${escapeHtml(clinicName)}</strong><br>
        Адрес: ${escapeHtml(clinicAddress)}<br>
        ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}<br>
        <em>(Штамп медицинской организации)</em>
      </td>
      <td style="width:45%; text-align:right; font-size:6.5pt; color:#334155;">
        Министерство здравоохранения РФ<br>
        <strong>Форма бланка № 148-1/у-04(л)</strong><br>
        Приказ МЗ РФ от 24.11.2021 г. № 1094н
      </td>
    </tr>
  </table>

  <div style="text-align:center; margin:3px 0;">
    <div style="font-size:10.5pt; font-weight:800; text-transform:uppercase; color:#047857;">РЕЦЕПТ (ЛЬГОТНЫЙ ОТПУСК)</div>
    <div style="font-size:7.5pt;">Серия и номер: <strong>${escapeHtml(recNum)}</strong> от <strong>${escapeHtml(recDate)}</strong></div>
  </div>

  <!-- Таблица льготных реквизитов -->
  <table style="width:100%; border-collapse:collapse; font-size:7.5pt; margin:4px 0; border:1px solid #0f172a;">
    <tr style="background:#f0fdf4;">
      <td style="padding:2px 4px; border:0.5pt solid #0f172a; width:35%;">СНИЛС: <strong>${escapeHtml(snils)}</strong></td>
      <td style="padding:2px 4px; border:0.5pt solid #0f172a; width:35%;">Полис ОМС: <strong>${escapeHtml(oms)}</strong></td>
      <td style="padding:2px 4px; border:0.5pt solid #0f172a; width:30%;">Оплата: <strong>${discount === 100 ? "100% (Бесплатно)" : "50% скидка"}</strong></td>
    </tr>
    <tr>
      <td colspan="2" style="padding:2px 4px; border:0.5pt solid #0f172a;">Код льготы: <strong>${escapeHtml(benefitCode)}</strong> — ${escapeHtml(benefitName)}</td>
      <td style="padding:2px 4px; border:0.5pt solid #0f172a;">Финансирование: <strong>${escapeHtml(funding)}</strong></td>
    </tr>
  </table>

  <!-- Данные пациента -->
  <div style="font-size:8pt; border-bottom:1px solid #cbd5e1; padding-bottom:3px; margin-bottom:4px;">
    <div>Ф.И.О. пациента: <strong>${escapeHtml(patientName)}</strong> (д.р. ${escapeHtml(patientBirth)})</div>
    <div style="display:flex; justify-content:space-between;">
      <span>№ медкарты: <strong>${escapeHtml(cardNum)}</strong></span>
      ${p.diagnosisIcd10Code ? `<span>Диагноз (МКБ-10): <strong>${escapeHtml(String(p.diagnosisIcd10Code))}</strong></span>` : ""}
    </div>
    <div>Лечащий врач: <strong>${escapeHtml(doctorName)}</strong></div>
  </div>

  <div style="min-height:42mm; padding:2px 0;">
    ${itemsHtml}
  </div>

  <div style="border-top:1.5pt solid #0f172a; padding-top:4px; font-size:7pt;">
    <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
      <div>
        <strong>Срок действия:</strong>
        <span style="${validity === "15" ? "text-decoration:underline; font-weight:bold;" : ""}">15 дней</span> /
        <span style="${validity === "30" ? "text-decoration:underline; font-weight:bold; color:#047857;" : "font-weight:bold;"}">30 дней</span> /
        <span style="${validity === "365" ? "text-decoration:underline; font-weight:bold;" : ""}">1 год</span>
      </div>
      <div>${p.isChronicSpecialCare ? `[X] По спец. назначению (${escapeHtml(String(p.chronicPeriodicity || "ежемесячно"))})` : ""}</div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:6px;">
      <div style="width:52%;">
        <div>Подпись и печать врача: _________________</div>
        <div style="margin-top:2px;">/ ${escapeHtml(doctorName)} /</div>
      </div>
      <div style="width:44%; display:flex; justify-content:flex-end; gap:6px;">
        <div style="width:40px; height:40px; border:1px dashed #64748b; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:6.5pt; font-weight:bold;">
          М.П.
        </div>
        <div style="width:46px; height:46px; border:1.5px dashed #047857; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:6.5pt; color:#047857; font-weight:bold; text-align:center; line-height:1.1;">
          Для<br>рецептов
        </div>
      </div>
    </div>

    ${renderUkepDigitalSignatureBlock(p.ukepSignature as UkepDigitalSignaturePayload | undefined)}
  </div>
</div>
</body>
</html>`;
}

/** Универсальный маршрутизатор рендера рецепта */
export function renderPrescriptionUniversalHtml(payload: Form107_1uPayload | Form148_1u88Payload | Form148_1u04lPayload | Record<string, unknown>): string {
	const p = payload as Record<string, unknown>;
	const form = p.formNumber || p.formType;
	if (form === "148-1/у-88" || form === "148-1u-88" || form === "148-1u") {
		return renderForm148_1u88Html(p);
	}
	if (form === "148-1/у-04(л)" || form === "148-1u-04l" || form === "148-1u-preferential") {
		return renderForm148_1u04lHtml(p);
	}
	return renderForm107_1uHtml(p);
}
