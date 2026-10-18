import { escapeHtml } from "../documentPrintFormatters";
import { SURGICAL_OPERATION_PROTOCOL_CSS } from "./css";
import { buildSurgicalOperationProtocolContext } from "./helpers";
import type { SurgicalOperationProtocolPrintOptions, SurgicalOperationProtocolContext } from "./types";

function renderImplantTable(details: SurgicalOperationProtocolContext["surgeryDetails"]): string {
	if (!details?.implantBrand) return "";
	return `
    <div class="section-title">Параметры установленного имплантата</div>
    <table class="implant-table">
      <thead>
        <tr><th>Система</th><th>Диаметр</th><th>Длина</th><th>Торк (Н·см)</th><th>Стабильность ISQ</th><th>Элемент укрытия</th><th>LOT / Партия</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${escapeHtml(details.implantBrand)} ${escapeHtml(details.implantModel || "")}</strong></td>
          <td>${escapeHtml(String(details.diameterMm || "4.0"))} мм</td>
          <td>${escapeHtml(String(details.lengthMm || "10.0"))} мм</td>
          <td>${escapeHtml(String(details.torqueNcm || "35"))} Н·см</td>
          <td>${escapeHtml(String(details.isq || "72"))}</td>
          <td>${details.capType === "plug" ? "Винт-заглушка (двухэтапный)" : "ФДМ (формирователь десны)"}</td>
          <td>${escapeHtml(details.lotNumber || "—")}</td>
        </tr>
      </tbody>
    </table>`;
}

export function generateSurgicalOperationProtocolHtml(
	options: SurgicalOperationProtocolPrintOptions,
): string {
	const ctx = buildSurgicalOperationProtocolContext(options);
	const {
		formattedDate, clinicName, clinicAddress, clinicPhone, clinicLicense, clinicInn,
		ptName, ptBirth, ptCard, doctor, assistant, opTitle, toothStr, diagStr, mkbStr,
		anesthesiaText, protocolBody, stampHtml, surgeryDetails,
	} = ctx;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Протокол операции — ${escapeHtml(options.patient?.fullName || "Пациент")}</title>
  <style>${SURGICAL_OPERATION_PROTOCOL_CSS}</style>
</head>
<body>
  <div class="protocol-container">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="clinic-title">${clinicName}</div>
          <div class="clinic-meta">${clinicAddress}${clinicPhone ? ` · Тел: ${escapeHtml(clinicPhone)}` : ""}<br/>Лицензия: ${clinicLicense} · ИНН: ${clinicInn}</div>
        </td>
        <td class="doc-number" style="vertical-align: top;">
          <div>Мед. карта №: <strong>${ptCard}</strong></div>
          <div style="font-size: 8pt; color: #6b7280; margin-top: 2px;">Медицинская карта приёма</div>
          <div style="font-size: 8.5pt; color: #111827; margin-top: 3px;">Дата: <strong>${formattedDate}</strong></div>
        </td>
      </tr>
    </table>
    <h1>Протокол операции</h1>
    <div class="sub-title">${opTitle} · ${toothStr}</div>
    <div class="meta-box">
      <div class="meta-row"><span class="meta-label">Ф.И.О. пациента:</span><span class="meta-val"><strong>${ptName}</strong></span></div>
      <div class="meta-row"><span class="meta-label">Дата рождения:</span><span class="meta-val">${ptBirth}</span></div>
      <div class="meta-row"><span class="meta-label">Диагноз (МКБ-10):</span><span class="meta-val">${diagStr} [${mkbStr}]</span></div>
      <div class="meta-row"><span class="meta-label">Оперирующий хирург:</span><span class="meta-val">${doctor}</span></div>
      <div class="meta-row"><span class="meta-label">Ассистент:</span><span class="meta-val">${assistant}</span></div>
      <div class="meta-row"><span class="meta-label">Анестезиологическое пособие:</span><span class="meta-val">${anesthesiaText}</span></div>
    </div>
    <div class="section-title">Ход операции</div>
    <div class="protocol-text-block">${protocolBody}</div>
    ${renderImplantTable(surgeryDetails)}
    <div class="section-title">Послеоперационные назначения и рекомендации</div>
    <div style="font-size: 9pt; line-height: 1.45; color: #374151; margin-bottom: 14px;">
      1. Холод на область операции местно (по 15 мин с перерывами 20 мин в первые 2-3 часа).<br/>
      2. Исключить горячую, грубую пищу, тепловые процедуры на 3–5 дней.<br/>
      3. Ротовые ванночки с антисептиком (Хлоргексидин 0.05% / Мирамистин 0.01%) 3-4 раза в день после еды.<br/>
      4. При болях: НПВС по согласованию с врачом.<br/>
      5. Явка на контрольный осмотр и снятие швов через 7–10 суток.
    </div>
    <div class="signatures-block">
      ${stampHtml}
      <div class="sig-col"><div>Врач стоматолог-хирург:</div><div class="sig-line"></div><div class="sig-caption">(подпись / ${doctor})</div></div>
      <div class="sig-col"><div>Пациент ознакомлен:</div><div class="sig-line"></div><div class="sig-caption">(подпись / ${ptName})</div></div>
    </div>
  </div>
</body>
</html>`;
}
