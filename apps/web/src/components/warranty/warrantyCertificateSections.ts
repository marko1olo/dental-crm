/**
 * WARRANTY CERTIFICATE HTML SECTIONS GENERATOR
 * Рендер строк таблицы, условий, чекапов и блока гарантийных устранений
 * Mandate 8b: strict file length budget <= 120 lines.
 */

import { getWarrantyPreset, MANDATORY_WARRANTY_CONDITIONS } from "./warrantyPresets.js";
import type { CheckupScheduleItem, WarrantyCalculationResult, WarrantyItem } from "./warrantyEngineTypes.js";
import type { WarrantyRemediationOrder } from "./warrantyRemediationTypes.js";
import { addMonthsToDate, formatShortDate } from "./warrantyDateUtils.js";

export function renderCertificateItemsRows(items: WarrantyItem[], calculation: WarrantyCalculationResult, issueDate: string): string {
	if (items.length === 0) {
		return `
      <tr class="item-row">
        <td class="col-num">1</td>
        <td class="col-tooth"><strong>—</strong></td>
        <td class="col-work"><div class="work-title">Стоматологическое лечение / конструкция</div><div class="work-cat">По регламенту клиники</div></td>
        <td class="col-material"><div class="mat-name">Сертифицированные материалы клиники</div><div class="mat-meta">Сертификат соответствия / Регистрационное удостоверение</div></td>
        <td class="col-warranty"><div class="war-period">${calculation.adjustedWarrantyMonths} мес.</div></td>
        <td class="col-life">${calculation.adjustedServiceLifeMonths} мес.</td>
      </tr>
    `;
	}

	return items
		.map((item, idx) => {
			const preset = getWarrantyPreset(item.category);
			const warrantyMonths = item.customWarrantyMonths ?? calculation.adjustedWarrantyMonths;
			const serviceLifeMonths = item.customServiceLifeMonths ?? calculation.adjustedServiceLifeMonths;
			const expDate = addMonthsToDate(issueDate, warrantyMonths);
			const serviceCode = item.serviceCode || item.serviceCode804n || preset.serviceCode || preset.serviceCode804n;

			return `
      <tr class="item-row">
        <td class="col-num">${idx + 1}</td>
        <td class="col-tooth"><strong>${item.toothNumber}</strong></td>
        <td class="col-work">
          <div class="work-title">${item.clinicalWorkTitle}</div>
          <div class="work-cat">${preset.shortTitle} • Код услуги: <code>${serviceCode}</code></div>
        </td>
        <td class="col-material">
          <div class="mat-name">${item.materialName}</div>
          <div class="mat-meta">${item.manufacturer} (${item.country})${item.vitaShade ? ` • Оттенок VITA: ${item.vitaShade}` : ""}${item.labOrderNumber ? ` • Наряд ЗТЛ: <code>${item.labOrderNumber}</code>` : ""}</div>
          ${item.lotNumber ? `<div class="mat-lot">LOT / UDI: <code>${item.lotNumber}</code></div>` : ""}
        </td>
        <td class="col-warranty">
          <div class="war-period">${warrantyMonths} мес.</div>
          <div class="war-date">до ${formatShortDate(expDate)}</div>
        </td>
        <td class="col-life">${serviceLifeMonths} мес.</td>
      </tr>
    `;
		})
		.join("\n");
}

export function renderCertificateConditions(): string {
	return MANDATORY_WARRANTY_CONDITIONS.slice(0, 4)
		.map((cond) => `
      <li class="condition-item">
        <div class="cond-head"><span class="cond-num">${cond.number}.</span> <strong class="cond-title">${cond.title}</strong></div>
        <div class="cond-desc">${cond.description}</div>
      </li>`)
		.join("\n");
}

export function renderCertificateCheckups(schedule: CheckupScheduleItem[]): string {
	return schedule
		.slice(0, 6)
		.map((chk) => `
      <div class="checkup-pill">
        <span class="chk-num">Визит #${chk.index}</span>
        <strong class="chk-date">${chk.formattedDate}</strong>
        <span class="chk-status">Бесплатный осмотр</span>
      </div>
    `)
		.join("\n");
}

export function renderCertificateRemediations(remediations?: WarrantyRemediationOrder[]): string {
	if (!remediations || remediations.length === 0) return "";

	return `
    <div class="remediations-section" style="margin-bottom: 18px; position: relative; z-index: 1;">
      <h4 style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase;">
        Гарантийные рекламации и устранение дефектов (0 ₽):
      </h4>
      <table class="items-table" style="margin-bottom: 8px;">
        <thead>
          <tr>
            <th style="width: 15%;">Акт №</th>
            <th style="width: 12%;">Дата</th>
            <th style="width: 8%;">Зуб</th>
            <th style="width: 35%;">Характер дефекта & манипуляция</th>
            <th style="width: 18%;">Списание со склада</th>
            <th style="width: 12%; text-align: right;">К оплате</th>
          </tr>
        </thead>
        <tbody>
          ${remediations.map((r) => `
            <tr>
              <td><strong>${r.orderNumber}</strong></td>
              <td>${formatShortDate(r.performedAtIso.slice(0, 10))}</td>
              <td style="color: #0f766e; font-weight: 800;">${r.toothNumber}</td>
              <td>
                <div style="font-weight: 700; color: #0f172a;">${r.defectTitle}</div>
                <div style="font-size: 8pt; color: #475569;">${r.remediationAction}</div>
              </td>
              <td style="font-size: 8pt; color: #475569;">
                ${r.materialsDeducted.map((m) => `${m.name} (${m.quantity} ${m.unit})`).join(", ")}
              </td>
              <td style="text-align: right; font-weight: 800; color: #059669;">0 ₽ (100%)</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}
