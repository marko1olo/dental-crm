/**
 * a4PrintableGenerator.ts — Генерация печатного HTML бланка счета-реестра А4
 */

import { DMS_A4_PRINT_CSS } from "./a4PrintableStyles.js";
import { escapeXml, formatKopecksToRub } from "./formatters.js";
import type { ClinicLegalProfile, DmsInsuranceContractRecord, DmsRegistryItemRecord } from "./types.js";

export function generateDmsA4PrintableHtml(
	records: readonly DmsRegistryItemRecord[],
	clinic: ClinicLegalProfile,
	selectedContract: DmsInsuranceContractRecord | undefined,
	periodStr: string,
	registryNumber: string,
): string {
	const totalBillKop = records.reduce((acc, r) => acc + r.totalPriceKopecks, 0);
	const totalDmsKop = records.reduce((acc, r) => acc + r.dmsCoveredKopecks, 0);
	const totalPatientKop = records.reduce((acc, r) => acc + r.patientPaidKopecks, 0);
	const uniquePatients = new Set(records.map((r) => r.patientFullName)).size;
	const currentDateStr = new Date().toLocaleDateString("ru-RU");

	const insurerTitle = selectedContract
		? `${selectedContract.insurerShortName} (${selectedContract.insurerFullName})`
		: "Страховые компании ДМС (Сводный реестр)";
	const insurerInn = selectedContract?.inn || clinic.inn;
	const insurerKpp = selectedContract?.kpp || "770101001";
	const contractInfo = selectedContract
		? `по Договору ДМС № ${selectedContract.contractNumber} от ${selectedContract.contractDate}`
		: "по Договорам на оказание медицинских услуг ДМС";

	const tableRowsHtml = records.map((r, i) => `<tr>
    <td style="text-align: center;">${i + 1}</td>
    <td>${r.visitDate}</td>
    <td><strong>${escapeXml(r.patientFullName)}</strong><br><span style="font-size: 10px; color: #475569;">Полис: ${escapeXml(r.policyNumber)}</span></td>
    <td style="font-family: monospace; font-weight: 600;">${escapeXml(r.serviceCode804n)}</td>
    <td>${escapeXml(r.serviceName)}${r.toothNumber ? ` (Зуб ${r.toothNumber})` : ""}</td>
    <td style="text-align: center;">${escapeXml(r.diagnosisMkb10)}</td>
    <td style="text-align: center;">${r.quantity}</td>
    <td style="text-align: right;">${(r.totalPriceKopecks / 100).toFixed(2)}</td>
    <td style="text-align: right; font-weight: 700; color: #0284c7;">${(r.dmsCoveredKopecks / 100).toFixed(2)}</td>
    <td style="text-align: right; color: #d97706;">${(r.patientPaidKopecks / 100).toFixed(2)}</td>
  </tr>`).join("");

	return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
  <title>Счет-реестр медицинских услуг по ДМС № ${registryNumber}</title>
  <style>${DMS_A4_PRINT_CSS}</style></head><body>
  <div class="header-box">
    <div class="clinic-head">${clinic.legalName} (${clinic.brandName})</div>
    <div style="font-size: 10px; color: #475569;">
      ИНН: ${clinic.inn} | ОГРН: ${clinic.ogrn} | КПП: ${clinic.kpp} | Лицензия: ${clinic.licenseNumber} от ${clinic.licenseDate}<br>
      Адрес: ${clinic.address} | Тел: ${clinic.phone} | Р/с: ${clinic.bankAccount || "40702810438000012345"} в ${clinic.bankName || "ПАО Сбербанк"} (БИК: ${clinic.bankBic || "044525225"})
    </div>
  </div>
  <div class="doc-main-title">СЧЕТ-РЕЕСТР МЕДИЦИНСКИХ УСЛУГ ПО ДМС № ${registryNumber}</div>
  <div class="doc-sub">Период оказания услуг: <strong>${periodStr}</strong> | Дата формирования: «${currentDateStr}» г.</div>
  <div class="parties-grid">
    <div class="party-col"><strong>ИСПОЛНИТЕЛЬ (Медицинская организация):</strong><br>${clinic.legalName}<br>ИНН/КПП: ${clinic.inn} / ${clinic.kpp}<br>Главный врач: ${clinic.chiefDoctorFullName}</div>
    <div class="party-col"><strong>ЗАКАЗЧИК (Страховая организация):</strong><br>${insurerTitle}<br>ИНН/КПП: ${insurerInn} / ${insurerKpp}<br>Основание: ${contractInfo}</div>
  </div>
  <table>
    <thead><tr>
      <th style="width: 25px; text-align: center;">№</th><th style="width: 65px;">Дата</th><th style="width: 140px;">Застрахованный / Полис</th><th style="width: 80px;">Код услуги</th><th>Наименование медицинской услуги</th><th style="width: 50px; text-align: center;">МКБ</th><th style="width: 35px; text-align: center;">Кол</th><th style="width: 75px; text-align: right;">Всего (руб)</th><th style="width: 80px; text-align: right;">ДМС (руб)</th><th style="width: 75px; text-align: right;">Доплата (руб)</th>
    </tr></thead>
    <tbody>${tableRowsHtml}
      <tr class="totals-row">
        <td colspan="7" style="text-align: right;">ИТОГО ПО РЕЕСТРУ:</td>
        <td style="text-align: right;">${(totalBillKop / 100).toFixed(2)}</td>
        <td style="text-align: right; color: #0284c7;">${(totalDmsKop / 100).toFixed(2)}</td>
        <td style="text-align: right; color: #d97706;">${(totalPatientKop / 100).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-top: 10px; font-size: 11px;">
    <strong>ИТОГО К ОПЛАТЕ СТРАХОВЩИКОМ:</strong> <span style="font-size: 13px; font-weight: 800; color: #0284c7;">${formatKopecksToRub(totalDmsKop)}</span><br>
    <em>НДС не облагается на основании подпункта 2 пункта 2 статьи 149 Налогового кодекса Российской Федерации.</em><br>
    Обслужено застрахованных пациентов: <strong>${uniquePatients} чел.</strong> | Оказано медицинских услуг: <strong>${records.length} ед.</strong>
  </div>
  <div class="act-section">
    <div class="act-title">ДВУСТОРОННИЙ АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ УСЛУГ</div>
    <div style="text-align: justify; text-indent: 18px; margin-bottom: 8px;">
      Мы, нижеподписавшиеся, представитель Исполнителя Главный врач <strong>${clinic.chiefDoctorFullName}</strong>, с одной стороны, и уполномоченный представитель Страховщика, с другой стороны, подтверждаем, что медицинские стоматологические услуги за отчетный период <strong>${periodStr}</strong> по Счёту-реестру № <strong>${registryNumber}</strong> оказаны в полном объеме, надлежащего качества и в установленный срок. Взаимных финансовых и медицинских претензий Стороны не имеют.
    </div>
    <div class="signatures">
      <div class="sig-col"><strong>ОТ ИСПОЛНИТЕЛЯ:</strong><br>Главный врач ${clinic.legalName}<br><br>_________________ / ${clinic.chiefDoctorFullName} /<div class="sig-line">М.П. &nbsp;&nbsp;&nbsp;&nbsp; «___» ___________ 2026 г.</div></div>
      <div class="sig-col"><strong>ОТ СТРАХОВЩИКА:</strong><br>Куратор направления ДМС<br><br>_________________ / _____________________ /<div class="sig-line">М.П. &nbsp;&nbsp;&nbsp;&nbsp; «___» ___________ 2026 г.</div></div>
    </div>
  </div>
</body></html>`;
}
