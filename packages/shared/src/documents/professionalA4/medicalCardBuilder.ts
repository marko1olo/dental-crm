/**
 * medicalCardBuilder.ts
 *
 * Layer 2: Канонический генератор печатной формы медицинской карты стоматологического пациента / дневника приёма.
 * Приказ Минздрава РФ № 834н, зубная формула FDI 11..48, протокол лечения, МКБ-10.
 * СТРОГО 2 ЛИСТА А4 по ГОСТ Р 7.0.97-2016 (СТРОГО БЕЗ «043у» В ЗАГОЛОВКАХ!).
 */

import type { A4DocumentMedicalCardData } from "./types.js";
import {
	escapeHtml,
	formatPassportString,
	formatAddressString,
	formatPhoneString,
	formatDateString,
	formatSignatoryString,
} from "./formatters.js";
import {
	A4_PRINT_BASE_STYLES,
	renderClinicHeaderHtml,
	renderRunningFooterHtml,
	renderRunningHeaderHtml,
} from "./styles.js";

/**
 * 6. ПЕЧАТНАЯ ФОРМА МЕДИЦИНСКОЙ КАРТЫ / ДНЕВНИКА ПРИЁМА
 * СТРОГО 2 ЛИСТА А4 по ГОСТ Р 7.0.97-2016 (СТРОГО БЕЗ «043у» В ЗАГОЛОВКАХ!)
 */
export function generateA4MedicalCardDiaryHtml(data: A4DocumentMedicalCardData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const docLabel = `Медицинская карта / Дневник приёма · Пациент: ${pt.fullName}`;

	// Строгая текстовая таблица зубной формулы FDI (11..48)
	const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
	const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
	const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
	const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

	const getToothCode = (n: number): string => {
		if (data.teethFormulaMap && data.teethFormulaMap[n]) {
			return data.teethFormulaMap[n]?.state || "0";
		}
		return "—";
	};

	const renderToothRowCells = (teeth: number[]) =>
		teeth.map((t) => `<td style="text-align:center; width:22px; font-weight:bold; font-size:7.5pt; background:#f7f7f7;">${t}</td>`).join("");

	const renderToothStateCells = (teeth: number[]) =>
		teeth.map((t) => {
			const code = getToothCode(t);
			return `<td style="text-align:center; width:22px; font-size:7.5pt;">${code}</td>`;
		}).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Медицинская карта стоматологического пациента № ${escapeHtml(data.cardNumber)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>

<!-- ════════ ЛИСТ 1 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА / ДНЕВНИК ПРИЁМА</div>
  <div class="a4-doc-subtitle">Амбулаторная медицинская карта стоматологического больного № <strong>${escapeHtml(data.cardNumber)}</strong></div>

  <div class="a4-section-heading">1. Паспортная часть и соматический статус</div>
  <table class="a4-table">
    <tr>
      <td style="width:25%; font-weight:bold; background:#f5f5f5;">Пациент (ФИО):</td>
      <td style="width:45%;"><strong>${escapeHtml(pt.fullName)}</strong></td>
      <td style="width:15%; font-weight:bold; background:#f5f5f5;">Дата рождения:</td>
      <td style="width:15%;">${escapeHtml(pt.birthDate || formatDateString(null))}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Пол / Контакты:</td>
      <td>${pt.gender === "female" ? "Женский" : pt.gender === "male" ? "Мужской" : "—"} · Тел: ${escapeHtml(pt.phone || formatPhoneString(null))}</td>
      <td style="font-weight:bold; background:#f5f5f5;">СНИЛС / ОМС:</td>
      <td>${escapeHtml(pt.snils || pt.omsPolis || "—")}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Паспортные данные:</td>
      <td colspan="3">${escapeHtml(formatPassportString(pt))}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Адрес проживания:</td>
      <td colspan="3">${escapeHtml(pt.address || pt.registrationAddress || formatAddressString(null))}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Аллергологический анамнез:</td>
      <td colspan="3"><strong>${escapeHtml(data.allergyStatus || "Не отягощен (со слов пациента)")}</strong></td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Соматический статус:</td>
      <td colspan="3">${escapeHtml(data.somaticStatus || "Соматически здоров, сопутствующих заболеваний нет")}</td>
    </tr>
  </table>

  <div class="a4-section-heading">2. Протокол клинического осмотра и статус полости рта</div>
  <div style="font-size:9pt; margin:4px 0;"><strong>Жалобы:</strong> ${escapeHtml(data.complaints || "Жалоб на момент осмотра активно не предъявляет.")}</div>
  <div style="font-size:9pt; margin:4px 0;"><strong>Анамнез заболевания (Anamnesis morbi):</strong> ${escapeHtml(data.anamnesisMorbi || "Обратился для планового осмотра и санации полости рта.")}</div>
  <div style="font-size:9pt; margin:4px 0;"><strong>Объективный осмотр (Status localis):</strong> ${escapeHtml(data.statusLocalis || "Слизистая оболочка полости рта физиологической окраски, влажная. Регионарные лимфоузлы не увеличены, безболезненны. Прикус физиологический.")}</div>

  <div class="a4-section-heading">3. Зубная формула (FDI World Dental Federation)</div>
  <table class="a4-table" style="font-size:7.5pt; text-align:center; margin: 4px 0;">
    <tr>
      <td colspan="8" style="background:#eeeeee; font-weight:bold; text-align:center;">Верхняя челюсть справа</td>
      <td colspan="8" style="background:#eeeeee; font-weight:bold; text-align:center;">Верхняя челюсть слева</td>
    </tr>
    <tr>
      ${renderToothRowCells(upperRight)}
      ${renderToothRowCells(upperLeft)}
    </tr>
    <tr>
      ${renderToothStateCells(upperRight)}
      ${renderToothStateCells(upperLeft)}
    </tr>
    <tr>
      <td colspan="16" style="height:3px; padding:0; background:#000000;"></td>
    </tr>
    <tr>
      ${renderToothStateCells(lowerRight)}
      ${renderToothStateCells(lowerLeft)}
    </tr>
    <tr>
      ${renderToothRowCells(lowerRight)}
      ${renderToothRowCells(lowerLeft)}
    </tr>
    <tr>
      <td colspan="8" style="background:#eeeeee; font-weight:bold; text-align:center;">Нижняя челюсть справа</td>
      <td colspan="8" style="background:#eeeeee; font-weight:bold; text-align:center;">Нижняя челюсть слева</td>
    </tr>
  </table>
  <div style="font-size:7.5pt; color:#444444; margin-bottom:4px;">
    Обозначения: С — кариес, P — пульпит, Pt — периодонтит, П — пломба, К — коронка, И — имплантат, 0 — отсутствует, R — корень, — — здоровый.
    ${data.teethFormulaSummary ? `<br><strong>Расшифровка формулы:</strong> ${escapeHtml(data.teethFormulaSummary)}` : ""}
  </div>

  ${renderRunningFooterHtml(docLabel, 1, 2)}
</div>

<!-- ════════ ЛИСТ 2 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderRunningHeaderHtml(docLabel, 2)}

  <div class="a4-section-heading">4. Клинический диагноз (МКБ-10)</div>
  <div style="font-size:9.5pt; margin:5px 0;">
    <strong>Код МКБ-10:</strong> <span style="font-family:'PT Astra Sans', Arial, sans-serif; font-weight:bold;">${escapeHtml(data.diagnosisIcd10)}</span> — ${escapeHtml(data.diagnosisDescription)}
    ${data.diagnosisTooth ? ` (Область/Зуб FDI: № ${escapeHtml(data.diagnosisTooth)})` : ""}
  </div>

  <div class="a4-section-heading">5. Дневник приёма и протокол проведённого лечения</div>
  <div style="font-size:9pt; line-height:1.35; text-align:justify; margin:5px 0;">
    <strong>Дата приёма:</strong> «${escapeHtml(data.visitDate)}» г.<br>
    <strong>Проведённое лечение и манипуляции:</strong><br>
    ${escapeHtml(data.treatmentProtocol || "Проведена консультация, диагностический осмотр, составлен план лечения.")}
  </div>

  <div class="a4-section-heading">6. Примененные препараты и стоматологические материалы</div>
  <div style="font-size:8.5pt; margin:4px 0;">
    ${escapeHtml(data.materialsUsed || "Стандартный терапевтический набор, антисептическая обработка полости рта.")}
  </div>

  <div class="a4-section-heading">7. Рекомендации, назначения и профилактический режим</div>
  <div style="font-size:9pt; line-height:1.3; margin:4px 0;">
    ${escapeHtml(data.recommendations || "Соблюдать гигиену полости рта, явка на контрольный осмотр через 6 месяцев.")}
  </div>
  ${data.nextVisitDate ? `<div style="font-size:9pt; margin:5px 0;"><strong>Следующий визит назначен на:</strong> «${escapeHtml(data.nextVisitDate)}» г.</div>` : ""}

  <div class="a4-sign-grid" style="margin-top:16px;">
    <div class="a4-sign-col">
      <strong>ЛЕЧАЩИЙ ВРАЧ:</strong><br><br>
      ${escapeHtml(data.doctorSpecialty || "Врач-стоматолог")}:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || formatSignatoryString(null))} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>ПАЦИЕНТ:</strong><br><br>
      С диагнозом, планом лечения и рекомендациями ознакомлен:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(pt.fullName)} /</div>
    </div>
  </div>

  ${renderRunningFooterHtml(docLabel, 2, 2)}
</div>
</body>
</html>`;
}
