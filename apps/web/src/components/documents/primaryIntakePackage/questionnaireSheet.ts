import { escapeHtml } from "../documentPrintFormatters";
import type { IntakeRequisitesContext, PrimaryIntakePackagePrintOptions } from "./types";

export function renderQuestionnaireSheet(
	ctx: IntakeRequisitesContext,
	options: PrimaryIntakePackagePrintOptions,
): string {
	const {
		clinicName, patientCardNumber, ptName, ptBirthDate, hasRep, repFullName, repRelation,
		repPhone, ptPhone, ptSignatureDecoding, todayFormatted, docDoctorName,
	} = ctx;
	const { intakeNormApplied = true, questionnaireAnswers } = options;

	return `  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div><strong>${clinicName}</strong> · Медицинская карта № ${patientCardNumber || "________"}</div>
          <div style="text-align: right;"><span class="statutory-badge">Медицинская карта приёма · Стандарты СтАР</span></div>
        </div>
        <h1>АНКЕТА О СОСТОЯНИИ ЗДОРОВЬЯ ПАЦИЕНТА</h1>
        <div class="sheet-subtitle">Приложение к медицинской карте приёма пациента</div>
      </div>
      <div class="parties-block" style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
        <div>Пациент: <strong>${ptName}</strong></div><div>Дата рождения: <strong>${ptBirthDate}</strong></div>
        ${hasRep ? `<div>Представитель: <strong>${repFullName}</strong> (${repRelation})</div>` : ""}
        <div>Телефон: <strong>${hasRep ? repPhone : ptPhone}</strong></div>
      </div>
      <table class="data-table">
        <thead>
          <tr><th style="width: 25px; text-align: center;">№</th><th>Контрольный вопрос о соматическом статусе</th><th style="width: 140px; text-align: center;">Ответ</th><th style="width: 180px;">Клинические примечания</th></tr>
        </thead>
        <tbody>
          <tr><td style="text-align: center;">1</td><td><strong>Аллергии:</strong> антибиотики, йод, латекс, анестетики</td><td class="check-cell">${escapeHtml(questionnaireAnswers?.allergies) || (intakeNormApplied ? "НЕТ (Отрицает)" : "[ ] Да [ ] Нет")}</td><td>${intakeNormApplied && !questionnaireAnswers?.allergies ? "Аллергоанамнез спокоен" : ""}</td></tr>
          <tr><td style="text-align: center;">2</td><td><strong>Непереносимость анестезии:</strong> ультракаин, лидокаин</td><td class="check-cell">${intakeNormApplied ? "НЕТ (Отрицает)" : "[ ] Да [ ] Нет"}</td><td>Ранее лечился без осложнений</td></tr>
          <tr><td style="text-align: center;">3</td><td><strong>Сердечно-сосудистые заболевания:</strong> гипертония, стенокардия</td><td class="check-cell">${escapeHtml(questionnaireAnswers?.cardioEndocrine) || (intakeNormApplied ? "НЕТ (Отрицает)" : "[ ] Да [ ] Нет")}</td><td>${intakeNormApplied ? "Соматически здоров" : ""}</td></tr>
          <tr><td style="text-align: center;">4</td><td><strong>Свертываемость крови:</strong> кровоточивость, антикоагулянты</td><td class="check-cell">${escapeHtml(questionnaireAnswers?.anticoagulants) || (intakeNormApplied ? "НЕ ПРИНИМАЕТ" : "[ ] Да [ ] Нет")}</td><td>Гемостаз в норме</td></tr>
          <tr><td style="text-align: center;">5</td><td><strong>Сахарный диабет и эндокринные нарушения</strong></td><td class="check-cell">${intakeNormApplied ? "НЕТ (Отрицает)" : "[ ] Да [ ] Нет"}</td><td>Норма</td></tr>
          <tr><td style="text-align: center;">6</td><td><strong>Инфекционные риски:</strong> гепатиты B/C, ВИЧ, туберкулез</td><td class="check-cell">${escapeHtml(questionnaireAnswers?.infections) || (intakeNormApplied ? "НЕТ (Отрицает)" : "[ ] Да [ ] Нет")}</td><td>${intakeNormApplied ? "Инфекции отрицает" : ""}</td></tr>
          <tr><td style="text-align: center;">7</td><td><strong>Хронические соматические заболевания:</strong> астма, язва ЖКТ</td><td class="check-cell">${escapeHtml(questionnaireAnswers?.chronic) || (intakeNormApplied ? "НЕТ (Отрицает)" : "[ ] Да [ ] Нет")}</td><td>Без особенностей</td></tr>
          <tr><td style="text-align: center;">8</td><td><strong>Постоянно принимаемые лекарства:</strong> гормоны, седативные</td><td class="check-cell">${escapeHtml(questionnaireAnswers?.medications) || (intakeNormApplied ? "НЕ ПРИНИМАЕТ" : "[ ] Да [ ] Нет")}</td><td>Не принимает</td></tr>
          <tr><td style="text-align: center;">9</td><td><strong>Беременность / лактация (для женщин)</strong></td><td class="check-cell">${escapeHtml(questionnaireAnswers?.pregnancy) || (intakeNormApplied ? "Не применимо / Нет" : "[ ] Да [ ] Нет")}</td><td>Не применимо</td></tr>
          <tr><td style="text-align: center;">10</td><td><strong>Причина обращения / жалобы на момент визита</strong></td><td colspan="2">${escapeHtml(questionnaireAnswers?.complaint) || (intakeNormApplied ? "Плановый осмотр и консультация (жалоб нет)" : "Первичный консультативный приём")}</td></tr>
        </tbody>
      </table>
      <div style="font-size: 7.8pt; line-height: 1.3; background: #fafafa; border: 1px solid #e5e7eb; padding: 5pt 7pt; border-radius: 3pt; margin-top: 4pt;">
        <strong>Заявление ${hasRep ? "законного представителя" : "пациента"}:</strong> Подтверждаю достоверность сведений о здоровье ${hasRep ? "ребенка" : ""}. Обязуюсь своевременно сообщать врачу об изменениях.
      </div>
    </div>
    <div class="signatures-row">
      <div class="sign-box">
        ${hasRep ? `Законный представитель (${repRelation}):` : "Пациент (Заказчик):"}<br>
        <strong>${hasRep ? repFullName : ptName}</strong><br>
        Подпись: ________________________${hasRep ? ` / ${repFullName} /` : ptSignatureDecoding}<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(${hasRep ? "подпись законного представителя" : "личная подпись пациента"} / дата: ${todayFormatted})</div>
      </div>
      <div class="sign-box">
        Анкету проверил и принял (врач / регистратор):<br>
        <strong>${docDoctorName}</strong><br>
        Подпись: ________________________<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(подпись принявшего специалиста / дата: ${todayFormatted})</div>
      </div>
    </div>
  </div>`;
}
