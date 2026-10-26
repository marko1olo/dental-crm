/**
 * paidContract/blankConsentGenerator.ts
 * Blank Informed Consent HTML with underlines for handwriting (Mandate 8b <= 120 lines, Mandate 8e)
 */

import type { BlankContractOptions, BlankContractPatientInfo } from "./blankContractTypes";
import { getContractPrintStyles } from "./contractPrintStyles";

export function generateBlankConsentHtml(
	patient?: BlankContractPatientInfo,
	options?: BlankContractOptions,
): string {
	const clinicTitle = options?.clinicName || "Стоматологическая клиника DENTE";
	const patientName = patient?.fullName || "________________________________________________";
	const birthDate = patient?.birthDate || "«___» _________ ______ г.";
	const address = patient?.administrativeProfile?.registrationAddress || "________________________________________________________";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Информированное добровольное согласие</title>
<style>${getContractPrintStyles()}</style>
</head>
<body>
<div class="contract-sheet">
  <div style="text-align:center; font-weight:bold; font-size:10.5pt; text-transform:uppercase;">${clinicTitle}</div>
  <div class="contract-title" style="margin-top:12px;">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ</div>
  <div class="contract-subtitle">на медицинское вмешательство (осмотр, диагностика, местное обезболивание)</div>

  <p>Я, <strong>${patientName}</strong>, дата рождения: <strong>${birthDate}</strong>, зарегистрированный(ая) по адресу: <strong>${address}</strong>, даю согласие на проведение стоматологического осмотра, инструментальной диагностики и применения местного инъекционного обезболивания.</p>

  <div class="section-title">1. Разъяснение сути медицинских процедур</div>
  <p>Мне разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинских вмешательств, их последствия, в том числе вероятность развития осложнений.</p>

  <div class="section-title">2. Аллергологический анамнез и соматическое здоровье</div>
  <p>Аллергические реакции на анестетики, антибиотики и лекарственные препараты: __________________________________________________.</p>
  <p>Сопутствующие хронические заболевания: __________________________________________________.</p>

  <div class="section-title">3. Подтверждение добровольного согласия</div>
  <p>Я подтверждаю, что имел(а) возможность задать все интересующие вопросы и получил(а) на них исчерпывающие ответы лечащего врача.</p>

  <div style="margin-top:24px; display:flex; justify-content:space-between; font-size:8pt;">
    <div>Пациент: ___________________ / ${patientName} /</div>
    <div>Врач: ___________________ / ${options?.doctorName || "____________________"} /</div>
  </div>
  <div style="margin-top:10px; font-size:7.5pt; color:#64748b;">Дата: «${options?.contractDate || "___"}» _________ 20___ г.</div>
</div>
</body>
</html>`;
}
