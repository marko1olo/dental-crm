import { STOMX_SPECIALIZED_CONSENT_PRESETS } from "./stomxConsentPresets.js";
import {
	getStomxTemplateMetadata,
	resolveStomxVariableToken,
	type StomxVariableContext,
} from "./stomxLegalConsentsCatalog.js";

export interface GenerateStomxConsentOptions {
	templateIdOrAlias?: string | number;
	aliasOrId?: string | number;
	context?: StomxVariableContext;
	toothOrArea?: string;
}

/**
 * Генерирует регламентный HTML-документ A4 для любого из 21 шаблонов StomX.
 * Полностью соответствует стандартам Минздрава РФ (1051н, 323-ФЗ, СанПиН 2.6.1.1192-03)
 * и правилу нулевых эмодзи (Мандат 8d, п. 7).
 */
export function generateStomxConsentHtml(
	aliasOrIdOrOptions: string | number | GenerateStomxConsentOptions,
	maybeContext?: StomxVariableContext,
): string {
	let aliasOrId: string | number;
	let context: StomxVariableContext;
	let toothAreaOverride: string | undefined;

	if (typeof aliasOrIdOrOptions === "object" && aliasOrIdOrOptions !== null) {
		aliasOrId = aliasOrIdOrOptions.templateIdOrAlias ?? aliasOrIdOrOptions.aliasOrId ?? "";
		context = aliasOrIdOrOptions.context ?? {};
		toothAreaOverride = aliasOrIdOrOptions.toothOrArea;
	} else {
		aliasOrId = aliasOrIdOrOptions;
		context = maybeContext ?? {};
	}

	const meta = getStomxTemplateMetadata(aliasOrId);
	if (!meta) {
		throw new Error(`Не найден шаблон StomX: ${aliasOrId}`);
	}

	const preset = STOMX_SPECIALIZED_CONSENT_PRESETS[meta.procedureType];
	const patientName = resolveStomxVariableToken("Пациент.ФИО", context);
	const clinicName = resolveStomxVariableToken("Клиника.Название", context);
	const clinicAddress = resolveStomxVariableToken("Клиника.ФактАдрес", context);
	const doctorName = resolveStomxVariableToken("Врач.ФИО", context);
	const currentDate = resolveStomxVariableToken("ТекущаяДата", context);
	const passportData = resolveStomxVariableToken("Пациент.ПаспортДанные", context);
	const patientAddress = resolveStomxVariableToken("Пациент.Адрес", context);
	const toothArea = toothAreaOverride || resolveStomxVariableToken("Прием.Зубы", context);
	const cardNumber = resolveStomxVariableToken("Пациент.НомерКарты", context);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${meta.name}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 20px;
    }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px; }
    .clinic-title { font-size: 13pt; font-weight: 700; text-transform: uppercase; }
    .clinic-sub { font-size: 9pt; color: #475569; }
    .doc-title { font-size: 14pt; font-weight: 800; text-align: center; margin: 16px 0 6px 0; text-transform: uppercase; }
    .doc-subtitle { font-size: 12pt; font-weight: 700; text-align: center; margin-bottom: 12px; color: #1e293b; }
    .legal-basis { font-size: 8.5pt; color: #64748b; text-align: center; margin-bottom: 16px; font-style: italic; }
    .section-p { margin-bottom: 10px; text-align: justify; text-indent: 1.25cm; }
    .patient-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 10pt; }
    .clinical-block { margin-bottom: 12px; }
    .clinical-title { font-weight: 700; font-size: 11pt; margin-bottom: 4px; color: #0f172a; }
    ul { margin: 4px 0 10px 24px; padding: 0; }
    li { margin-bottom: 3px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; }
    .sign-col { width: 45%; }
    .sign-line { border-bottom: 1px solid #0f172a; margin-top: 36px; margin-bottom: 4px; }
    .sign-caption { font-size: 8.5pt; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="clinic-title">${clinicName}</div>
    <div class="clinic-sub">${clinicAddress} • Лицензия: ЛО41-01137-77/00368421</div>
  </div>

  <div class="doc-title">${meta.name}</div>
  <div class="doc-subtitle">${preset?.procedureName || meta.name}</div>
  <div class="legal-basis">Нормативное основание: ${meta.statutoryBasis}</div>

  <div class="patient-box">
    <div><strong>Пациент:</strong> ${patientName} • Карта №: ${cardNumber}</div>
    <div><strong>Документ, удостоверяющий личность:</strong> ${passportData}</div>
    <div><strong>Адрес регистрации:</strong> ${patientAddress}</div>
    ${toothArea !== "«____________________»" ? `<div><strong>Область вмешательства (зубы / челюсть):</strong> ${toothArea}</div>` : ""}
  </div>

  <div class="section-p">
    Я, <strong>${patientName}</strong>, настоящим подтверждаю, что в соответствии со ст. 19–23 Федерального закона № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации» мне сообщена в доступной и понятной форме вся необходимая информация о предстоящем медицинском вмешательстве, его целях, характере, применяемых методиках, лекарственных препаратах и материалах.
  </div>

  ${preset ? `
  <div class="clinical-block">
    <div class="clinical-title">1. Клинический диагноз и показания к вмешательству:</div>
    <div class="section-p">${preset.diagnosisOrIndication}</div>
  </div>

  <div class="clinical-block">
    <div class="clinical-title">2. Планируемое обезболивание:</div>
    <div class="section-p">${preset.plannedAnesthesia}</div>
  </div>

  <div class="clinical-block">
    <div class="clinical-title">3. Применяемые материалы, медикаменты и технологии:</div>
    <div class="section-p">${preset.materialsAndSystems}</div>
  </div>

  <div class="clinical-block">
    <div class="clinical-title">4. Факторы риска, соматический статус и индивидуальные особенности:</div>
    <ul>
      ${preset.patientSpecificRiskFactors.map((r) => `<li>${r}</li>`).join("")}
    </ul>
  </div>

  <div class="clinical-block">
    <div class="clinical-title">5. Возможные осложнения, риски и нежелательные последствия:</div>
    <ul>
      ${preset.procedureSpecificRisks.map((r) => `<li>${r}</li>`).join("")}
    </ul>
  </div>

  <div class="clinical-block">
    <div class="clinical-title">6. Разъясненные альтернативные методы лечения:</div>
    <ul>
      ${preset.alternatives.map((a) => `<li>${a}</li>`).join("")}
    </ul>
  </div>

  <div class="clinical-block">
    <div class="clinical-title">7. Рекомендации после лечения и обязательства пациента:</div>
    <ul>
      ${preset.aftercareAndLimits.map((l) => `<li>${l}</li>`).join("")}
    </ul>
  </div>
  ` : ""}

  <div class="section-p">
    Мне разъяснено и понятно, что медицинская помощь оказывается с соблюдением стандартов и клинических рекомендаций СтАР. На все заданные мной вопросы лечащим врачом даны исчерпывающие и понятные ответы. Я добровольно даю свое согласие на проведение указанного медицинского вмешательства.
  </div>

  <div class="signatures">
    <div class="sign-col">
      <div>Пациент (законный представитель):</div>
      <div class="sign-line"></div>
      <div class="sign-caption">(подпись и расшифровка: ${patientName})</div>
    </div>
    <div class="sign-col">
      <div>Лечащий врач:</div>
      <div class="sign-line"></div>
      <div class="sign-caption">(подпись и расшифровка: ${doctorName})</div>
    </div>
  </div>

  <div style="margin-top: 14px; font-size: 9pt; color: #64748b; text-align: right;">
    Дата оформления: ${currentDate}
  </div>
</body>
</html>`;
}
