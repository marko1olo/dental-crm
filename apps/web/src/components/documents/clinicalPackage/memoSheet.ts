import type { ClinicalRequisitesContext } from "./types";

export function renderClinicalMemoSheet(ctx: ClinicalRequisitesContext): string {
	const {
		clinicName, clinicAddress, clinicPhone, ptName, opType, opTooth, icdDiagnosis,
		docDoctorName, todayFormatted,
	} = ctx;

	return `  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong><br>
            Адрес: ${clinicAddress}${clinicPhone ? ` • Круглосуточный телефон: <strong>${clinicPhone}</strong>` : ""}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Закон РФ № 2300-1</span><br>
            <span class="statutory-badge">Памятка пациента</span>
          </div>
        </div>
      </div>

      <h1>Памятка пациента после терапевтического стоматологического лечения зубов и пломбирования</h1>
      <div class="sheet-subtitle">Рекомендации по уходу за полостью рта, питанию и режиму после установки пломбы и эндодонтического лечения</div>

      <div class="parties-block">
        Уважаемый(ая) <strong>${ptName}</strong>!<br>
        Вам проведено лечение: <strong>${opType} в области ${opTooth}${icdDiagnosis}</strong>.<br>
        Лечащий врач-терапевт: <strong>${docDoctorName}</strong>. Дата приёма: <strong>${todayFormatted}</strong>.
      </div>

      <div class="memo-box">
        <strong>ПЕРВЫЕ ЧАСЫ ПОСЛЕ ЛЕЧЕНИЯ И УСТАНОВКИ ПЛОМБЫ:</strong>
        <ol style="margin: 3pt 0 2pt 12pt;">
          <li><strong>Действие анестезии:</strong> не принимайте пищу до восстановления чувствительности (2–3 часа). Разрешена не горячая вода.</li>
          <li><strong>Ощущение высоты:</strong> если при смыкании зубов чувствуется завышение — позвоните в клинику, коррекция занимает 2 минуты.</li>
          <li><strong>Чувствительность:</strong> умеренная чувствительность при накусывании в первые 3–5 дней является естественной реакцией.</li>
          <li><strong>Диета в первые 24 часа:</strong> после реставрации воздержитесь от курения и красящих продуктов (кофе, чай, свекла).</li>
        </ol>
      </div>

      <div class="section-title">2. Уход при эндодонтическом лечении (лечении каналов зуба)</div>
      <ul>
        <li><strong>Временная пломба:</strong> берегите эту сторону при жевании, своевременно явитесь на следующий приём!</li>
        <li><strong>Болезненность:</strong> при выраженном дискомфорте примите обезболивающий препарат по назначению врача.</li>
        <li><strong>Гигиена:</strong> чистите зубы обычной щеткой 2 раза в день, используйте зубную нить.</li>
      </ul>

      <div class="memo-alert">
        <strong>ОБЯЗАТЕЛЬНО СВЯЖИТЕСЬ С КЛИНИКОЙ, ЕСЛИ:</strong>
        <ul style="margin: 2pt 0 1pt 12pt;">
          <li>Появилась самопроизвольная пульсирующая ночная боль;</li>
          <li>Появилась припухлость десны или отек щеки;</li>
          <li>Повысилась температура тела выше 37.5 °C;</li>
          <li>Пломба завышает прикус при смыкании челюстей.</li>
        </ul>
      </div>

      <p style="font-size: 8pt; color: #4b5563;">
        Следующий визит / осмотр назначен на: <strong>«___» _________ _____ г. в ____:____</strong>.${clinicPhone ? `<br/>Телефон клиники: <strong>${clinicPhone}</strong>.` : ""}
      </p>
    </div>

    <div class="signatures-grid">
      <div>
        <strong>Памятку получил(а), правила разъяснены:</strong><br>
        Пациент: <strong>${ptName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись пациента) • Дата: ${todayFormatted}</div>
      </div>
      <div>
        <strong>Памятку выдал:</strong><br>
        Врач: <strong>${docDoctorName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись врача)${clinicPhone ? ` • Телефон: ${clinicPhone}` : ""}</div>
      </div>
    </div>
  </div>`;
}
