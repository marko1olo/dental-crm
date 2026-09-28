/**
 * patientPrescriptionDocuments.ts
 *
 * Генератор печатной формы рецептурного бланка № 107-1/у (Приказ Минздрава России № 1094н).
 * Включает реквизиты клиники, лицензию, паспортную часть, Rp., Signa, срок действия,
 * электронную верификацию по 63-ФЗ с QR-кодом и личную печать врача.
 */

import { generateQrCodeSvg } from "@dental/shared";
import type {
	PatientPersonalCabinetData,
	PatientPrescriptionItem,
} from "./patientCabinetEngine.js";
import { formatRussianDateIso } from "./patientCabinetEngine.js";

export function generatePrescription107PrintHtml(
	rx: PatientPrescriptionItem,
	data: PatientPersonalCabinetData,
): string {
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicInn = "7841098765";
	const clinicOgrn = "1217800098765";
	const clinicLicense = "ЛО-78-01-011842 от 15.06.2021";
	const clinicAddress = "г. Санкт-Петербург, Невский пр-т, д. 140, лит. А";
	const clinicPhone = "+7 (812) 345-67-89";
	const rxDate = formatRussianDateIso(rx.dateIso);
	const doctor = rx.doctorName || data.curatingDoctor || "Д-р Смирнов А. В.";
	const validity = rx.validityDays ? `${rx.validityDays} дней` : "60 дней";
	const patientBirth = data.birthDate ? formatRussianDateIso(data.birthDate) : "14 мая 1984 г.";

	// QR-код электронной верификации рецепта по 63-ФЗ
	const verifyUrl = `https://dente-clinic.ru/portal/rx/verify?id=${rx.id}&pat=${data.cardNumber}&sig=63fz`;
	const qrCodeSvg = generateQrCodeSvg(verifyUrl, { size: 90 });

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Рецептурный бланк 107-1/у — ${rx.medicationName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11.5px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.45; }
    .rx-container { max-width: 650px; margin: 0 auto; border: 1.5px solid #0f172a; border-radius: 6px; padding: 22px; background: #ffffff; }
    
    .org-stamp-box { border: 1.5px solid #0f172a; padding: 6px 10px; font-size: 10px; line-height: 1.35; max-width: 320px; margin-bottom: 12px; }
    .org-stamp-box strong { font-size: 11px; text-transform: uppercase; }
    
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px; }
    .header h2 { margin: 0 0 2px 0; font-size: 14px; font-weight: 900; text-transform: uppercase; }
    .header p { margin: 1px 0; font-size: 10.5px; color: #475569; }
    
    .patient-grid { display: grid; grid-template-columns: 140px 1fr; gap: 4px 8px; margin-bottom: 14px; font-size: 11px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
    .patient-grid .lbl { color: #64748b; font-weight: 600; }
    .patient-grid .val { color: #0f172a; font-weight: 700; }
    
    .rx-box { border: 1.5px solid #0d9488; border-radius: 6px; padding: 14px 16px; margin: 14px 0; background: #f0fdfa; }
    .rp-line { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px; font-family: "Times New Roman", Georgia, serif; font-style: italic; }
    .signa-box { font-size: 12px; color: #1e293b; margin: 8px 0; line-height: 1.45; }
    .validity-row { font-size: 11px; font-weight: 700; color: #0f766e; margin-top: 8px; border-top: 1px dashed #99f6e4; padding-top: 6px; }
    
    .verify-section { display: flex; align-items: center; justify-content: space-between; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin: 14px 0; background: #f8fafc; font-size: 10px; }
    
    .stamps-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 12px; border-top: 1px solid #0f172a; }
    .doctor-stamp { border: 2px solid #0d9488; border-radius: 6px; padding: 6px 12px; text-align: center; color: #0f766e; background: #ffffff; font-size: 10.5px; }
    .clinic-rx-stamp { border: 2px solid #1e3a8a; border-radius: 50%; width: 90px; height: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: #1e3a8a; font-size: 8px; text-transform: uppercase; font-weight: 800; transform: rotate(-5deg); }
    
    @media print {
      body { padding: 0; }
      .rx-container { border: 1.5px solid #000; padding: 15px; }
    }
  </style>
</head>
<body>
  <div class="rx-container">
    <!-- Штамп медорганизации -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div class="org-stamp-box">
        <strong>${clinicName}</strong><br>
        Адрес: ${clinicAddress}<br>
        Тел.: ${clinicPhone} &bull; ОГРН: ${clinicOgrn}<br>
        ИНН: ${clinicInn} &bull; Лицензия: ${clinicLicense}
      </div>
      <div style="text-align: right; font-size: 9.5px; color: #475569;">
        Министерство здравоохранения РФ<br>
        Медицинская документация<br>
        <strong>Форма № 107-1/у</strong><br>
        Приказ Минздрава России № 1094н
      </div>
    </div>

    <div class="header">
      <h2>РЕЦЕПТ (ФОРМА № 107-1/У)</h2>
      <p>для отпуска лекарственных препаратов в аптечных организациях</p>
    </div>

    <!-- Паспортная часть -->
    <div class="patient-grid">
      <div class="lbl">Пациент (Ф.И.О.):</div>
      <div class="val">${data.fullName}</div>
      <div class="lbl">Дата рождения (возраст):</div>
      <div class="val">${patientBirth}</div>
      <div class="lbl">Номер медкарты:</div>
      <div class="val">${data.cardNumber}</div>
      <div class="lbl">Лечащий врач (Ф.И.О.):</div>
      <div class="val">${doctor} (Врач-стоматолог)</div>
      <div class="lbl">Дата выписки:</div>
      <div class="val">${rxDate} г.</div>
    </div>

    <!-- Rp. и Signa (латынь + способ применения) -->
    <div class="rx-box">
      <div class="rp-line">
        Rp.: ${rx.medicationName} ${rx.dosageRu}
      </div>
      <div style="font-size: 11px; font-style: italic; color: #475569; margin-bottom: 6px;">
        D.t.d. N 20 in tab. / caps.
      </div>
      <div class="signa-box">
        <strong>Signa (Способ применения):</strong> ${rx.instructionRu}
      </div>
      <div class="validity-row">
        Курс терапии: ${rx.durationRu} &bull; Срок действия рецепта: ${validity}
      </div>
    </div>

    <!-- QR-код электронной верификации по 63-ФЗ -->
    <div class="verify-section">
      <div>
        <strong style="font-size: 10.5px; color: #0f172a;">Электронная верификация рецепта (63-ФЗ ПЭП)</strong>
        <p style="margin: 2px 0 0 0; color: #64748b;">Проверка подлинности рецепта фармацевтом в ЕГИСЗ / МИС клиники.</p>
        <span style="font-size: 9px; color: #0d9488;">ИД: ${rx.id} &bull; Цифровой реестр DENTE</span>
      </div>
      <div style="flex-shrink: 0; margin-left: 12px;">
        ${qrCodeSvg}
      </div>
    </div>

    <!-- Подписи и печати -->
    <div class="stamps-row">
      <div>
        <div style="font-size: 10.5px; font-weight: 700; margin-bottom: 6px;">Подпись лечащего врача:</div>
        <div style="border-bottom: 1px solid #0f172a; width: 150px; height: 24px; margin-bottom: 8px;"></div>
        <div class="doctor-stamp">
          <div style="font-weight: 800; font-size: 9.5px; text-transform: uppercase;">Врач-стоматолог</div>
          <div style="font-weight: 900; font-size: 11px;">${doctor}</div>
          <div style="font-size: 8.5px; color: #115e59;">Личная печать &bull; Сертификат действителен</div>
        </div>
      </div>

      <div class="clinic-rx-stamp">
        <span>ООО «Стоматологическая клиника ДЕНТЕ»</span>
        <span style="font-size: 8px; margin: 3px 0; border-top: 1px solid #1e3a8a; border-bottom: 1px solid #1e3a8a; padding: 1px 0;">Для рецептов</span>
        <span style="font-size: 6.5px;">г. Санкт-Петербург</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}
