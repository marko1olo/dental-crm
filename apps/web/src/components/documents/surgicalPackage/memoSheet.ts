import type { SurgicalRequisitesContext } from "./types";

export function renderSurgicalMemoSheet(ctx: SurgicalRequisitesContext): string {
	const {
		clinicName, clinicAddress, clinicPhone, ptName, opType, opTooth,
		docDoctorName, todayFormatted,
	} = ctx;

	return `  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong><br>
            Адрес: ${clinicAddress}${clinicPhone ? ` • Круглосуточный телефон клиники: <strong>${clinicPhone}</strong>` : ""}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Закон РФ № 2300-1</span><br>
            <span class="statutory-badge">Памятка пациента</span>
          </div>
        </div>
      </div>

      <h1>Памятка пациента после хирургического стоматологического вмешательства и дентальной имплантации</h1>
      <div class="sheet-subtitle">Правила режима и ухода для скорейшего заживления и предотвращения послеоперационных осложнений</div>

      <div class="parties-block">
        Уважаемый(ая) <strong>${ptName}</strong>!<br>
        Вам проведена хирургическая операция: <strong>${opType} в области ${opTooth}</strong>.<br>
        Лечащий хирург: <strong>${docDoctorName}</strong>. Дата операции: <strong>${todayFormatted}</strong>.
      </div>

      <div class="memo-box">
        <strong>Первые 24 часа после операции (важные правила):</strong>
        <ol style="margin: 3pt 0 2pt 12pt;">
          <li><strong>Марлевый тампон:</strong> сплюнуть через 15–20 минут после наложения в клинике.</li>
          <li><strong>Холод к щеке:</strong> прикладывать сухой холод на область операции снаружи на 15 минут с перерывами на 15 минут в первые 3–4 часа.</li>
          <li><strong>Не полоскать рот активно:</strong> интенсивное полоскание вымывает кровяной сгусток. Разрешены только спокойные ванночки со 2 дня.</li>
          <li><strong>Прием пищи:</strong> воздержитесь от еды до окончания действия анестезии (2–3 часа). Пища теплая, мягкая, жевать на противоположной стороне.</li>
          <li><strong>Ограничение тепла и нагрузок:</strong> исключить бани, сауны, горячие ванны, спорт на 5–7 дней.</li>
          <li><strong>Курение и алкоголь:</strong> воздержаться от курения минимум 3–5 дней. Исключить алкоголь на период приема антибиотиков.</li>
        </ol>
      </div>

      <div class="section-title">2. Уход и медикаментозные назначения</div>
      <ul>
        <li><strong>Антисептические ванночки:</strong> со 2-го дня — Хлоргексидин 0.05% или Мирамистин (подержать 30–60 сек и сплюнуть).</li>
        <li><strong>Обезболивание:</strong> при появлении боли принимать назначенный НПВС (Нимесил 100 мг, Нурофен 400 мг).</li>
        <li><strong>Антибиотики:</strong> принимать строго полный назначенный курс.</li>
        <li><strong>Гигиена:</strong> чистить зубы мягкой щеткой 2 раза в день, аккуратно обходя зону швов.</li>
      </ul>

      <div class="memo-alert">
        <strong>СРОЧНО СВЯЖИТЕСЬ С КЛИНИКОЙ, ЕСЛИ:</strong>
        <ul style="margin: 2pt 0 1pt 12pt;">
          <li>Непрекращающееся кровотечение из раны более 3–4 часов;</li>
          <li>Температура тела поднялась выше 38.0 °C на 2–3 сутки;</li>
          <li>Нарастающий отек и резкая боль спустя 3–4 дня;</li>
          <li>Онемение губы или языка сохраняется более 24 часов.</li>
        </ul>
      </div>

      <p style="font-size: 8pt; color: #4b5563;">
        Плановый осмотр и снятие швов назначены на: <strong>«___» _________ _____ г. в ____:____</strong>.${clinicPhone ? `<br/>Телефон регистратуры: <strong>${clinicPhone}</strong>.` : ""}
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
        <div class="sign-caption">(подпись врача)${clinicPhone ? ` • Телефон клиники: ${clinicPhone}` : ""}</div>
      </div>
    </div>
  </div>`;
}
